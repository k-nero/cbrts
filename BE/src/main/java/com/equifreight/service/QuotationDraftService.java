package com.equifreight.service;

import static com.equifreight.service.pricing.PricingText.money;

import com.equifreight.entity.Quotation;
import com.equifreight.entity.QuotationLine;
import com.equifreight.entity.RateCatalogVersion;
import com.equifreight.entity.TransportRequest;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.CatalogStatus;
import com.equifreight.entity.enums.CodePrefix;
import com.equifreight.entity.enums.LineCertainty;
import com.equifreight.entity.enums.LineSource;
import com.equifreight.entity.enums.QuotationStatus;
import com.equifreight.entity.enums.RateBasis;
import com.equifreight.entity.enums.RateCertainty;
import com.equifreight.entity.enums.RequestStatus;
import com.equifreight.entity.enums.ServiceClass;
import com.equifreight.entity.enums.TransportMode;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ConflictException;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.model.quotation.ManualLineRequest;
import com.equifreight.model.quotation.OverrideRequest;
import com.equifreight.model.quotation.QuotationDraftResponse;
import com.equifreight.model.quotation.StartResult;
import com.equifreight.repository.QuotationRepository;
import com.equifreight.repository.RateCatalogVersionRepository;
import com.equifreight.repository.TransportRequestRepository;
import com.equifreight.service.pricing.PricingText;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The logistics manager's draft quotation (US-Q-01, US-Q-03, US-Q-09): started from a request in review, priced from
 * the published rate catalog it pins, and re-priced on another class or a newer catalog until it is issued (next
 * slice). Starting accepts the request for quotation, so a SUBMITTED request moves to UNDER_REVIEW.
 */
@Service
public class QuotationDraftService {

    static final String ENTITY_TYPE = "TRANSPORT_REQUEST";
    private static final Set<RequestStatus> IN_REVIEW = Set.of(RequestStatus.SUBMITTED, RequestStatus.UNDER_REVIEW);
    private static final String CURRENCY = "USD";

    private final TransportRequestRepository requests;
    private final QuotationRepository quotations;
    private final RateCatalogVersionRepository versions;
    private final QuotationPricing pricing;
    private final CodeService codes;
    private final AuditService audit;
    private final Clock clock;

    public QuotationDraftService(
            TransportRequestRepository requests,
            QuotationRepository quotations,
            RateCatalogVersionRepository versions,
            QuotationPricing pricing,
            CodeService codes,
            AuditService audit,
            Clock clock) {
        this.requests = requests;
        this.quotations = quotations;
        this.versions = versions;
        this.pricing = pricing;
        this.codes = codes;
        this.audit = audit;
        this.clock = clock;
    }

    /**
     * Starts the draft, or returns the one already started. The request row is locked first, so two managers
     * starting at once are served one after the other and the second finds the first's draft.
     */
    @Transactional
    public StartResult start(User manager, UUID requestId) {
        TransportRequest request = requests.findByIdForUpdate(requestId)
                .orElseThrow(() -> ResourceNotFoundException.of("Request", requestId));
        requireInReview(request);
        Optional<Quotation> existing = quotations.findFirstByRequestIdOrderByVersionNoDesc(requestId);
        if (existing.isPresent()) {
            Quotation q = existing.get();
            QuotationRules.requireDraft(q);
            if (request.getStatus() == RequestStatus.SUBMITTED) {
                underReview(manager, request, "Quotation " + q.getCode() + " v" + q.getVersionNo() + " resumed");
            }
            return new StartResult(pricing.toResponse(q, request, List.of()), false);
        }
        RateCatalogVersion published = latestPublished();

        Quotation q = new Quotation();
        q.setCode(codes.next(CodePrefix.Q, LocalDate.now(clock).getYear()));
        q.setRequest(request);
        q.setVersionNo((short) 1);
        q.setStatus(QuotationStatus.DRAFT);
        q.setRateCatalogVersion(published);
        q.setCurrency(CURRENCY);
        q.setPreparedBy(manager);
        q.setAirClass(request.getMode() == TransportMode.AIR ? request.getAirClass() : null);
        pricing.price(q, request);
        try {
            q = quotations.saveAndFlush(q);
        } catch (DataIntegrityViolationException e) {
            throw new ConflictException(
                    "QUOTATION_ALREADY_STARTED",
                    "Someone else just started this quotation. Reload the page to see it.");
        }

        RequestStatus before = request.getStatus();
        String summary = "Quotation " + q.getCode() + " v1 started on rate catalog v" + published.getVersionNo();
        if (before == RequestStatus.SUBMITTED) {
            request.setStatus(RequestStatus.UNDER_REVIEW);
            requests.save(request);
            summary += "; the request is under review";
        }
        audit.recordDecision(
                manager,
                "QUOTATION_STARTED",
                AuditText.fit(summary),
                ENTITY_TYPE,
                request.getId(),
                request.getCode(),
                null,
                "{\"status\":\"" + before + "\"}",
                "{\"status\":\"" + request.getStatus() + "\"}");
        return new StartResult(pricing.toResponse(q, request, List.of()), true);
    }

    @Transactional(readOnly = true)
    public QuotationDraftResponse get(UUID requestId) {
        return get(requestId, null);
    }

    /** One version of the request's quotation, or the latest when {@code version} is null. */
    @Transactional(readOnly = true)
    public QuotationDraftResponse get(UUID requestId, Short version) {
        TransportRequest request =
                requests.findById(requestId).orElseThrow(() -> ResourceNotFoundException.of("Request", requestId));
        Quotation q = (version == null
                        ? quotations.findFirstByRequestIdOrderByVersionNoDesc(requestId)
                        : quotations.findByRequestIdAndVersionNo(requestId, version))
                .orElseThrow(() -> ResourceNotFoundException.of("Quotation for request", requestId));
        return pricing.toResponse(q, request, List.of());
    }

    public QuotationDraftResponse changeClass(User manager, UUID requestId, ServiceClass airClass) {
        return changeClass(manager, requestId, airClass, null);
    }

    /** Prices the draft with another air class, on the version it already pins. */
    @Transactional
    public QuotationDraftResponse changeClass(User manager, UUID requestId, ServiceClass airClass, Integer version) {
        Draft d = draftForWrite(requestId, version);
        TransportRequest request = d.request();
        Quotation q = d.quotation();
        if (request.getMode() != TransportMode.AIR) {
            throw new BusinessException("NOT_AN_AIR_REQUEST", "Only an air move has a service class.");
        }
        ServiceClass was = QuotationPricing.pricedClass(q, request);
        q.setAirClass(airClass);
        List<String> dropped = pricing.price(q, request);
        Quotation saved = quotations.save(q);
        if (airClass != was) {
            StringBuilder summary = new StringBuilder("Quotation " + label(q) + " priced in "
                    + PricingText.classWord(airClass) + " class instead of " + PricingText.classWord(was));
            QuotationIssueService.appendDropped(summary, dropped);
            audit.recordDecision(
                    manager,
                    "QUOTATION_CLASS_CHANGED",
                    AuditText.fit(summary.toString()),
                    ENTITY_TYPE,
                    request.getId(),
                    request.getCode(),
                    null,
                    null,
                    null);
        }
        return pricing.toResponse(saved, request, dropped);
    }

    public QuotationDraftResponse reprice(User manager, UUID requestId) {
        return reprice(manager, requestId, null);
    }

    /** Pins the latest published catalog and prices the draft again from the request as it is now. */
    @Transactional
    public QuotationDraftResponse reprice(User manager, UUID requestId, Integer version) {
        Draft d = draftForWrite(requestId, version);
        TransportRequest request = d.request();
        Quotation q = d.quotation();
        RateCatalogVersion published = latestPublished();
        q.setRateCatalogVersion(published);
        List<String> dropped = pricing.price(q, request);
        Quotation saved = quotations.save(q);
        String summary = "Quotation " + q.getCode() + " v" + q.getVersionNo() + " re-priced on rate catalog v"
                + published.getVersionNo();
        for (String gone : dropped) {
            summary += "; override on " + gone.substring(0, gone.indexOf(':')) + " dropped";
        }
        audit.recordDecision(
                manager,
                "QUOTATION_REPRICED",
                AuditText.fit(summary),
                ENTITY_TYPE,
                request.getId(),
                request.getCode(),
                null,
                null,
                null);
        return pricing.toResponse(saved, request, dropped);
    }

    // --- overrides and added lines (US-Q-02, US-F1-05) ---------------------------------------------------------

    /** Replaces a priced line's amount, with the manager's reason. The totals are worked out again. */
    @Transactional
    public QuotationDraftResponse override(User manager, UUID requestId, UUID lineId, OverrideRequest body) {
        Draft d = draftForWrite(requestId);
        QuotationLine line = lineOf(d.quotation(), lineId);
        if (line.getCatalogAmount() == null) {
            throw new ConflictException(
                    "NO_RATE_TO_OVERRIDE",
                    "A line without a rate can't be overridden. Ask " + ownerName()
                            + " to add the rate, then re-price.");
        }
        if (line.getManualReason() != null) {
            throw new ConflictException("NOT_A_CATALOG_LINE", "Edit a line you added instead of overriding it.");
        }
        BigDecimal amount = cents(body.amount());
        String reason = body.reason().strip();
        BigDecimal was = line.getOverrideAmount() != null ? line.getOverrideAmount() : line.getCatalogAmount();
        line.setOverrideAmount(amount);
        line.setOverrideReason(reason);
        String summary = label(d.quotation()) + " · " + line.getDescription() + ": " + money(was) + " → "
                + money(amount) + " · " + reason;
        return saved(manager, d, "QUOTATION_LINE_OVERRIDDEN", summary, reason);
    }

    /** Puts the catalog amount back. */
    @Transactional
    public QuotationDraftResponse removeOverride(User manager, UUID requestId, UUID lineId) {
        Draft d = draftForWrite(requestId);
        QuotationLine line = lineOf(d.quotation(), lineId);
        if (line.getOverrideAmount() == null) {
            throw new ConflictException("NOT_OVERRIDDEN", "This line has no override to remove.");
        }
        String summary = label(d.quotation()) + " · " + line.getDescription() + ": back to "
                + money(line.getCatalogAmount()) + " from " + money(line.getOverrideAmount());
        line.setOverrideAmount(null);
        line.setOverrideReason(null);
        return saved(manager, d, "QUOTATION_OVERRIDE_REMOVED", summary, null);
    }

    public QuotationDraftResponse addLine(User manager, UUID requestId, ManualLineRequest body) {
        return addLine(manager, requestId, body, null);
    }

    /** Adds a line the catalog doesn't know, at the end of its group. */
    @Transactional
    public QuotationDraftResponse addLine(User manager, UUID requestId, ManualLineRequest body, Integer version) {
        Draft d = draftForWrite(requestId, version);
        checkNote(body);
        Quotation q = d.quotation();
        QuotationLine line = new QuotationLine();
        line.setQuotation(q);
        line.setLineKey("MANUAL:" + UUID.randomUUID());
        line.setSource(LineSource.MANUAL);
        line.setBasis(RateBasis.PER_SHIPMENT);
        line.setBasisText(AuditText.fit("added by " + manager.displayName()));
        line.setPosition(nextPosition(q, body.group()));
        fill(line, body);
        q.getLines().add(line);
        String reason = line.getManualReason();
        return saved(
                manager,
                d,
                "QUOTATION_LINE_ADDED",
                label(q) + " · " + line.getDescription() + ", " + money(line.getCatalogAmount()) + " · " + reason,
                reason);
    }

    /** Changes a line the manager added. */
    @Transactional
    public QuotationDraftResponse editLine(User manager, UUID requestId, UUID lineId, ManualLineRequest body) {
        Draft d = draftForWrite(requestId);
        QuotationLine line = manualLineOf(d.quotation(), lineId);
        checkNote(body);
        if (!line.getGroupCode().equals(body.group())) {
            line.setPosition(nextPosition(d.quotation(), body.group()));
        }
        fill(line, body);
        String reason = line.getManualReason();
        return saved(
                manager,
                d,
                "QUOTATION_LINE_EDITED",
                label(d.quotation()) + " · " + line.getDescription() + ", " + money(line.getCatalogAmount()) + " · "
                        + reason,
                reason);
    }

    /** Removes a line the manager added; a catalog line is never removed, only overridden. */
    @Transactional
    public QuotationDraftResponse removeLine(User manager, UUID requestId, UUID lineId) {
        Draft d = draftForWrite(requestId);
        QuotationLine line = manualLineOf(d.quotation(), lineId);
        d.quotation().getLines().remove(line);
        return saved(
                manager,
                d,
                "QUOTATION_LINE_REMOVED",
                label(d.quotation()) + " · " + line.getDescription() + ", " + money(line.getCatalogAmount())
                        + " removed",
                null);
    }

    /**
     * Totals the draft over its lines as they now stand, saves it and audits the write. The lines are not priced
     * again, so their ids hold and a request changed since pricing still asks for a re-price.
     */
    private QuotationDraftResponse saved(User manager, Draft d, String action, String summary, String reason) {
        TransportRequest request = d.request();
        pricing.retotal(d.quotation(), request);
        Quotation saved = quotations.saveAndFlush(d.quotation());
        audit.recordDecision(
                manager,
                action,
                AuditText.fit(summary),
                ENTITY_TYPE,
                request.getId(),
                request.getCode(),
                reason,
                null,
                null);
        return pricing.toResponse(saved, request, List.of());
    }

    private static void fill(QuotationLine line, ManualLineRequest body) {
        line.setGroupCode(body.group());
        line.setDescription(body.description().strip());
        line.setQuantity(body.quantity());
        line.setUnitRate(cents(body.unitRate()));
        line.setCatalogAmount(cents(body.quantity().multiply(body.unitRate())));
        boolean estimated = body.certainty() == RateCertainty.ESTIMATED;
        line.setCertainty(estimated ? LineCertainty.ESTIMATED : LineCertainty.FIXED);
        line.setEstimateNote(estimated ? body.estimateNote().strip() : null);
        line.setManualReason(body.reason().strip());
    }

    private static void checkNote(ManualLineRequest body) {
        if (body.certainty() == RateCertainty.ESTIMATED
                && (body.estimateNote() == null || body.estimateNote().isBlank())) {
            throw new BusinessException("ESTIMATE_NOTE", "Say why this line may vary.");
        }
    }

    private static short nextPosition(Quotation q, String group) {
        return (short) (q.getLines().stream()
                        .filter(l -> l.getGroupCode().equals(group))
                        .mapToInt(QuotationLine::getPosition)
                        .max()
                        .orElse(0)
                + 1);
    }

    private static QuotationLine lineOf(Quotation q, UUID lineId) {
        return q.getLines().stream()
                .filter(l -> lineId.equals(l.getId()))
                .findFirst()
                .orElseThrow(() -> ResourceNotFoundException.of("Quotation line", lineId));
    }

    private static QuotationLine manualLineOf(Quotation q, UUID lineId) {
        QuotationLine line = lineOf(q, lineId);
        if (line.getManualReason() == null) {
            throw new ConflictException(
                    "NOT_A_MANUAL_LINE", "Only a line you added can be edited. Override a catalog line instead.");
        }
        return line;
    }

    private String ownerName() {
        String owner = pricing.catalogOwner();
        return owner == null ? "the transport specialist" : owner;
    }

    private static String label(Quotation q) {
        return q.getCode() + " v" + q.getVersionNo();
    }

    private static BigDecimal cents(BigDecimal amount) {
        return amount.setScale(2, RoundingMode.HALF_UP);
    }

    // --- helpers -----------------------------------------------------------------------------------------------

    /** A request submitted again after a return: opening its draft takes it back under review. */
    private void underReview(User manager, TransportRequest request, String what) {
        request.setStatus(RequestStatus.UNDER_REVIEW);
        requests.save(request);
        audit.recordDecision(
                manager,
                "QUOTATION_RESUMED",
                AuditText.fit(what + "; the request is under review"),
                ENTITY_TYPE,
                request.getId(),
                request.getCode(),
                null,
                "{\"status\":\"" + RequestStatus.SUBMITTED + "\"}",
                "{\"status\":\"" + RequestStatus.UNDER_REVIEW + "\"}");
    }

    private record Draft(TransportRequest request, Quotation quotation) {}

    /** A line write: the line's id already belongs to one version, so it names none. */
    private Draft draftForWrite(UUID requestId) {
        return draftForWrite(requestId, null);
    }

    /**
     * Locks the request row, then reads its latest version, which must be the one the manager is looking at (when
     * named), a draft the request can still take, and drafted from a version the customer didn't decline.
     */
    private Draft draftForWrite(UUID requestId, Integer version) {
        TransportRequest request = requests.findByIdForUpdate(requestId)
                .orElseThrow(() -> ResourceNotFoundException.of("Request", requestId));
        Quotation q = quotations
                .findFirstByRequestIdOrderByVersionNoDesc(requestId)
                .orElseThrow(() -> ResourceNotFoundException.of("Quotation for request", requestId));
        QuotationRules.requireVersion(version, q);
        QuotationRules.requireWritable(request, q, previousOf(quotations, q));
        return new Draft(request, q);
    }

    /** The version a revision was drafted from; null for the first version. */
    static Quotation previousOf(QuotationRepository quotations, Quotation q) {
        return q.getVersionNo() > 1
                ? quotations
                        .findByRequestIdAndVersionNo(q.getRequest().getId(), (short) (q.getVersionNo() - 1))
                        .orElse(null)
                : null;
    }

    private static void requireInReview(TransportRequest request) {
        if (!IN_REVIEW.contains(request.getStatus())) {
            throw new ConflictException("REQUEST_NOT_IN_REVIEW", "Only a request in review can be quoted.");
        }
    }

    private RateCatalogVersion latestPublished() {
        return versions.findFirstByStatusOrderByVersionNoDesc(CatalogStatus.PUBLISHED)
                .orElseThrow(() -> new ConflictException("NO_PUBLISHED_CATALOG", "No rate catalog is published yet."));
    }
}
