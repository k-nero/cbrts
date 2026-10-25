package com.equifreight.service;

import static com.equifreight.service.pricing.PricingText.money;

import com.equifreight.configuration.BusinessTime;
import com.equifreight.entity.Club;
import com.equifreight.entity.Quotation;
import com.equifreight.entity.TransportRequest;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.FeeBandKind;
import com.equifreight.entity.enums.NotificationKind;
import com.equifreight.entity.enums.QuotationStatus;
import com.equifreight.entity.enums.RequestStatus;
import com.equifreight.entity.enums.RoleName;
import com.equifreight.exception.ConflictException;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.model.quotation.AcceptRequest;
import com.equifreight.model.quotation.CustomerQuotationMapper;
import com.equifreight.model.quotation.CustomerQuotationResponse;
import com.equifreight.model.quotation.DeclineRequest;
import com.equifreight.model.quotation.RequoteRequest;
import com.equifreight.repository.QuotationRepository;
import com.equifreight.repository.RateFeeBandRepository;
import com.equifreight.repository.TransportRequestRepository;
import com.equifreight.service.notification.Audience;
import com.equifreight.service.notification.Subject;
import com.equifreight.service.quotation.QuotationSnapshot;
import com.equifreight.service.quotation.Snapshots;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The club's view of its quotation: the latest version that was issued (never a draft), as a document. It reads the
 * stored rows, the snapshot and the pinned catalog's cancellation bands, and never runs the engine. The club answers
 * it here too (US-F1-06): accepting binds that one version, declining closes the request.
 */
@Service
public class CustomerQuotationService {

    private final TransportRequestRepository requests;
    private final QuotationRepository quotations;
    private final RateFeeBandRepository feeBands;
    private final ClubService clubs;
    private final Snapshots snapshots;
    private final AuditService audit;
    private final NotificationService notifications;
    private final InvoiceService invoices;
    private final QuotationIssueService issues;
    private final Clock clock;

    public CustomerQuotationService(
            TransportRequestRepository requests,
            QuotationRepository quotations,
            RateFeeBandRepository feeBands,
            ClubService clubs,
            Snapshots snapshots,
            AuditService audit,
            NotificationService notifications,
            InvoiceService invoices,
            QuotationIssueService issues,
            Clock clock) {
        this.requests = requests;
        this.quotations = quotations;
        this.feeBands = feeBands;
        this.clubs = clubs;
        this.snapshots = snapshots;
        this.audit = audit;
        this.notifications = notifications;
        this.invoices = invoices;
        this.issues = issues;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public CustomerQuotationResponse get(User customer, UUID requestId) {
        Club club = clubs.requireClub(customer);
        TransportRequest request = requests.findByIdAndClubId(requestId, club.getId())
                .orElseThrow(() -> ResourceNotFoundException.of("Request", requestId));
        return toResponse(request, latestIssued(requestId));
    }

    public CustomerQuotationResponse accept(User customer, UUID requestId) {
        return accept(customer, requestId, null);
    }

    /**
     * Accepts the version the club sees (US-F1-06): only while it is the open answer and before it expires. That
     * version becomes ACCEPTED, binding its price and lines, and the request CUSTOMER_ACCEPTED for the logistics
     * manager's approval. The request row is locked first, so a double click or a manager issuing the next version at
     * the same moment is refused rather than accepted twice; a {@code versionNo} the customer read that is no longer
     * the latest is refused too, so the customer never accepts a price they didn't see (US-Q-07).
     */
    @Transactional
    public CustomerQuotationResponse accept(User customer, UUID requestId, AcceptRequest body) {
        Club club = clubs.requireClub(customer);
        TransportRequest request = requests.findForUpdate(requestId, club.getId())
                .orElseThrow(() -> ResourceNotFoundException.of("Request", requestId));
        Quotation q = latestIssued(requestId);
        requireShown(body == null ? null : body.versionNo(), q);
        Instant now = clock.instant();
        requireOpen(request, q, now);

        q.setStatus(QuotationStatus.ACCEPTED);
        q.setAcceptedAt(now);
        q.setAcceptedBy(customer);
        RequestStatus before = request.getStatus();
        request.setStatus(RequestStatus.CUSTOMER_ACCEPTED);
        requests.save(request);
        Quotation saved = quotations.saveAndFlush(q);
        // The deposit invoice comes with the acceptance (US-F6-03): the quotation's deposit % of its total.
        invoices.issueDeposit(saved, customer);

        String label = label(q);
        audit.recordDecision(
                customer,
                "QUOTATION_ACCEPTED",
                AuditText.fit(label + " accepted: " + money(q.getTotal()) + ", deposit " + money(q.getDepositAmount())),
                QuotationDraftService.ENTITY_TYPE,
                request.getId(),
                request.getCode(),
                null,
                "{\"status\":\"" + before + "\"}",
                "{\"status\":\"" + RequestStatus.CUSTOMER_ACCEPTED + "\"}");
        tellManagers(
                q,
                request,
                NotificationKind.QUOTATION_ACCEPTED,
                club.getName() + " accepted " + label,
                request.getCode() + " is waiting for your approval. " + label + ", " + money(q.getTotal()) + ".");
        return toResponse(request, saved);
    }

    /**
     * Declines the version the club sees: it becomes DECLINED with the reason, if any, and the request ends EXPIRED
     * (spec §2.3, step 10). Declining is refused on the same grounds as accepting.
     */
    @Transactional
    public CustomerQuotationResponse decline(User customer, UUID requestId, DeclineRequest body) {
        Club club = clubs.requireClub(customer);
        TransportRequest request = requests.findForUpdate(requestId, club.getId())
                .orElseThrow(() -> ResourceNotFoundException.of("Request", requestId));
        Quotation q = latestIssued(requestId);
        requireShown(body == null ? null : body.versionNo(), q);
        Instant now = clock.instant();
        requireOpen(request, q, now);
        String reason = body == null || body.reason() == null || body.reason().isBlank()
                ? null
                : body.reason().strip();

        q.setStatus(QuotationStatus.DECLINED);
        q.setDeclinedAt(now);
        q.setDeclineReason(reason);
        RequestStatus before = request.getStatus();
        request.setStatus(RequestStatus.EXPIRED);
        requests.save(request);
        Quotation saved = quotations.saveAndFlush(q);

        String label = label(q);
        audit.recordDecision(
                customer,
                "QUOTATION_DECLINED",
                AuditText.fit(label + " declined" + (reason == null ? "" : ": " + reason)),
                QuotationDraftService.ENTITY_TYPE,
                request.getId(),
                request.getCode(),
                reason,
                "{\"status\":\"" + before + "\"}",
                "{\"status\":\"" + RequestStatus.EXPIRED + "\"}");
        tellManagers(
                q,
                request,
                NotificationKind.QUOTATION_DECLINED,
                club.getName() + " declined " + label,
                reason == null ? request.getCode() + " is closed. No reason was given." : "\u201c" + reason + "\u201d");
        return toResponse(request, saved);
    }

    /**
     * Asks for a re-quote of an expired quotation (core flows A4): the next version is drafted on the rate catalog in
     * force now, carrying the class, overrides and added lines, for the manager who prepared the expired one, who is
     * told and reviews it before issuing. The customer never sees the draft, and the request stays EXPIRED until it is
     * issued. The request row is locked first, so a double click drafts one version and refuses the second ask.
     */
    @Transactional
    public CustomerQuotationResponse requote(User customer, UUID requestId, RequoteRequest body) {
        Club club = clubs.requireClub(customer);
        TransportRequest request = requests.findForUpdate(requestId, club.getId())
                .orElseThrow(() -> ResourceNotFoundException.of("Request", requestId));
        Quotation latest = latestIssued(requestId);
        requireShown(body == null ? null : body.versionNo(), latest);
        requireRequotable(request, latest);
        String note = body == null || body.note() == null || body.note().isBlank()
                ? null
                : body.note().strip();

        QuotationIssueService.Drafted d = issues.draftNext(latest, request, latest.getPreparedBy());
        Quotation draft = d.draft();
        int catalog = d.catalog().getVersionNo();
        StringBuilder summary = new StringBuilder(club.getName() + " asked for a re-quote of " + latest.getCode() + " v"
                + latest.getVersionNo() + "; v" + draft.getVersionNo() + " drafted on rate catalog v" + catalog);
        QuotationIssueService.appendDropped(summary, d.dropped());
        // The request's status doesn't move, so there is no before or after (and #192's history leaves it out).
        audit.recordDecision(
                customer,
                "QUOTATION_REQUOTE_ASKED",
                AuditText.fit(summary.toString()),
                QuotationDraftService.ENTITY_TYPE,
                request.getId(),
                request.getCode(),
                note,
                null,
                null);
        tellManagers(
                latest,
                request,
                NotificationKind.QUOTATION_REQUOTE_ASKED,
                club.getName() + " asked for a re-quote of " + latest.getCode(),
                note == null
                        ? request.getCode() + " · version " + draft.getVersionNo() + " is drafted on rate catalog v"
                                + catalog + ". Review it and issue it."
                        : "“" + note + "”");
        return toResponse(request, latest);
    }

    /**
     * A re-quote is for an elapsed window only (spec §4.3), refused in this order: a version already being prepared,
     * a quotation the customer already answered (a decline is final), a cancelled request, a quotation still open, and
     * a departure that has come (counted in Vietnam time).
     */
    private void requireRequotable(TransportRequest request, Quotation latest) {
        Quotation newest = quotations
                .findFirstByRequestIdOrderByVersionNoDesc(request.getId())
                .orElse(latest);
        if (newest.getStatus() == QuotationStatus.DRAFT) {
            throw new ConflictException(
                    "REQUOTE_IN_PROGRESS", "Version " + newest.getVersionNo() + " is already being prepared.");
        }
        String v = "version " + latest.getVersionNo();
        switch (latest.getStatus()) {
            case ACCEPTED ->
                throw new ConflictException(
                        "QUOTATION_ANSWERED", "You accepted " + v + " on " + day(latest.getAcceptedAt()) + ".");
            case DECLINED ->
                throw new ConflictException(
                        "QUOTATION_ANSWERED", "You declined " + v + " on " + day(latest.getDeclinedAt()) + ".");
            default -> {}
        }
        if (request.getStatus() == RequestStatus.CANCELLED) {
            throw new ConflictException(
                    "REQUEST_CANCELLED", request.getCode() + " was cancelled, so its quotation can't be answered.");
        }
        if (latest.getStatus() != QuotationStatus.EXPIRED || request.getStatus() != RequestStatus.EXPIRED) {
            throw new ConflictException(
                    "QUOTATION_NOT_EXPIRED",
                    "Version " + latest.getVersionNo() + " hasn't expired. You can still accept or decline it.");
        }
        LocalDate departure = request.getDepartureDate();
        if (departure != null && !departure.isAfter(LocalDate.now(clock.withZone(BusinessTime.ZONE)))) {
            throw new ConflictException(
                    "DEPARTURE_PASSED",
                    "The departure on " + BusinessTime.DAY.format(departure)
                            + " has passed. Start a new request for a later date.");
        }
    }

    private Quotation latestIssued(UUID requestId) {
        return quotations
                .findFirstByRequestIdAndStatusNotOrderByVersionNoDesc(requestId, QuotationStatus.DRAFT)
                .orElseThrow(() -> new ResourceNotFoundException("Quotation for request not issued: " + requestId));
    }

    /**
     * The answer names the version the customer read (requote spec §4.2): a newer one issued since is refused before
     * anything else is checked, so the customer reads it first. {@code versionNo} null skips the check.
     */
    private static void requireShown(Integer versionNo, Quotation latest) {
        if (versionNo != null && versionNo != latest.getVersionNo()) {
            throw new ConflictException(
                    "QUOTATION_VERSION_CHANGED",
                    "Version " + versionNo + " was replaced by version " + latest.getVersionNo()
                            + ". Read it before you answer.");
        }
    }

    /**
     * The version is the club's to answer: issued, not past its last valid day (BR-F1-03, checked here rather than left
     * to the hourly expiry job), and the request still quoted. Each refusal says where the quotation stands.
     */
    private static void requireOpen(TransportRequest request, Quotation q, Instant now) {
        String v = "Version " + q.getVersionNo();
        switch (q.getStatus()) {
            case ACCEPTED ->
                throw new ConflictException(
                        "QUOTATION_ANSWERED",
                        "You accepted " + v.toLowerCase() + " on " + day(q.getAcceptedAt()) + ".");
            case DECLINED ->
                throw new ConflictException(
                        "QUOTATION_ANSWERED",
                        "You declined " + v.toLowerCase() + " on " + day(q.getDeclinedAt()) + ".");
            case EXPIRED -> throw expired(q);
            default -> {}
        }
        if (request.getStatus() == RequestStatus.CANCELLED) {
            throw new ConflictException(
                    "REQUEST_CANCELLED", request.getCode() + " was cancelled, so its quotation can't be answered.");
        }
        if (q.getStatus() != QuotationStatus.ISSUED || request.getStatus() != RequestStatus.QUOTED) {
            throw new ConflictException("QUOTATION_NOT_OPEN", v + " can't be answered in its current state.");
        }
        if (now.isAfter(q.getValidUntil())) {
            throw expired(q);
        }
    }

    private static ConflictException expired(Quotation q) {
        return new ConflictException(
                "QUOTATION_EXPIRED",
                "Version " + q.getVersionNo() + " expired on " + day(q.getValidUntil())
                        + ", so it can't be answered. Ask the logistics manager to re-price it.");
    }

    /** The manager who prepared it, or every active logistics manager when nobody is named. */
    private void tellManagers(Quotation q, TransportRequest request, NotificationKind kind, String title, String body) {
        Audience to = q.getPreparedBy() != null
                ? Audience.staff(q.getPreparedBy())
                : Audience.role(RoleName.LOGISTICS_MANAGER);
        notifications.notify(kind, to, Subject.request(request), title, body);
    }

    private static String label(Quotation q) {
        return "Quotation " + q.getCode() + " v" + q.getVersionNo();
    }

    private static String day(Instant instant) {
        return instant == null ? "an earlier date" : BusinessTime.DAY.format(instant.atZone(BusinessTime.ZONE));
    }

    private CustomerQuotationResponse toResponse(TransportRequest request, Quotation q) {
        QuotationSnapshot snapshot = snapshots.of(q, request);
        LocalDate today = LocalDate.now(clock.withZone(BusinessTime.ZONE));
        LocalDate departure = snapshot.request().departureDate();
        long days = departure == null ? 0 : ChronoUnit.DAYS.between(today, departure);
        return CustomerQuotationMapper.toResponse(
                q,
                request,
                snapshot,
                feeBands.findByVersionIdAndKindOrderByMinDays(
                        q.getRateCatalogVersion().getId(), FeeBandKind.CANCELLATION),
                days,
                quotations.findByRequestIdOrderByVersionNoDesc(request.getId()));
    }
}
