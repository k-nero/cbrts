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
import com.equifreight.model.quotation.CustomerQuotationMapper;
import com.equifreight.model.quotation.CustomerQuotationResponse;
import com.equifreight.model.quotation.DeclineRequest;
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
    private final Clock clock;

    public CustomerQuotationService(
            TransportRequestRepository requests,
            QuotationRepository quotations,
            RateFeeBandRepository feeBands,
            ClubService clubs,
            Snapshots snapshots,
            AuditService audit,
            NotificationService notifications,
            Clock clock) {
        this.requests = requests;
        this.quotations = quotations;
        this.feeBands = feeBands;
        this.clubs = clubs;
        this.snapshots = snapshots;
        this.audit = audit;
        this.notifications = notifications;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public CustomerQuotationResponse get(User customer, UUID requestId) {
        Club club = clubs.requireClub(customer);
        TransportRequest request = requests.findByIdAndClubId(requestId, club.getId())
                .orElseThrow(() -> ResourceNotFoundException.of("Request", requestId));
        return toResponse(request, latestIssued(requestId));
    }

    /**
     * Accepts the version the club sees (US-F1-06): only while it is the open answer and before it expires. That
     * version becomes ACCEPTED, binding its price and lines, and the request CUSTOMER_ACCEPTED for the logistics
     * manager's approval. The request row is locked first, so a double click or a manager issuing the next version at
     * the same moment is refused rather than accepted twice.
     */
    @Transactional
    public CustomerQuotationResponse accept(User customer, UUID requestId) {
        Club club = clubs.requireClub(customer);
        TransportRequest request = requests.findForUpdate(requestId, club.getId())
                .orElseThrow(() -> ResourceNotFoundException.of("Request", requestId));
        Quotation q = latestIssued(requestId);
        Instant now = clock.instant();
        requireOpen(request, q, now);

        q.setStatus(QuotationStatus.ACCEPTED);
        q.setAcceptedAt(now);
        q.setAcceptedBy(customer);
        RequestStatus before = request.getStatus();
        request.setStatus(RequestStatus.CUSTOMER_ACCEPTED);
        requests.save(request);
        Quotation saved = quotations.saveAndFlush(q);

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

    private Quotation latestIssued(UUID requestId) {
        return quotations
                .findFirstByRequestIdAndStatusNotOrderByVersionNoDesc(requestId, QuotationStatus.DRAFT)
                .orElseThrow(() -> new ResourceNotFoundException("Quotation for request not issued: " + requestId));
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
