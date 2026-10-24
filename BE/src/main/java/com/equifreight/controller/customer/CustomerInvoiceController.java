package com.equifreight.controller.customer;

import com.equifreight.entity.User;
import com.equifreight.model.invoice.InvoiceResponse;
import com.equifreight.model.invoice.InvoiceSummaryResponse;
import com.equifreight.service.InvoiceService;
import java.util.List;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

/** The club's invoices (US-F6-03): the deposit and the final invoice of each move, under its request. */
@RestController
@PreAuthorize("hasRole('CUSTOMER')")
public class CustomerInvoiceController {

    private final InvoiceService invoices;

    public CustomerInvoiceController(InvoiceService invoices) {
        this.invoices = invoices;
    }

    @GetMapping("/api/v1/customer/requests/{id}/invoices")
    public List<InvoiceSummaryResponse> ofRequest(@PathVariable UUID id, @AuthenticationPrincipal User user) {
        return invoices.ofRequest(user, id);
    }

    @GetMapping("/api/v1/customer/invoices/{id}")
    public InvoiceResponse get(@PathVariable UUID id, @AuthenticationPrincipal User user) {
        return invoices.ofCustomer(user, id);
    }
}
