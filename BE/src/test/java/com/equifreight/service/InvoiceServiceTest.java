package com.equifreight.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.equifreight.configuration.BusinessTime;
import com.equifreight.entity.Club;
import com.equifreight.entity.Handover;
import com.equifreight.entity.Incident;
import com.equifreight.entity.Invoice;
import com.equifreight.entity.InvoiceLine;
import com.equifreight.entity.JobCharge;
import com.equifreight.entity.Quotation;
import com.equifreight.entity.QuotationLine;
import com.equifreight.entity.TransportJob;
import com.equifreight.entity.TransportRequest;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.CodePrefix;
import com.equifreight.entity.enums.HandoverOutcome;
import com.equifreight.entity.enums.IncidentStatus;
import com.equifreight.entity.enums.InvoiceKind;
import com.equifreight.entity.enums.InvoiceLineKind;
import com.equifreight.entity.enums.InvoiceStatus;
import com.equifreight.entity.enums.LineCertainty;
import com.equifreight.entity.enums.NotificationKind;
import com.equifreight.entity.enums.PaymentMethod;
import com.equifreight.entity.enums.QuotationStatus;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ConflictException;
import com.equifreight.model.invoice.ActualQuantityRequest;
import com.equifreight.model.invoice.InvoiceLineResponse;
import com.equifreight.model.invoice.InvoiceResponse;
import com.equifreight.model.invoice.RecordPaymentRequest;
import com.equifreight.repository.HandoverRepository;
import com.equifreight.repository.IncidentRepository;
import com.equifreight.repository.InvoiceRepository;
import com.equifreight.repository.JobChargeRepository;
import com.equifreight.repository.PaymentRepository;
import com.equifreight.repository.TransportJobRepository;
import com.equifreight.repository.TransportRequestRepository;
import com.equifreight.service.notification.Audience;
import com.equifreight.service.pricing.PricedTotals;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** US-F6-03: deposit and final invoices, with payments recorded by hand. */
class InvoiceServiceTest {

    /** 24 Oct 2026, 10:00 in Ho Chi Minh City. */
    private static final Instant NOW = Instant.parse("2026-10-24T03:00:00Z");

    private final InvoiceRepository invoices = mock(InvoiceRepository.class);
    private final PaymentRepository payments = mock(PaymentRepository.class);
    private final HandoverRepository handovers = mock(HandoverRepository.class);
    private final TransportJobRepository jobs = mock(TransportJobRepository.class);
    private final TransportRequestRepository requests = mock(TransportRequestRepository.class);
    private final JobChargeRepository charges = mock(JobChargeRepository.class);
    private final IncidentRepository incidents = mock(IncidentRepository.class);
    private final QuotationPricing pricing = mock(QuotationPricing.class);
    private final CodeService codes = mock(CodeService.class);
    private final AuditService audit = mock(AuditService.class);
    private final NotificationService notifications = mock(NotificationService.class);
    private InvoiceService service;
    private Club club;
    private Quotation quotation;
    private QuotationLine freight;
    private QuotationLine waiting;
    private TransportJob job;
    private Handover handover;
    private User yen;
    private Invoice deposit;

    private static QuotationLine line(
            String group, int position, String text, String qty, String rate, LineCertainty c) {
        QuotationLine l = new QuotationLine();
        l.setId(UUID.randomUUID());
        l.setGroupCode(group);
        l.setPosition((short) position);
        l.setDescription(text);
        l.setQuantity(new BigDecimal(qty));
        l.setUnitRate(new BigDecimal(rate));
        l.setCatalogAmount(new BigDecimal(qty).multiply(new BigDecimal(rate)));
        l.setCertainty(c);
        return l;
    }

    @BeforeEach
    void setUp() {
        service = new InvoiceService(
                invoices,
                payments,
                handovers,
                jobs,
                requests,
                charges,
                incidents,
                pricing,
                codes,
                mock(ClubService.class),
                audit,
                notifications,
                Clock.fixed(NOW, BusinessTime.ZONE));
        club = new Club();
        club.setId(UUID.randomUUID());
        club.setName("Saigon Turf Club");
        TransportRequest request = new TransportRequest();
        request.setId(UUID.randomUUID());
        request.setCode("REQ-2026-0041");
        request.setClub(club);
        quotation = new Quotation();
        quotation.setId(UUID.randomUUID());
        quotation.setCode("Q-2026-0004");
        quotation.setVersionNo((short) 1);
        quotation.setRequest(request);
        quotation.setCurrency("USD");
        quotation.setStatus(QuotationStatus.ACCEPTED);
        freight = line("A", 1, "Road freight, private trailer", "1", "3000.00", LineCertainty.FIXED);
        waiting = line("D", 1, "Waiting time at the border", "2", "95.00", LineCertainty.ESTIMATED);
        quotation.getLines().addAll(List.of(freight, waiting));
        quotation.setContingency(new BigDecimal("150.00"));
        quotation.setTotal(new BigDecimal("3340.00"));
        quotation.setDepositPct(new BigDecimal("30"));
        quotation.setDepositAmount(new BigDecimal("1002.00"));
        job = new TransportJob();
        job.setId(UUID.randomUUID());
        job.setCode("CBRT-2026-041");
        job.setRequest(request);
        job.setQuotation(quotation);
        handover = new Handover();
        handover.setJob(job);
        handover.setDeliveredAt(NOW.minus(Duration.ofDays(1)));
        handover.setHandedOverAt(NOW.minus(Duration.ofDays(1)));
        handover.setCustomerOutcome(HandoverOutcome.CONFIRMED_SOUND);
        handover.setConfirmedAt(NOW.minus(Duration.ofHours(2)));
        yen = new User();
        yen.setId(UUID.randomUUID());
        yen.setFirstName("Hải Yến");
        yen.setLastName("Vũ");

        AtomicInteger counter = new AtomicInteger(40);
        when(codes.next(CodePrefix.INV, 2026)).thenAnswer(inv -> "INV-2026-00" + counter.incrementAndGet());
        when(invoices.save(any())).thenAnswer(inv -> {
            Invoice i = inv.getArgument(0);
            if (i.getId() == null) i.setId(UUID.randomUUID());
            i.getLines().stream().filter(l -> l.getId() == null).forEach(l -> l.setId(UUID.randomUUID()));
            return i;
        });
        when(invoices.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));
        when(jobs.findById(job.getId())).thenReturn(Optional.of(job));
        when(handovers.findByJob_Id(job.getId())).thenReturn(Optional.of(handover));
        when(charges.findByJob_IdOrderByCreatedAt(job.getId())).thenReturn(List.of());
        when(incidents.findByJob_IdAndStopsClockTrue(job.getId())).thenReturn(List.of());
        when(payments.findByInvoice_IdOrderByReceivedAtAsc(any())).thenReturn(List.of());
        when(invoices.findFirstByQuotation_IdAndKindAndStatusNot(
                        quotation.getId(), InvoiceKind.FINAL, InvoiceStatus.VOID))
                .thenReturn(Optional.empty());
        when(invoices.findFirstByQuotation_IdAndKindAndStatusNot(
                        quotation.getId(), InvoiceKind.DEPOSIT, InvoiceStatus.VOID))
                .thenReturn(Optional.empty());
    }

    /** The deposit as issued at acceptance, then found by the final invoice. */
    private Invoice deposited() {
        deposit = service.issueDeposit(quotation, null);
        when(invoices.findFirstByQuotation_IdAndKindAndStatusNot(
                        quotation.getId(), InvoiceKind.DEPOSIT, InvoiceStatus.VOID))
                .thenReturn(Optional.of(deposit));
        return deposit;
    }

    private InvoiceResponse drafted() {
        deposited();
        InvoiceResponse draft = service.prepareFinal(job.getId(), yen);
        Invoice saved = savedFinal();
        when(invoices.findById(saved.getId())).thenReturn(Optional.of(saved));
        return draft;
    }

    private Invoice savedFinal() {
        org.mockito.ArgumentCaptor<Invoice> saved = org.mockito.ArgumentCaptor.forClass(Invoice.class);
        verify(invoices, org.mockito.Mockito.atLeastOnce()).save(saved.capture());
        return saved.getAllValues().stream()
                .filter(i -> i.getKind() == InvoiceKind.FINAL)
                .reduce((a, b) -> b)
                .orElseThrow();
    }

    private static InvoiceLineResponse lineOf(InvoiceResponse r, InvoiceLineKind kind) {
        return r.lines().stream().filter(l -> l.kind() == kind).findFirst().orElseThrow();
    }

    @Test
    @DisplayName("The deposit invoice is the quotation's deposit %, due in 7 days, and the club is told")
    void theDeposit() {
        Invoice d = deposited();

        assertEquals("INV-2026-0041", d.getCode());
        assertEquals(InvoiceStatus.ISSUED, d.getStatus());
        assertEquals(new BigDecimal("1002.00"), d.getTotal());
        assertEquals(LocalDate.of(2026, 10, 31), d.getDueOn());
        InvoiceLine only = d.getLines().getFirst();
        assertEquals(InvoiceLineKind.DEPOSIT, only.getKind());
        assertEquals("Deposit, 30% of quotation Q-2026-0004 v1", only.getDescription());
        verify(notifications)
                .notify(
                        eq(NotificationKind.INVOICE_ISSUED),
                        eq(Audience.club(club.getId())),
                        any(),
                        eq("Deposit invoice INV-2026-0041"),
                        eq("USD 1,002.00 is due by 31 Oct 2026. Pay by bank transfer with INV-2026-0041 as the"
                                + " reference."));
    }

    @Test
    @DisplayName(
            "The final invoice settles the quotation as quoted, adds the incident costs, then takes off the deposit")
    void theFinalDraft() {
        JobCharge charge = new JobCharge();
        charge.setDescription("Vehicle breakdown: Second trailer from Tây Ninh");
        charge.setAmount(new BigDecimal("1200.00"));
        when(charges.findByJob_IdOrderByCreatedAt(job.getId())).thenReturn(List.of(charge));

        InvoiceResponse draft = drafted();

        assertEquals(InvoiceStatus.DRAFT, draft.status());
        assertEquals(
                List.of(
                        InvoiceLineKind.QUOTED,
                        InvoiceLineKind.QUOTED,
                        InvoiceLineKind.QUOTED,
                        InvoiceLineKind.ADJUSTMENT,
                        InvoiceLineKind.DEPOSIT_DEDUCTION),
                draft.lines().stream().map(InvoiceLineResponse::kind).toList());
        // 3,000 + 190 + 150 contingency + 1,200 incident cost − 1,002 deposit.
        assertEquals(new BigDecimal("3538.00"), draft.total());
        assertTrue(lineOf(draft, InvoiceLineKind.QUOTED).description().startsWith("Road freight"));
        assertTrue(draft.lines().get(1).actualisable());
        assertEquals(
                "Deposit invoiced on INV-2026-0041",
                lineOf(draft, InvoiceLineKind.DEPOSIT_DEDUCTION).description());
    }

    @Test
    @DisplayName("An estimated line takes its actual quantity with a reason, and the totals are worked out again")
    void anActualQuantity() {
        InvoiceResponse draft = drafted();
        UUID waitingLine = draft.lines().get(1).id();
        when(pricing.totalsWith(eq(quotation), any(), eq(Map.of(waiting.getId(), new BigDecimal("285.00")))))
                .thenReturn(new PricedTotals(
                        null,
                        null,
                        BigDecimal.ZERO,
                        BigDecimal.ZERO,
                        BigDecimal.ZERO,
                        BigDecimal.ZERO,
                        new BigDecimal("164.25"),
                        BigDecimal.ZERO,
                        null,
                        List.of()));

        BusinessException noReason = assertThrows(
                BusinessException.class,
                () -> service.setActual(
                        draft.id(), waitingLine, new ActualQuantityRequest(new BigDecimal("3"), " "), yen));
        assertTrue(noReason.getMessage().startsWith("Say why Waiting time at the border differs"));

        InvoiceResponse r = service.setActual(
                draft.id(),
                waitingLine,
                new ActualQuantityRequest(new BigDecimal("3"), "The queue at Mộc Bài took 2 h 40 min"),
                yen);

        InvoiceLineResponse actual = lineOf(r, InvoiceLineKind.ACTUALISED);
        assertEquals(new BigDecimal("285.00"), actual.amount());
        assertEquals("The queue at Mộc Bài took 2 h 40 min", actual.note());
        assertEquals(new BigDecimal("190.00"), actual.quotedAmount());
        InvoiceLineResponse contingency = r.lines().stream()
                .filter(l -> l.description().equals("Contingency"))
                .findFirst()
                .orElseThrow();
        assertEquals(InvoiceLineKind.ACTUALISED, contingency.kind());
        assertEquals(new BigDecimal("164.25"), contingency.amount());
        // 3,000 + 285 + 164.25 − 1,002.
        assertEquals(new BigDecimal("2447.25"), r.total());

        UUID fixedLine = r.lines().getFirst().id();
        assertThrows(
                BusinessException.class,
                () -> service.setActual(r.id(), fixedLine, new ActualQuantityRequest(BigDecimal.ONE, "No"), yen));
    }

    @Test
    @DisplayName("Late past the window, the credit is the quotation's % per started hour, less a stopped clock")
    void theLateArrivalCredit() {
        job.setWindowEnd(NOW.minus(Duration.ofHours(30)));
        handover.setDeliveredAt(NOW.minus(Duration.ofHours(30)).plus(Duration.ofMinutes(130)));
        Incident held = new Incident();
        held.setStopsClock(true);
        held.setClockStoppedFrom(NOW.minus(Duration.ofHours(30)).plus(Duration.ofMinutes(10)));
        held.setClockStoppedUntil(NOW.minus(Duration.ofHours(30)).plus(Duration.ofMinutes(70)));
        when(incidents.findByJob_IdAndStopsClockTrue(job.getId())).thenReturn(List.of(held));

        InvoiceResponse draft = drafted();

        // 130 minutes late, 60 of them on a stopped clock: 70 minutes, 2 started hours × 10% of 3,340.
        InvoiceLineResponse credit = lineOf(draft, InvoiceLineKind.LATE_PENALTY_CREDIT);
        assertEquals(new BigDecimal("-668.00"), credit.amount());
        assertEquals("Late arrival credit: 1 h 10 min after the window closed", credit.description());
        assertEquals(70, handover.getLateMinutes());
        assertEquals(new BigDecimal("668.00"), handover.getPenaltyAmount());
    }

    @Test
    @DisplayName("The final invoice waits for the handover to be settled, and is issued once")
    void whenTheFinalInvoiceCanBeMade() {
        handover.setCustomerOutcome(null);
        assertThrows(BusinessException.class, () -> service.prepareFinal(job.getId(), yen));

        handover.setCustomerOutcome(HandoverOutcome.PROBLEM_REPORTED);
        Incident report = new Incident();
        report.setStatus(IncidentStatus.OPEN);
        handover.setDiscrepancyIncident(report);
        BusinessException open = assertThrows(BusinessException.class, () -> service.prepareFinal(job.getId(), yen));
        assertTrue(open.getMessage().contains("close that incident first"));

        report.setStatus(IncidentStatus.RESOLVED);
        InvoiceResponse draft = drafted();
        InvoiceResponse issued = service.issue(draft.id(), yen);
        assertEquals(InvoiceStatus.ISSUED, issued.status());
        assertEquals(LocalDate.of(2026, 10, 31), issued.dueOn());
        assertEquals("Vũ Hải Yến", issued.issuedByName());

        Invoice finalInvoice = savedFinal();
        when(invoices.findFirstByQuotation_IdAndKindAndStatusNot(
                        quotation.getId(), InvoiceKind.FINAL, InvoiceStatus.VOID))
                .thenReturn(Optional.of(finalInvoice));
        assertThrows(ConflictException.class, () -> service.prepareFinal(job.getId(), yen));
        assertThrows(ConflictException.class, () -> service.issue(draft.id(), yen));
    }

    @Test
    @DisplayName("Payments are recorded by hand: part paid, then paid, never more than is owed or ahead of time")
    void recordingPayments() {
        Invoice d = deposited();
        when(invoices.findById(d.getId())).thenReturn(Optional.of(d));

        InvoiceResponse part = service.recordPayment(
                d.getId(),
                new RecordPaymentRequest(
                        new BigDecimal("500.00"), PaymentMethod.BANK_TRANSFER, "VCB 8841", LocalDate.of(2026, 10, 23)),
                yen);
        assertEquals(InvoiceStatus.PARTIALLY_PAID, part.status());
        assertEquals(new BigDecimal("502.00"), part.amountDue());

        BusinessException tooMuch = assertThrows(
                BusinessException.class,
                () -> service.recordPayment(
                        d.getId(),
                        new RecordPaymentRequest(
                                new BigDecimal("600.00"), PaymentMethod.CARD, null, LocalDate.of(2026, 10, 24)),
                        yen));
        assertEquals(
                "The payment is more than is owed: USD 502.00 is due on INV-2026-0041, USD 600.00 was entered",
                tooMuch.getMessage());
        assertThrows(
                BusinessException.class,
                () -> service.recordPayment(
                        d.getId(),
                        new RecordPaymentRequest(
                                new BigDecimal("1.00"), PaymentMethod.CARD, null, LocalDate.of(2026, 10, 25)),
                        yen));

        InvoiceResponse paid = service.recordPayment(
                d.getId(),
                new RecordPaymentRequest(
                        new BigDecimal("502.00"), PaymentMethod.CARD, null, LocalDate.of(2026, 10, 24)),
                yen);
        assertEquals(InvoiceStatus.PAID, paid.status());
        verify(audit, org.mockito.Mockito.times(2))
                .recordDecision(
                        eq(yen), eq("RECORD_PAYMENT"), anyString(), eq("INVOICE"), any(), any(), any(), any(), any());
        assertThrows(
                BusinessException.class,
                () -> service.recordPayment(
                        d.getId(),
                        new RecordPaymentRequest(
                                new BigDecimal("1.00"), PaymentMethod.CARD, null, LocalDate.of(2026, 10, 24)),
                        yen));
    }

    @Test
    @DisplayName("A quotation keeps its one deposit invoice")
    void oneDeposit() {
        Invoice d = deposited();
        assertEquals(d, service.issueDeposit(quotation, null));
        verify(codes, org.mockito.Mockito.times(1)).next(CodePrefix.INV, 2026);
        verify(pricing, never()).totalsWith(any(), any(), any());
    }
}
