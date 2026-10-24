package com.equifreight.controller.staff;

import com.equifreight.entity.User;
import com.equifreight.model.job.JobClosingResponse;
import com.equifreight.service.JobClosingService;
import io.swagger.v3.oas.annotations.Operation;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

/** Closing a delivered job (US-F6-04). */
@RestController
public class StaffJobClosingController {

    private final JobClosingService closing;

    public StaffJobClosingController(JobClosingService closing) {
        this.closing = closing;
    }

    @Operation(summary = "Whether the job can close, what holds it, or how it was closed")
    @GetMapping("/api/v1/staff/jobs/{jobId}/closing")
    public JobClosingResponse closing(@PathVariable UUID jobId) {
        return closing.closing(jobId);
    }

    @Operation(summary = "The logistics manager closes a delivered job; it records whether delivery was on time")
    @PostMapping("/api/v1/staff/jobs/{jobId}/close")
    @PreAuthorize("hasRole('LOGISTICS_MANAGER')")
    public JobClosingResponse close(@PathVariable UUID jobId, @AuthenticationPrincipal User user) {
        return closing.close(jobId, user);
    }
}
