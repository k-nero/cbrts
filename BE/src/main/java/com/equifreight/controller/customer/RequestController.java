package com.equifreight.controller.customer;

import com.equifreight.entity.User;
import com.equifreight.entity.enums.RequestStatus;
import com.equifreight.model.estimate.EstimateResponse;
import com.equifreight.model.request.RequestDraftRequest;
import com.equifreight.model.request.RequestResponse;
import com.equifreight.model.request.RequestSummaryResponse;
import com.equifreight.service.RequestService;
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

    public RequestController(RequestService requestService) {
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
}
