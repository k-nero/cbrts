package com.equifreight.service;

import static com.equifreight.service.pricing.PricingText.money;

import com.equifreight.configuration.BusinessTime;
import com.equifreight.entity.Quotation;
import com.equifreight.entity.QuotationLine;
import com.equifreight.entity.RateCatalogVersion;
import com.equifreight.entity.TransportRequest;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.CatalogStatus;
import com.equifreight.entity.enums.QuotationStatus;
import com.equifreight.entity.enums.RatePolicyKey;
import com.equifreight.entity.enums.RequestStatus;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ConflictException;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.model.quotation.IssueRequest;
import com.equifreight.model.quotation.QuotationDraftResponse;
import com.equifreight.model.quotation.QuotationMapper;
import com.equifreight.model.quotation.StartResult;
import com.equifreight.repository.QuotationRepository;
import com.equifreight.repository.RateCatalogVersionRepository;
import com.equifreight.repository.TransportRequestRepository;
import com.equifreight.repository.UserRepository;
import com.equifreight.service.pricing.QuotePricer;
import com.equifreight.service.quotation.Snapshots;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Issuing a quotation version as a document (US-F1-05, US-Q-04, US-Q-08): refused while anything blocks it, then
 * frozen with its validity, deposit and snapshot. The request becomes QUOTED and the club is told. Revising it into
 * the next version lives here too (US-Q-07).
 */
@Service
public class QuotationIssueService {

    private static final Set<RequestStatus> REVISABLE_REQUEST = Set.of(RequestStatus.QUOTED, RequestStatus.EXPIRED);
    private static final Set<QuotationStatus> REVISABLE = Set.of(QuotationStatus.ISSUED, QuotationStatus.EXPIRED);

    private final TransportRequestRepository requests;
    private final QuotationRepository quotations;
    private final RateCatalogVersionRepository versions;
    private final QuotationPricing pricing;
    private final UserRepository users;
    private final NotificationService notifications;
    private final AuditService audit;
    private final Snapshots snapshots;
    private final Clock clock;

    public QuotationIssueService(
            TransportRequestRepository requests,
            QuotationRepository quotations,
            RateCatalogVersionRepository versions,
            QuotationPricing pricing,
            UserRepository users,
            NotificationService notifications,
            AuditService audit,
            Snapshots snapshots,
            Clock clock) {
        this.requests = requests;
        this.quotations = quotations;
        this.versions = versions;
        this.pricing = pricing;
        this.users = users;
        this.notifications = notifications;
        this.audit = audit;
        this.snapshots = snapshots;
        this.clock = clock;
    }

    /**
     * Issues the draft. Everything is checked before anything is written; the request row is locked first, so a
     * second issue (another manager, a double click) finds the version issued and is refused.
     */
    @Transactional
    public QuotationDraftResponse issue(User manager, UUID requestId, IssueRequest body) {
        TransportRequest request = requests.findByIdForUpdate(requestId)
                .orElseThrow(() -> ResourceNotFoundException.of("Request", requestId));
        Quotation q = quotations
                .findFirstByRequestIdOrderByVersionNoDesc(requestId)
                .orElseThrow(() -> ResourceNotFoundException.of("Quotation for request", requestId));
        QuotationRules.requireWritable(request, q);
        QuotationPricing.Evaluation e = pricing.evaluate(q, request);
        if (!e.blockers().isEmpty()) {
            throw new ConflictException("QUOTATION_NOT_READY", "This quotation isn't ready to issue.", e.blockers());
        }
        String note =
                body == null || body.changeNote() == null || body.changeNote().isBlank()
                        ? null
                        : body.changeNote().strip();
        if (q.getVersionNo() > 1 && note == null) {
            throw new BusinessException(
                    "CHANGE_NOTE", "Say what changed since version " + (q.getVersionNo() - 1) + ".");
        }

        Map<RatePolicyKey, BigDecimal> policies = e.rates().policies();
        Instant now = clock.instant();
        LocalDate issueDay = LocalDate.ofInstant(now, BusinessTime.ZONE);
        int validity = policies.get(RatePolicyKey.QUOTE_VALIDITY_DAYS).intValue();
        Instant validUntil = issueDay.plusDays(validity)
                .atTime(LocalTime.MAX)
                .atZone(BusinessTime.ZONE)
                .toInstant()
                .truncatedTo(ChronoUnit.MILLIS);
        BigDecimal depositPct = policies.get(RatePolicyKey.DEPOSIT_PCT);

        q.setStatus(QuotationStatus.ISSUED);
        q.setIssuedAt(now);
        q.setValidUntil(validUntil);
        q.setDepositPct(depositPct);
        q.setDepositAmount(q.getTotal()
                .multiply(depositPct)
                .divide(BigDecimal.valueOf(100))
                .setScale(2, RoundingMode.HALF_UP));
        boolean window = QuotePricer.windowApplies(e.input());
        q.setLatePenaltyPctPerHour(window ? policies.get(RatePolicyKey.LATE_PENALTY_PCT_PER_HOUR) : null);
        q.setLatePenaltyCapPct(window ? policies.get(RatePolicyKey.LATE_PENALTY_CAP_PCT) : null);
        q.setIssuedSnapshot(snapshots.write(Snapshots.of(request, e.input(), e.rates(), e.now(), e.expected())));

        Quotation superseded = quotations.findByRequestIdOrderByVersionNoDesc(requestId).stream()
                .filter(v -> v.getVersionNo() < q.getVersionNo() && v.getStatus() == QuotationStatus.ISSUED)
                .findFirst()
                .orElse(null);
        if (superseded != null) {
            superseded.setStatus(QuotationStatus.SUPERSEDED);
            superseded.setSupersededReason(note);
            quotations.save(superseded);
        }
        RequestStatus before = request.getStatus();
        request.setStatus(RequestStatus.QUOTED);
        requests.save(request);
        Quotation saved = quotations.saveAndFlush(q);

        String until = BusinessTime.DAY.format(validUntil.atZone(BusinessTime.ZONE));
        String label = "Quotation " + q.getCode() + " v" + q.getVersionNo();
        audit.recordDecision(
                manager,
                "QUOTATION_ISSUED",
                AuditText.fit(label + " issued: " + money(q.getTotal()) + ", valid until " + until
                        + (superseded == null ? "" : "; supersedes v" + superseded.getVersionNo())),
                QuotationDraftService.ENTITY_TYPE,
                request.getId(),
                request.getCode(),
                note,
                "{\"status\":\"" + before + "\"}",
                "{\"status\":\"" + RequestStatus.QUOTED + "\"}");
        for (User account : users.findByClubId(request.getClub().getId())) {
            notifications.sendNotification(
                    account,
                    "QUOTATION_ISSUED",
                    "Your quotation for " + request.getCode() + " is ready",
                    label + ", " + money(q.getTotal()) + ". It holds its price until " + until + ".",
                    QuotationDraftService.ENTITY_TYPE,
                    request.getId());
        }
        return pricing.toResponse(saved, request, List.of());
    }

    /**
     * Drafts the next version from the latest issued or expired one (US-Q-07): its class, overrides and added lines
     * are carried onto the latest published catalog. The issued version stays live for the customer until the new
     * one is issued, so the request's status doesn't change.
     */
    @Transactional
    public StartResult revise(User manager, UUID requestId) {
        TransportRequest request = requests.findByIdForUpdate(requestId)
                .orElseThrow(() -> ResourceNotFoundException.of("Request", requestId));
        Quotation latest = quotations
                .findFirstByRequestIdOrderByVersionNoDesc(requestId)
                .orElseThrow(
                        () -> new ConflictException("NOTHING_TO_REVISE", "There is no issued quotation to revise."));
        if (latest.getStatus() == QuotationStatus.DRAFT) {
            throw new ConflictException(
                    "DRAFT_EXISTS", "Version " + latest.getVersionNo() + " is already being drafted.");
        }
        if (!REVISABLE_REQUEST.contains(request.getStatus())) {
            throw new ConflictException("REQUEST_NOT_QUOTABLE", "This request can't be quoted in its current state.");
        }
        if (!REVISABLE.contains(latest.getStatus())) {
            throw new ConflictException("NOTHING_TO_REVISE", "There is no issued quotation to revise.");
        }
        RateCatalogVersion published = versions.findFirstByStatusOrderByVersionNoDesc(CatalogStatus.PUBLISHED)
                .orElseThrow(() -> new ConflictException("NO_PUBLISHED_CATALOG", "No rate catalog is published yet."));

        Quotation q = new Quotation();
        q.setCode(latest.getCode());
        q.setRequest(request);
        q.setVersionNo((short) (latest.getVersionNo() + 1));
        q.setStatus(QuotationStatus.DRAFT);
        q.setRateCatalogVersion(published);
        q.setCurrency(latest.getCurrency());
        q.setPreparedBy(manager);
        q.setAirClass(latest.getAirClass());
        for (QuotationLine line : latest.getLines()) {
            q.getLines().add(adjustmentOf(line, q));
        }
        List<String> dropped = pricing.price(q, request);
        try {
            q = quotations.saveAndFlush(q);
        } catch (DataIntegrityViolationException ex) {
            throw new ConflictException(
                    "DRAFT_EXISTS", "Someone else just started the next version. Reload the page to see it.");
        }
        StringBuilder summary = new StringBuilder("Quotation " + q.getCode() + " v" + q.getVersionNo()
                + " drafted from v" + latest.getVersionNo() + " on rate catalog v" + published.getVersionNo());
        for (String gone : dropped) {
            summary.append("; override on ").append(gone, 0, gone.indexOf(':')).append(" dropped");
        }
        audit.recordDecision(
                manager,
                "QUOTATION_REVISED",
                AuditText.fit(summary.toString()),
                QuotationDraftService.ENTITY_TYPE,
                request.getId(),
                request.getCode(),
                null,
                null,
                null);
        return new StartResult(pricing.toResponse(q, request, dropped), true);
    }

    /** Discards a revision's draft; the version it was drafted from stands. The first version is never discarded. */
    @Transactional
    public void discardDraft(User manager, UUID requestId) {
        TransportRequest request = requests.findByIdForUpdate(requestId)
                .orElseThrow(() -> ResourceNotFoundException.of("Request", requestId));
        Quotation q = quotations
                .findFirstByRequestIdOrderByVersionNoDesc(requestId)
                .orElseThrow(() -> ResourceNotFoundException.of("Quotation for request", requestId));
        QuotationRules.requireDraft(q);
        if (q.getVersionNo() == 1) {
            throw new ConflictException("FIRST_VERSION", "The first version can't be discarded.");
        }
        quotations.delete(q);
        audit.recordDecision(
                manager,
                "QUOTATION_DRAFT_DISCARDED",
                AuditText.fit("Quotation " + q.getCode() + " v" + q.getVersionNo() + " draft discarded; v"
                        + (q.getVersionNo() - 1) + " stands"),
                QuotationDraftService.ENTITY_TYPE,
                request.getId(),
                request.getCode(),
                null,
                null,
                null);
    }

    /** A line of the version being revised, as the new draft's starting point: its key and the manager's changes. */
    private static QuotationLine adjustmentOf(QuotationLine from, Quotation to) {
        QuotationLine line = new QuotationLine();
        line.setQuotation(to);
        line.setGroupCode(from.getGroupCode());
        line.setPosition(from.getPosition());
        line.setLineKey(QuotationMapper.keyOf(from));
        line.setDescription(from.getDescription());
        line.setBasisText(from.getBasisText());
        line.setBasis(from.getBasis());
        line.setQuantity(from.getQuantity());
        line.setUnitRate(from.getUnitRate());
        line.setSource(from.getSource());
        line.setCertainty(from.getCertainty());
        line.setEstimateNote(from.getEstimateNote());
        line.setCatalogAmount(from.getCatalogAmount());
        line.setOverrideAmount(from.getOverrideAmount());
        line.setOverrideReason(from.getOverrideReason());
        line.setManualReason(from.getManualReason());
        return line;
    }
}
