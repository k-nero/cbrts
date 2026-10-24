package com.equifreight.controller.staff;

import com.equifreight.model.report.RevenueReportResponse;
import com.equifreight.service.RevenueReportService;
import io.swagger.v3.oas.annotations.Operation;
import java.util.UUID;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Reports (EPIC-R): the logistics manager's. */
@RestController
@PreAuthorize("hasRole('LOGISTICS_MANAGER')")
public class StaffReportController {

    private final RevenueReportService revenue;

    public StaffReportController(RevenueReportService revenue) {
        this.revenue = revenue;
    }

    @Operation(summary = "US-R-02: revenue and direct cost by month and corridor; from/to are YYYY-MM, both inclusive")
    @GetMapping("/api/v1/staff/reports/revenue")
    public RevenueReportResponse revenue(
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @RequestParam(required = false) UUID corridorId) {
        return revenue.report(from, to, corridorId);
    }

    @Operation(summary = "US-R-02: the same report's job rows as CSV")
    @GetMapping(value = "/api/v1/staff/reports/revenue.csv", produces = "text/csv")
    public ResponseEntity<String> revenueCsv(
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @RequestParam(required = false) UUID corridorId) {
        String body = revenue.csv(from, to, corridorId);
        // Both months were parsed by the report, so they are plain YYYY-MM here.
        String name = from != null && to != null ? "revenue-" + from + "-to-" + to + ".csv" : "revenue-report.csv";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + name + "\"")
                .contentType(new MediaType("text", "csv", java.nio.charset.StandardCharsets.UTF_8))
                .body(body);
    }
}
