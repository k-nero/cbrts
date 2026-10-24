package com.equifreight.controller.staff;

import com.equifreight.model.overview.OverviewResponse;
import com.equifreight.model.overview.QuoteOutResponse;
import com.equifreight.service.OverviewService;
import io.swagger.v3.oas.annotations.Operation;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** The logistics manager's Overview (US-R-01), and the quotes out it opens. */
@RestController
@PreAuthorize("hasRole('LOGISTICS_MANAGER')")
public class StaffOverviewController {

    private final OverviewService overview;

    public StaffOverviewController(OverviewService overview) {
        this.overview = overview;
    }

    @Operation(summary = "What needs the logistics manager's attention, each count with the case that matters most")
    @GetMapping("/api/v1/staff/overview")
    public OverviewResponse overview() {
        return overview.overview();
    }

    @Operation(summary = "Issued quotations waiting for the customer, soonest to expire first")
    @GetMapping("/api/v1/staff/requests/quotes-out")
    public Page<QuoteOutResponse> quotesOut(@PageableDefault(size = 20) Pageable pageable) {
        return overview.quotesOut(pageable);
    }
}
