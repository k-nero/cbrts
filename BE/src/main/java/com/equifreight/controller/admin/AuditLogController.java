package com.equifreight.controller.admin;

import com.equifreight.configuration.AppConstants;
import com.equifreight.model.audit.AuditActorOption;
import com.equifreight.model.audit.AuditLogFilter;
import com.equifreight.model.audit.AuditLogResponse;
import com.equifreight.service.AuditLogService;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * The audit log (logistics manager only, US-00-06). Read-only: entries are append-only, so there
 * is no endpoint to edit or delete one. Access is enforced on /api/v1/admin/** in ApplicationConfiguration.
 */
@RestController
@RequestMapping("/api/v1/admin/audit-log")
public class AuditLogController {

    private final AuditLogService auditLogService;

    public AuditLogController(AuditLogService auditLogService) {
        this.auditLogService = auditLogService;
    }

    // Sortable: occurredAt only (DESIGN.md, Tables: "Audit log: When only").
    @GetMapping
    public Page<AuditLogResponse> list(
            @RequestParam(value = "q", required = false) String q,
            @RequestParam(value = "actor", required = false) String actor,
            @RequestParam(value = "action", required = false) String action,
            @RequestParam(value = "from", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                    LocalDate from,
            @RequestParam(value = "to", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @PageableDefault(size = 20, sort = "occurredAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return auditLogService.search(new AuditLogFilter(q, actor, action, from, to), pageable);
    }

    /**
     * The people with entries, for the Person filter.
     */
    @GetMapping("/actors")
    public List<AuditActorOption> actors() {
        return auditLogService.actors();
    }

    /**
     * The action codes recorded so far, for the Action filter.
     */
    @GetMapping("/actions")
    public List<String> actions() {
        return auditLogService.actions();
    }

    /**
     * The filtered entries, newest first, as CSV.
     */
    @GetMapping("/export")
    public ResponseEntity<byte[]> export(
            @RequestParam(value = "q", required = false) String q,
            @RequestParam(value = "actor", required = false) String actor,
            @RequestParam(value = "action", required = false) String action,
            @RequestParam(value = "from", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                    LocalDate from,
            @RequestParam(value = "to", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        byte[] csv = auditLogService.exportCsv(new AuditLogFilter(q, actor, action, from, to));
        String fileName = "audit-log-%s.csv".formatted(LocalDate.now(AppConstants.BUSINESS_ZONE));
        return ResponseEntity.ok()
                .contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment()
                                .filename(fileName)
                                .build()
                                .toString())
                .body(csv);
    }
}
