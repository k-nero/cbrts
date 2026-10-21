package com.equifreight.controller.staff;

import com.equifreight.entity.User;
import com.equifreight.model.quotation.AirClassRequest;
import com.equifreight.model.quotation.IssueRequest;
import com.equifreight.model.quotation.ManualLineRequest;
import com.equifreight.model.quotation.OverrideRequest;
import com.equifreight.model.quotation.QuotationDraftResponse;
import com.equifreight.model.quotation.StartResult;
import com.equifreight.model.review.QueueRowResponse;
import com.equifreight.model.review.RequestReviewResponse;
import com.equifreight.model.review.ReturnRequest;
import com.equifreight.service.QuotationDraftService;
import com.equifreight.service.QuotationIssueService;
import com.equifreight.service.RequestReviewService;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** The logistics manager's review of incoming requests (US-F1-03, US-F1-04). */
@RestController
@RequestMapping("/api/v1/staff/requests")
public class StaffRequestController {

    private static final int PAGE_SIZE = 20;

    private final RequestReviewService service;
    private final QuotationDraftService quotations;
    private final QuotationIssueService issues;

    public StaffRequestController(
            RequestReviewService service, QuotationDraftService quotations, QuotationIssueService issues) {
        this.service = service;
        this.quotations = quotations;
        this.issues = issues;
    }

    @Operation(summary = "The review queue: requests waiting for review, oldest first, 20 to a page")
    @GetMapping
    @PreAuthorize("hasRole('LOGISTICS_MANAGER')")
    public Page<QueueRowResponse> queue(Pageable pageable) {
        // The order is the queue's meaning (oldest first), so a sort parameter is ignored.
        return service.queue(PageRequest.of(pageable.getPageNumber(), PAGE_SIZE));
    }

    @Operation(summary = "One request for review: its checks, every version, its history and its place in the queue")
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('LOGISTICS_MANAGER')")
    public RequestReviewResponse view(@PathVariable UUID id) {
        return service.view(id);
    }

    @Operation(summary = "Return a request to the customer for missing information, with a mandatory note")
    @PostMapping("/{id}/return")
    @PreAuthorize("hasRole('LOGISTICS_MANAGER')")
    public RequestReviewResponse returnForInformation(
            @PathVariable UUID id, @RequestBody ReturnRequest body, @AuthenticationPrincipal User user) {
        return service.returnForInformation(user, id, body.note());
    }

    @Operation(summary = "Start the request's draft quotation from the published rate catalog (201), or open it (200)")
    @PostMapping("/{id}/quotation")
    @PreAuthorize("hasRole('LOGISTICS_MANAGER')")
    public ResponseEntity<QuotationDraftResponse> startQuotation(
            @PathVariable UUID id, @AuthenticationPrincipal User user) {
        StartResult result = quotations.start(user, id);
        return ResponseEntity.status(result.created() ? HttpStatus.CREATED : HttpStatus.OK)
                .body(result.quotation());
    }

    @Operation(summary = "The request's quotation: grouped lines, totals with their bases, stall fit and missing rates")
    @GetMapping("/{id}/quotation")
    @PreAuthorize("hasRole('LOGISTICS_MANAGER')")
    public QuotationDraftResponse quotation(@PathVariable UUID id, @RequestParam(required = false) Short version) {
        return quotations.get(id, version);
    }

    @Operation(summary = "Price the draft quotation with another air class, on the catalog version it pins")
    @PutMapping("/{id}/quotation")
    @PreAuthorize("hasRole('LOGISTICS_MANAGER')")
    public QuotationDraftResponse changeQuotationClass(
            @PathVariable UUID id, @Valid @RequestBody AirClassRequest body, @AuthenticationPrincipal User user) {
        return quotations.changeClass(user, id, body.airClass());
    }

    @Operation(summary = "Re-price the draft quotation on the latest published rate catalog")
    @PostMapping("/{id}/quotation/reprice")
    @PreAuthorize("hasRole('LOGISTICS_MANAGER')")
    public QuotationDraftResponse repriceQuotation(@PathVariable UUID id, @AuthenticationPrincipal User user) {
        return quotations.reprice(user, id);
    }

    @Operation(summary = "Override a priced line's amount with a reason; the totals are computed again")
    @PutMapping("/{id}/quotation/lines/{lineId}/override")
    @PreAuthorize("hasRole('LOGISTICS_MANAGER')")
    public QuotationDraftResponse overrideLine(
            @PathVariable UUID id,
            @PathVariable UUID lineId,
            @Valid @RequestBody OverrideRequest body,
            @AuthenticationPrincipal User user) {
        return quotations.override(user, id, lineId, body);
    }

    @Operation(summary = "Remove a line's override, back to the catalog amount")
    @DeleteMapping("/{id}/quotation/lines/{lineId}/override")
    @PreAuthorize("hasRole('LOGISTICS_MANAGER')")
    public QuotationDraftResponse removeOverride(
            @PathVariable UUID id, @PathVariable UUID lineId, @AuthenticationPrincipal User user) {
        return quotations.removeOverride(user, id, lineId);
    }

    @Operation(summary = "Add a line the catalog doesn't know, with a reason (201)")
    @PostMapping("/{id}/quotation/lines")
    @PreAuthorize("hasRole('LOGISTICS_MANAGER')")
    @ResponseStatus(HttpStatus.CREATED)
    public QuotationDraftResponse addLine(
            @PathVariable UUID id, @Valid @RequestBody ManualLineRequest body, @AuthenticationPrincipal User user) {
        return quotations.addLine(user, id, body);
    }

    @Operation(summary = "Change a line the manager added")
    @PutMapping("/{id}/quotation/lines/{lineId}")
    @PreAuthorize("hasRole('LOGISTICS_MANAGER')")
    public QuotationDraftResponse editLine(
            @PathVariable UUID id,
            @PathVariable UUID lineId,
            @Valid @RequestBody ManualLineRequest body,
            @AuthenticationPrincipal User user) {
        return quotations.editLine(user, id, lineId, body);
    }

    @Operation(summary = "Remove a line the manager added")
    @DeleteMapping("/{id}/quotation/lines/{lineId}")
    @PreAuthorize("hasRole('LOGISTICS_MANAGER')")
    public QuotationDraftResponse removeLine(
            @PathVariable UUID id, @PathVariable UUID lineId, @AuthenticationPrincipal User user) {
        return quotations.removeLine(user, id, lineId);
    }

    @Operation(
            summary = "Issue the draft: it becomes a document valid for the catalog's days; 409 names what blocks it")
    @PostMapping("/{id}/quotation/issue")
    @PreAuthorize("hasRole('LOGISTICS_MANAGER')")
    public QuotationDraftResponse issueQuotation(
            @PathVariable UUID id, @Valid @RequestBody IssueRequest body, @AuthenticationPrincipal User user) {
        return issues.issue(user, id, body);
    }

    @Operation(
            summary = "Draft the next version from the latest issued or expired one (201); the issued one stays live")
    @PostMapping("/{id}/quotation/revise")
    @PreAuthorize("hasRole('LOGISTICS_MANAGER')")
    @ResponseStatus(HttpStatus.CREATED)
    public QuotationDraftResponse reviseQuotation(@PathVariable UUID id, @AuthenticationPrincipal User user) {
        return issues.revise(user, id).quotation();
    }

    @Operation(summary = "Discard a revision's draft; the version it came from stands")
    @DeleteMapping("/{id}/quotation/draft")
    @PreAuthorize("hasRole('LOGISTICS_MANAGER')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void discardRevision(@PathVariable UUID id, @AuthenticationPrincipal User user) {
        issues.discardDraft(user, id);
    }
}
