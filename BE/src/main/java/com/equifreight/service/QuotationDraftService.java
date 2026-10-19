package com.equifreight.service;

import com.equifreight.entity.Quotation;
import com.equifreight.entity.QuotationLine;
import com.equifreight.entity.RateCatalogVersion;
import com.equifreight.entity.RateLine;
import com.equifreight.entity.RateServiceClass;
import com.equifreight.entity.RequestHorse;
import com.equifreight.entity.TransportRequest;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.CatalogStatus;
import com.equifreight.entity.enums.CodePrefix;
import com.equifreight.entity.enums.QuotationStatus;
import com.equifreight.entity.enums.RatePolicyKey;
import com.equifreight.entity.enums.RequestStatus;
import com.equifreight.entity.enums.RoleName;
import com.equifreight.entity.enums.ServiceClass;
import com.equifreight.entity.enums.TransportMode;
import com.equifreight.entity.enums.UserStatus;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ConflictException;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.model.quotation.QuotationDraftResponse;
import com.equifreight.model.quotation.QuotationMapper;
import com.equifreight.model.quotation.StartResult;
import com.equifreight.repository.QuotationRepository;
import com.equifreight.repository.RateCatalogVersionRepository;
import com.equifreight.repository.TransportRequestRepository;
import com.equifreight.repository.UserRepository;
import com.equifreight.service.pricing.CatalogRows;
import com.equifreight.service.pricing.PricedLine;
import com.equifreight.service.pricing.PricedQuote;
import com.equifreight.service.pricing.PricedTotals;
import com.equifreight.service.pricing.PricingInputs;
import com.equifreight.service.pricing.QuotePricer;
import com.equifreight.service.pricing.RateSet;
import com.equifreight.service.pricing.RateSetLoader;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
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
    private final RateSetLoader loader;
    private final PricingInputs inputs;
    private final CodeService codes;
    private final UserRepository users;
    private final AuditService audit;
    private final Clock clock;

    public QuotationDraftService(
            TransportRequestRepository requests,
            QuotationRepository quotations,
            RateCatalogVersionRepository versions,
            RateSetLoader loader,
            PricingInputs inputs,
            CodeService codes,
            UserRepository users,
            AuditService audit,
            Clock clock) {
        this.requests = requests;
        this.quotations = quotations;
        this.versions = versions;
        this.loader = loader;
        this.inputs = inputs;
        this.codes = codes;
        this.users = users;
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
            requireDraft(q);
            if (request.getStatus() == RequestStatus.SUBMITTED) {
                underReview(manager, request, "Quotation " + q.getCode() + " v" + q.getVersionNo() + " resumed");
            }
            return new StartResult(toResponse(q, request), false);
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
        price(q, request);
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
        return new StartResult(toResponse(q, request), true);
    }

    @Transactional(readOnly = true)
    public QuotationDraftResponse get(UUID requestId) {
        TransportRequest request =
                requests.findById(requestId).orElseThrow(() -> ResourceNotFoundException.of("Request", requestId));
        Quotation q = quotations
                .findFirstByRequestIdOrderByVersionNoDesc(requestId)
                .orElseThrow(() -> ResourceNotFoundException.of("Quotation for request", requestId));
        return toResponse(q, request);
    }

    /** Prices the draft with another air class, on the version it already pins. */
    @Transactional
    public QuotationDraftResponse changeClass(User manager, UUID requestId, ServiceClass airClass) {
        TransportRequest request = lockedInReview(requestId);
        Quotation q = draftOf(requestId);
        if (request.getMode() != TransportMode.AIR) {
            throw new BusinessException("NOT_AN_AIR_REQUEST", "Only an air move has a service class.");
        }
        q.setAirClass(airClass);
        price(q, request);
        return toResponse(quotations.save(q), request);
    }

    /** Pins the latest published catalog and prices the draft again from the request as it is now. */
    @Transactional
    public QuotationDraftResponse reprice(User manager, UUID requestId) {
        TransportRequest request = lockedInReview(requestId);
        Quotation q = draftOf(requestId);
        RateCatalogVersion published = latestPublished();
        q.setRateCatalogVersion(published);
        price(q, request);
        Quotation saved = quotations.save(q);
        audit.recordDecision(
                manager,
                "QUOTATION_REPRICED",
                AuditText.fit("Quotation " + q.getCode() + " v" + q.getVersionNo() + " re-priced on rate catalog v"
                        + published.getVersionNo()),
                ENTITY_TYPE,
                request.getId(),
                request.getCode(),
                null,
                null,
                null);
        return toResponse(saved, request);
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

    private TransportRequest lockedInReview(UUID requestId) {
        TransportRequest request = requests.findByIdForUpdate(requestId)
                .orElseThrow(() -> ResourceNotFoundException.of("Request", requestId));
        requireInReview(request);
        return request;
    }

    private Quotation draftOf(UUID requestId) {
        Quotation q = quotations
                .findFirstByRequestIdOrderByVersionNoDesc(requestId)
                .orElseThrow(() -> ResourceNotFoundException.of("Quotation for request", requestId));
        requireDraft(q);
        return q;
    }

    private static void requireInReview(TransportRequest request) {
        if (!IN_REVIEW.contains(request.getStatus())) {
            throw new ConflictException("REQUEST_NOT_IN_REVIEW", "Only a request in review can be quoted.");
        }
    }

    private static void requireDraft(Quotation q) {
        if (q.getStatus() != QuotationStatus.DRAFT) {
            throw new ConflictException(
                    "QUOTATION_NOT_DRAFT", "This quotation has been issued and can't be re-priced.");
        }
    }

    private RateCatalogVersion latestPublished() {
        return versions.findFirstByStatusOrderByVersionNoDesc(CatalogStatus.PUBLISHED)
                .orElseThrow(() -> new ConflictException("NO_PUBLISHED_CATALOG", "No rate catalog is published yet."));
    }

    /** Replaces the draft's lines and totals with the engine's answer on its pinned version. */
    private void price(Quotation q, TransportRequest request) {
        q.setAirClass(pricedClass(q, request));
        CatalogRows rows = loader.load(q.getRateCatalogVersion().getId());
        RateSet rates = rows.forCorridor(request.getCorridor().getId());
        PricedQuote priced = QuotePricer.price(inputs.inputFor(request, q.getAirClass()), rates);

        Map<UUID, RateLine> rateLines =
                rows.lines().stream().collect(Collectors.toMap(RateLine::getId, Function.identity()));
        Map<UUID, RateServiceClass> stalls =
                rows.classes().stream().collect(Collectors.toMap(RateServiceClass::getId, Function.identity()));
        Map<UUID, RequestHorse> horses = request.getHorses().stream()
                .collect(Collectors.toMap(rh -> rh.getHorse().getId(), Function.identity(), (a, b) -> a));
        Map<String, Short> positions = new HashMap<>();

        q.getLines().clear();
        for (PricedLine p : priced.lines()) {
            QuotationLine line = new QuotationLine();
            line.setQuotation(q);
            line.setGroupCode(p.group());
            line.setPosition(positions.merge(p.group(), (short) 1, (a, b) -> (short) (a + b)));
            line.setDescription(p.description());
            line.setBasisText(p.basisText());
            line.setBasis(p.basis());
            line.setQuantity(p.quantity());
            line.setUnitRate(p.unitRate());
            line.setSource(p.source());
            line.setRateLine(p.rateLineId() == null ? null : rateLines.get(p.rateLineId()));
            line.setRateServiceClass(p.rateServiceClassId() == null ? null : stalls.get(p.rateServiceClassId()));
            RequestHorse horse = p.horseId() == null ? null : horses.get(p.horseId());
            line.setHorse(horse == null ? null : horse.getHorse());
            line.setCertainty(p.certainty());
            line.setEstimateNote(p.estimateNote());
            line.setCatalogAmount(p.amount());
            q.getLines().add(line);
        }
        PricedTotals totals = priced.totals();
        q.setSubtotal(totals.subtotal());
        q.setVolumeBreak(totals.volumeBreak());
        q.setFuel(totals.fuel());
        q.setInsurance(totals.insurance());
        q.setContingency(totals.contingency());
        q.setServiceFee(totals.serviceFee());
        q.setTotal(totals.total());
    }

    /**
     * The class to price with: none for a road move; for air, the class the manager chose, else the customer's.
     * The request's mode can change while it is back with the customer, so this follows the request as it is now.
     */
    private static ServiceClass pricedClass(Quotation q, TransportRequest request) {
        if (request.getMode() != TransportMode.AIR) {
            return null;
        }
        return q.getAirClass() != null ? q.getAirClass() : request.getAirClass();
    }

    private QuotationDraftResponse toResponse(Quotation q, TransportRequest request) {
        CatalogRows rows = loader.load(q.getRateCatalogVersion().getId());
        RateSet rates = rows.forCorridor(request.getCorridor().getId());
        ServiceClass airClass = pricedClass(q, request);
        PricedQuote now = QuotePricer.price(inputs.inputFor(request, airClass), rates);
        BigDecimal validity = rates.policies().get(RatePolicyKey.QUOTE_VALIDITY_DAYS);
        Integer latest = versions.findFirstByStatusOrderByVersionNoDesc(CatalogStatus.PUBLISHED)
                .map(RateCatalogVersion::getVersionNo)
                .orElse(null);
        String owner = users.findByRoleAndStatus(RoleName.TRANSPORT_SPECIALIST, UserStatus.ACTIVE).stream()
                .findFirst()
                .map(User::displayName)
                .orElse(null);
        return QuotationMapper.toDraftResponse(
                q, request, airClass, now, latest, validity == null ? null : validity.intValue(), owner);
    }
}
