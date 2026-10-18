package com.equifreight.controller.staff;

import com.equifreight.entity.User;
import com.equifreight.model.review.QueueRowResponse;
import com.equifreight.model.review.RequestReviewResponse;
import com.equifreight.model.review.ReturnRequest;
import com.equifreight.service.RequestReviewService;
import io.swagger.v3.oas.annotations.Operation;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** The logistics manager's review of incoming requests (US-F1-03, US-F1-04). */
@RestController
@RequestMapping("/api/v1/staff/requests")
public class StaffRequestController {

    private static final int PAGE_SIZE = 20;

    private final RequestReviewService service;

    public StaffRequestController(RequestReviewService service) {
        this.service = service;
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
}
