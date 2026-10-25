package com.equifreight.controller.customer;

import com.equifreight.entity.User;
import com.equifreight.entity.enums.RequestStatus;
import com.equifreight.model.estimate.EstimateResponse;
import com.equifreight.model.quotation.AcceptRequest;
import com.equifreight.model.quotation.CustomerQuotationResponse;
import com.equifreight.model.quotation.DeclineRequest;
import com.equifreight.model.request.RequestDraftRequest;
import com.equifreight.model.request.RequestResponse;
import com.equifreight.model.request.RequestSummaryResponse;
import com.equifreight.service.CustomerQuotationService;
import com.equifreight.service.RequestService;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
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

@RestController
@RequestMapping("/api/v1/customer")
public class RequestController {

    private final RequestService requestService;
    private final CustomerQuotationService quotations;

    public RequestController(RequestService requestService, CustomerQuotationService quotations) {
        this.quotations = quotations;
        this.requestService = requestService;
    }

    // Sortable: createdAt, departureDate, submittedAt.
    @GetMapping("/requests")
    public Page<RequestSummaryResponse> list(
            @AuthenticationPrincipal User user,
            @RequestParam(value = "status", required = false) RequestStatus status,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return requestService.list(user, status, pageable);
    }

    @GetMapping("/requests/{id}")
    public RequestResponse get(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        return requestService.get(user, id);
    }

    /** A new draft; every field is optional, and what still stops submission comes back as blockers. */
    @PostMapping("/requests")
    public RequestResponse create(@AuthenticationPrincipal User user, @Valid @RequestBody RequestDraftRequest body) {
        return requestService.create(user, body);
    }

    /** Replaces every field of a draft. */
    @PutMapping("/requests/{id}")
    public RequestResponse update(
            @AuthenticationPrincipal User user, @PathVariable UUID id, @Valid @RequestBody RequestDraftRequest body) {
        return requestService.update(user, id, body);
    }

    /**
     * The instant estimate for the wizard's current values (US-Q-05): a range or why there is none, with each
     * choice's effect. Nothing is saved; it is a POST only because it carries the draft's body.
     */
    @PostMapping("/requests/estimate")
    public EstimateResponse estimate(@AuthenticationPrincipal User user, @Valid @RequestBody RequestDraftRequest body) {
        return requestService.estimate(user, body);
    }

    /** Submits a draft: SUBMITTED with its REQ code, or 409 SUBMISSION_BLOCKED with every blocker in details. */
    @PostMapping("/requests/{id}/submit")
    public RequestResponse submit(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        return requestService.submit(user, id);
    }

    /** Discards a draft that was never submitted. */
    @DeleteMapping("/requests/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        requestService.delete(user, id);
    }

    @Operation(summary = "The request's latest issued quotation, with its terms and versions; 404 until one is issued")
    @GetMapping("/requests/{id}/quotation")
    public CustomerQuotationResponse quotation(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        return quotations.get(user, id);
    }

    @Operation(
            summary = "Accept the latest issued quotation (US-F1-06): only before it expires; the request becomes"
                    + " CUSTOMER_ACCEPTED and that version is bound. An optional body names the version read; 409"
                    + " QUOTATION_VERSION_CHANGED when a newer one was issued since")
    @PostMapping("/requests/{id}/quotation/accept")
    public CustomerQuotationResponse accept(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id,
            @RequestBody(required = false) AcceptRequest body) {
        return quotations.accept(user, id, body);
    }

    @Operation(
            summary = "Decline the latest issued quotation (US-F1-06), with an optional reason; the request ends"
                    + " EXPIRED. {versionNo}, when given, must still be the latest issued version")
    @PostMapping("/requests/{id}/quotation/decline")
    public CustomerQuotationResponse decline(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id,
            @Valid @RequestBody(required = false) DeclineRequest body) {
        return quotations.decline(user, id, body);
    }

    @Operation(
            summary = "Cancel a submitted request in any state before APPROVED (BR-F1-07); the fee band follows the"
                    + " days left before departure")
    @PostMapping("/requests/{id}/cancel")
    public RequestResponse cancel(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        return requestService.cancel(user, id);
    }
}
