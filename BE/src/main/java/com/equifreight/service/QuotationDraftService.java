package com.equifreight.service;

import com.equifreight.entity.Quotation;
import com.equifreight.entity.RateCatalogVersion;
import com.equifreight.entity.TransportRequest;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.CatalogStatus;
import com.equifreight.entity.enums.CodePrefix;
import com.equifreight.entity.enums.QuotationStatus;
import com.equifreight.entity.enums.RequestStatus;
import com.equifreight.entity.enums.ServiceClass;
import com.equifreight.entity.enums.TransportMode;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ConflictException;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.model.quotation.QuotationDraftResponse;
import com.equifreight.model.quotation.StartResult;
import com.equifreight.repository.QuotationRepository;
import com.equifreight.repository.RateCatalogVersionRepository;
import com.equifreight.repository.TransportRequestRepository;
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
            requireDraft(q);
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
        TransportRequest request =
                requests.findById(requestId).orElseThrow(() -> ResourceNotFoundException.of("Request", requestId));
        Quotation q = quotations
                .findFirstByRequestIdOrderByVersionNoDesc(requestId)
                .orElseThrow(() -> ResourceNotFoundException.of("Quotation for request", requestId));
        return pricing.toResponse(q, request, List.of());
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
        List<String> dropped = pricing.price(q, request);
        return pricing.toResponse(quotations.save(q), request, dropped);
    }

    /** Pins the latest published catalog and prices the draft again from the request as it is now. */
    @Transactional
    public QuotationDraftResponse reprice(User manager, UUID requestId) {
        TransportRequest request = lockedInReview(requestId);
        Quotation q = draftOf(requestId);
        RateCatalogVersion published = latestPublished();
        q.setRateCatalogVersion(published);
        List<String> dropped = pricing.price(q, request);
        Quotation saved = quotations.save(q);
        String summary = "Quotation " + q.getCode() + " v" + q.getVersionNo() + " re-priced on rate catalog v"
                + published.getVersionNo();
        for (String d : dropped) {
            summary += "; override on " + d.substring(0, d.indexOf(':')) + " dropped";
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
}
