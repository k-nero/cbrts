package com.equifreight.controller.staff;

import com.equifreight.entity.User;
import com.equifreight.model.invoice.ActualQuantityRequest;
import com.equifreight.model.invoice.InvoiceResponse;
import com.equifreight.model.invoice.InvoiceSummaryResponse;
import com.equifreight.model.invoice.InvoiceView;
import com.equifreight.model.invoice.ReadyForInvoiceResponse;
import com.equifreight.model.invoice.RecordPaymentRequest;
import com.equifreight.service.InvoiceService;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Invoices and payments (US-F6-03): the logistics manager's. */
@RestController
@PreAuthorize("hasRole('LOGISTICS_MANAGER')")
public class StaffInvoiceController {

    private final InvoiceService invoices;

    public StaffInvoiceController(InvoiceService invoices) {
        this.invoices = invoices;
    }

    @Operation(summary = "The Invoices list: All, To be paid, Overdue or Paid, soonest due first")
    @GetMapping("/api/v1/staff/invoices")
    public Page<InvoiceSummaryResponse> list(
            @RequestParam(required = false) InvoiceView view, @PageableDefault(size = 20) Pageable pageable) {
        return invoices.list(
                view,
                PageRequest.of(
                        pageable.getPageNumber(),
                        pageable.getPageSize(),
                        Sort.by(Sort.Order.asc("dueOn").nullsLast(), Sort.Order.desc("createdAt"))));
    }

    @Operation(summary = "Jobs whose handover is settled and that have no final invoice yet")
    @GetMapping("/api/v1/staff/invoices/ready")
    public List<ReadyForInvoiceResponse> ready() {
        return invoices.readyForFinal();
    }

    @GetMapping("/api/v1/staff/invoices/{id}")
    public InvoiceResponse get(@PathVariable UUID id) {
        return invoices.get(id);
    }

    @Operation(summary = "The job's final invoice as a draft, once its handover is settled")
    @PostMapping("/api/v1/staff/jobs/{jobId}/final-invoice")
    public InvoiceResponse prepareFinal(@PathVariable UUID jobId, @AuthenticationPrincipal User user) {
        return invoices.prepareFinal(jobId, user);
    }

    @Operation(summary = "An estimated line's actual quantity on a draft final invoice, with why it changed")
    @PutMapping("/api/v1/staff/invoices/{id}/lines/{lineId}/actual")
    public InvoiceResponse setActual(
            @PathVariable UUID id,
            @PathVariable UUID lineId,
            @Valid @RequestBody ActualQuantityRequest request,
            @AuthenticationPrincipal User user) {
        return invoices.setActual(id, lineId, request, user);
    }

    @PostMapping("/api/v1/staff/invoices/{id}/issue")
    public InvoiceResponse issue(@PathVariable UUID id, @AuthenticationPrincipal User user) {
        return invoices.issue(id, user);
    }

    @Operation(summary = "A payment received by bank transfer or card, recorded by hand")
    @PostMapping("/api/v1/staff/invoices/{id}/payments")
    public InvoiceResponse recordPayment(
            @PathVariable UUID id,
            @Valid @RequestBody RecordPaymentRequest request,
            @AuthenticationPrincipal User user) {
        return invoices.recordPayment(id, request, user);
    }
}
