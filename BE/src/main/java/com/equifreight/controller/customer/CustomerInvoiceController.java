package com.equifreight.controller.customer;

import com.equifreight.entity.User;
import com.equifreight.model.invoice.CardCheckoutResponse;
import com.equifreight.model.invoice.InvoiceResponse;
import com.equifreight.model.invoice.InvoiceSummaryResponse;
import com.equifreight.service.CardPaymentService;
import com.equifreight.service.InvoiceService;
import com.equifreight.service.ReceiptService;
import io.swagger.v3.oas.annotations.Operation;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

/** The club's invoices (US-F6-03): the deposit and the final invoice of each move, under its request. */
@RestController
@PreAuthorize("hasRole('CUSTOMER')")
public class CustomerInvoiceController {

    private final InvoiceService invoices;
    private final CardPaymentService cards;
    private final ReceiptService receipts;

    public CustomerInvoiceController(InvoiceService invoices, CardPaymentService cards, ReceiptService receipts) {
        this.invoices = invoices;
        this.cards = cards;
        this.receipts = receipts;
    }

    @GetMapping("/api/v1/customer/requests/{id}/invoices")
    public List<InvoiceSummaryResponse> ofRequest(@PathVariable UUID id, @AuthenticationPrincipal User user) {
        return invoices.ofRequest(user, id);
    }

    @GetMapping("/api/v1/customer/invoices/{id}")
    public InvoiceResponse get(@PathVariable UUID id, @AuthenticationPrincipal User user) {
        return invoices.ofCustomer(user, id);
    }

    @Operation(summary = "A hosted card payment page for what is due on the invoice; the webhook records the payment")
    @PostMapping("/api/v1/customer/invoices/{id}/card-checkout")
    public CardCheckoutResponse cardCheckout(@PathVariable UUID id, @AuthenticationPrincipal User user) {
        return cards.start(user, id);
    }

    @Operation(summary = "A PDF receipt for one of the club's confirmed payments")
    @GetMapping("/api/v1/customer/payments/{id}/receipt")
    public ResponseEntity<byte[]> receipt(@PathVariable UUID id, @AuthenticationPrincipal User user) {
        return pdf(receipts.ofCustomer(user, id));
    }

    static ResponseEntity<byte[]> pdf(ReceiptService.ReceiptFile file) {
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment()
                                .filename(file.filename())
                                .build()
                                .toString())
                .body(file.content());
    }
}
