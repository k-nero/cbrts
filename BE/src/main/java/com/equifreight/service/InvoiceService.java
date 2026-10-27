package com.equifreight.service;

import com.equifreight.configuration.BusinessTime;
import com.equifreight.entity.Club;
import com.equifreight.entity.Handover;
import com.equifreight.entity.Invoice;
import com.equifreight.entity.InvoiceLine;
import com.equifreight.entity.JobCharge;
import com.equifreight.entity.Payment;
import com.equifreight.entity.Quotation;
import com.equifreight.entity.QuotationLine;
import com.equifreight.entity.TransportJob;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.CodePrefix;
import com.equifreight.entity.enums.HandoverOutcome;
import com.equifreight.entity.enums.IncidentStatus;
import com.equifreight.entity.enums.InvoiceKind;
import com.equifreight.entity.enums.InvoiceLineKind;
import com.equifreight.entity.enums.InvoiceStatus;
import com.equifreight.entity.enums.NotificationKind;
import com.equifreight.entity.enums.PaymentStatus;
import com.equifreight.entity.enums.QuotationStatus;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ConflictException;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.model.invoice.ActualQuantityRequest;
import com.equifreight.model.invoice.InvoiceMapper;
import com.equifreight.model.invoice.InvoiceResponse;
import com.equifreight.model.invoice.InvoiceSummaryResponse;
import com.equifreight.model.invoice.InvoiceView;
import com.equifreight.model.invoice.ReadyForInvoiceResponse;
import com.equifreight.model.invoice.RecordPaymentRequest;
import com.equifreight.repository.HandoverRepository;
import com.equifreight.repository.IncidentRepository;
import com.equifreight.repository.InvoiceRepository;
import com.equifreight.repository.JobChargeRepository;
import com.equifreight.repository.PaymentRepository;
import com.equifreight.repository.TransportJobRepository;
import com.equifreight.repository.TransportRequestRepository;
import com.equifreight.service.notification.Audience;
import com.equifreight.service.notification.Subject;
import com.equifreight.service.pricing.PricedTotals;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import lombok.extern.log4j.Log4j2;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Invoices and payments (US-F6-03, docs/handover-design.md). Two invoices per job, both generated, never typed: the
 * deposit when the customer accepts the quotation, and the final invoice once the handover is settled, which settles
 * the accepted quotation against what happened. An issued invoice is never edited. Payments are recorded by hand.
 */
@Log4j2
@Service
public class InvoiceService {

    static final String ENTITY_TYPE = "INVOICE";
    /** Every invoice is due 7 days after it is issued (database-design.md, 13A). */
    static final int DUE_DAYS = 7;
    /** Until the rates are confirmed on the quotation: 10% per started hour late, up to 30% (PRODUCT.md). */
    static final BigDecimal DEFAULT_PENALTY_PCT_PER_HOUR = BigDecimal.TEN;

    static final BigDecimal DEFAULT_PENALTY_CAP_PCT = new BigDecimal("30");
    private static final BigDecimal HUNDRED = new BigDecimal("100");
    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("d MMM yyyy", Locale.ENGLISH);
    private static final EnumSet<InvoiceStatus> UNPAID = EnumSet.of(InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID);

    private final InvoiceRepository invoices;
    private final PaymentRepository payments;
    private final HandoverRepository handovers;
    private final TransportJobRepository jobs;
    private final TransportRequestRepository requests;
    private final JobChargeRepository charges;
    private final IncidentRepository incidents;
    private final QuotationPricing pricing;
    private final CodeService codes;
    private final ClubService clubs;
    private final AuditService audit;
    private final NotificationService notifications;
    private final Clock clock;

    public InvoiceService(
            InvoiceRepository invoices,
            PaymentRepository payments,
            HandoverRepository handovers,
            TransportJobRepository jobs,
            TransportRequestRepository requests,
            JobChargeRepository charges,
            IncidentRepository incidents,
            QuotationPricing pricing,
            CodeService codes,
            ClubService clubs,
            AuditService audit,
            NotificationService notifications,
            Clock clock) {
        this.invoices = invoices;
        this.payments = payments;
        this.handovers = handovers;
        this.jobs = jobs;
        this.requests = requests;
        this.charges = charges;
        this.incidents = incidents;
        this.pricing = pricing;
        this.codes = codes;
        this.clubs = clubs;
        this.audit = audit;
        this.notifications = notifications;
        this.clock = clock;
    }

    // ---------- the deposit ----------

    /**
     * The deposit invoice, issued as the customer accepts {@code quotation}: one line, the quotation's deposit % of its
     * total, due in 7 days. A quotation already carrying one keeps it.
     */
    @Transactional
    public Invoice issueDeposit(Quotation quotation, User acceptedBy) {
        var existing = invoices.findFirstByQuotation_IdAndKindAndStatusNot(
                quotation.getId(), InvoiceKind.DEPOSIT, InvoiceStatus.VOID);
        if (existing.isPresent()) return existing.get();
        Invoice invoice = newInvoice(
                InvoiceKind.DEPOSIT, quotation, null, quotation.getRequest().getClub());
        BigDecimal pct = quotation.getDepositPct() == null ? BigDecimal.ZERO : quotation.getDepositPct();
        InvoiceLine line = line(
                invoice,
                InvoiceLineKind.DEPOSIT,
                "Deposit, " + pct.stripTrailingZeros().toPlainString() + "% of quotation " + quotation.getCode() + " v"
                        + quotation.getVersionNo(),
                quotation.getDepositAmount() == null ? BigDecimal.ZERO : quotation.getDepositAmount());
        invoice.getLines().add(line);
        totalUp(invoice);
        return issueNow(invoice, null, acceptedBy);
    }

    // ---------- the final invoice ----------

    /** Jobs whose handover is settled and that have no final invoice yet, the longest waiting first. */
    @Transactional(readOnly = true)
    public List<ReadyForInvoiceResponse> readyForFinal() {
        return handovers.findReadyForFinalInvoice().stream()
                .map(h -> ReadyForInvoiceResponse.builder()
                        .jobId(h.getJob().getId())
                        .jobCode(h.getJob().getCode())
                        .clubName(h.getJob().getRequest().getClub().getName())
                        .outcome(h.getCustomerOutcome())
                        .acceptedByDefault(h.isAcceptedByDefault())
                        .answeredAt(h.getConfirmedAt())
                        .build())
                .toList();
    }

    /**
     * The job's final invoice as a draft (US-F6-03), once the handover is settled: accepted, taken as accepted, or a
     * discrepancy whose incident is resolved. It holds the accepted quotation's lines, the estimated ones at their
     * quoted quantity until the manager sets what happened, the totals worked out again in the quotation's order, the
     * costs approved on incidents, the late-arrival credit, and the deposit deducted. An existing draft is returned.
     */
    @Transactional
    public InvoiceResponse prepareFinal(UUID jobId, User manager) {
        TransportJob job = jobs.findById(jobId).orElseThrow(() -> ResourceNotFoundException.of("Job", jobId));
        Quotation quotation = job.getQuotation();
        if (quotation == null || quotation.getStatus() != QuotationStatus.ACCEPTED) {
            throw new BusinessException(job.getCode() + " has no accepted quotation to invoice against");
        }
        var existing = invoices.findFirstByQuotation_IdAndKindAndStatusNot(
                quotation.getId(), InvoiceKind.FINAL, InvoiceStatus.VOID);
        if (existing.isPresent()) {
            if (existing.get().getStatus() == InvoiceStatus.DRAFT) return view(existing.get());
            throw new ConflictException(
                    "FINAL_INVOICE_ISSUED",
                    job.getCode() + "'s final invoice " + existing.get().getCode() + " is already issued");
        }
        Handover handover = handovers
                .findByJob_Id(job.getId())
                .filter(h -> h.getHandedOverAt() != null)
                .orElseThrow(() -> new BusinessException(
                        job.getCode() + " hasn't been handed over yet: the final invoice follows the handover"));
        requireSettled(job, handover);
        Invoice invoice =
                newInvoice(InvoiceKind.FINAL, quotation, job, job.getRequest().getClub());
        build(invoice, handover, Map.of());
        Invoice saved = invoices.save(invoice);
        audit.recordDecision(
                manager,
                "PREPARE_FINAL_INVOICE",
                AuditText.fit("Final invoice " + saved.getCode() + " drafted for " + job.getCode() + ": "
                        + money(quotation.getCurrency(), saved.getTotal())),
                ENTITY_TYPE,
                saved.getId(),
                saved.getCode(),
                null,
                null,
                InvoiceStatus.DRAFT.name());
        return view(saved);
    }

    /**
     * Sets an estimated line's actual quantity on a draft final invoice: the line, and the totals worked out from it,
     * follow. A quantity that differs from the quotation needs the reason, which the customer reads.
     */
    @Transactional
    public InvoiceResponse setActual(UUID invoiceId, UUID lineId, ActualQuantityRequest request, User manager) {
        Invoice invoice = invoice(invoiceId);
        if (invoice.getStatus() != InvoiceStatus.DRAFT) {
            throw new BusinessException(
                    "Invoice " + invoice.getCode() + " is issued: an issued invoice is never edited");
        }
        InvoiceLine line = invoice.getLines().stream()
                .filter(l -> l.getId().equals(lineId))
                .findFirst()
                .orElseThrow(() -> ResourceNotFoundException.of("Invoice line", lineId));
        QuotationLine quoted = line.getQuotationLine();
        if (!InvoiceMapper.actualisable(quoted)) {
            throw new BusinessException("\"" + line.getDescription()
                    + "\" was quoted as fixed: only estimated lines take what actually happened");
        }
        String note = request.note() == null || request.note().isBlank()
                ? null
                : request.note().strip();
        boolean changed = request.quantity().compareTo(quoted.getQuantity()) != 0;
        if (changed && note == null) {
            throw new BusinessException("Say why " + line.getDescription() + " differs from the quotation's "
                    + quoted.getQuantity().stripTrailingZeros().toPlainString() + "; the customer reads it");
        }
        Map<UUID, Actual> actuals = actualsOf(invoice);
        if (changed) actuals.put(quoted.getId(), new Actual(request.quantity(), note));
        else actuals.remove(quoted.getId());
        Handover handover = handovers.findByJob_Id(invoice.getJob().getId()).orElseThrow();
        invoice.getLines().clear();
        invoices.saveAndFlush(invoice);
        build(invoice, handover, actuals);
        Invoice saved = invoices.save(invoice);
        audit.recordDecision(
                manager,
                "SET_INVOICE_ACTUAL",
                AuditText.fit(line.getDescription() + " on " + saved.getCode() + ": "
                        + request.quantity().stripTrailingZeros().toPlainString() + " actual, "
                        + quoted.getQuantity().stripTrailingZeros().toPlainString() + " quoted"),
                ENTITY_TYPE,
                saved.getId(),
                saved.getCode(),
                note,
                null,
                null);
        return view(saved);
    }

    /** Issues a draft final invoice: it is due in 7 days, the club is told, and it is never edited again. */
    @Transactional
    public InvoiceResponse issue(UUID invoiceId, User manager) {
        Invoice invoice = invoice(invoiceId);
        if (invoice.getStatus() != InvoiceStatus.DRAFT) {
            throw new ConflictException("INVOICE_ISSUED", "Invoice " + invoice.getCode() + " is already issued");
        }
        Handover handover = handovers.findByJob_Id(invoice.getJob().getId()).orElseThrow();
        requireSettled(invoice.getJob(), handover);
        return view(issueNow(invoice, manager, manager));
    }

    // ---------- payments ----------

    /**
     * A payment received by bank transfer or card, recorded by hand (no gateway): it is never edited, and the invoice
     * becomes partly paid or paid in the same transaction. It can't exceed what is still owed or be dated ahead.
     */
    @Transactional
    public InvoiceResponse recordPayment(UUID invoiceId, RecordPaymentRequest request, User manager) {
        Invoice invoice = invoice(invoiceId);
        if (!UNPAID.contains(invoice.getStatus())) {
            throw new BusinessException("Invoice " + invoice.getCode() + " is "
                    + invoice.getStatus().name().toLowerCase(Locale.ROOT).replace('_', ' ')
                    + ": payments are recorded against an issued invoice that is still owed");
        }
        String currency = invoice.getQuotation().getCurrency();
        BigDecimal due = InvoiceMapper.amountDue(invoice);
        if (request.amount().compareTo(due) > 0) {
            throw new BusinessException("The payment is more than is owed: " + money(currency, due) + " is due on "
                    + invoice.getCode() + ", " + money(currency, request.amount()) + " was entered");
        }
        LocalDate today = today();
        if (request.receivedOn().isAfter(today)) {
            throw new BusinessException(
                    "A payment is recorded once received; " + DAY.format(request.receivedOn()) + " hasn't come yet");
        }
        Payment payment = new Payment();
        payment.setInvoice(invoice);
        payment.setAmount(request.amount());
        payment.setMethod(request.method());
        payment.setReference(
                request.reference() == null || request.reference().isBlank()
                        ? null
                        : request.reference().strip());
        payment.setReceivedAt(
                request.receivedOn().atStartOfDay(BusinessTime.ZONE).toInstant());
        payment.setRecordedBy(manager);
        payment.setStatus(PaymentStatus.CONFIRMED);
        payments.save(payment);
        invoice.setAmountPaid(invoice.getAmountPaid().add(request.amount()));
        invoice.setStatus(
                invoice.getAmountPaid().compareTo(invoice.getTotal()) >= 0
                        ? InvoiceStatus.PAID
                        : InvoiceStatus.PARTIALLY_PAID);
        Invoice saved = invoices.save(invoice);
        audit.recordDecision(
                manager,
                "RECORD_PAYMENT",
                AuditText.fit(money(currency, request.amount()) + " by "
                        + request.method().name().toLowerCase(Locale.ROOT).replace('_', ' ') + " on "
                        + saved.getCode() + (payment.getReference() == null ? "" : ", ref " + payment.getReference())
                        + "; "
                        + (saved.getStatus() == InvoiceStatus.PAID
                                ? "paid in full"
                                : money(currency, InvoiceMapper.amountDue(saved)) + " still due")),
                ENTITY_TYPE,
                saved.getId(),
                saved.getCode(),
                null,
                null,
                saved.getStatus().name());
        notifications.notify(
                NotificationKind.PAYMENT_RECORDED,
                Audience.club(saved.getClub().getId()),
                Subject.invoice(saved),
                "Payment received for " + saved.getCode(),
                money(currency, request.amount()) + " received on " + DAY.format(request.receivedOn()) + ". "
                        + (saved.getStatus() == InvoiceStatus.PAID
                                ? "The invoice is paid in full."
                                : money(currency, InvoiceMapper.amountDue(saved)) + " is still due by "
                                        + DAY.format(saved.getDueOn()) + "."));
        return view(saved);
    }

    // ---------- reading ----------

    /** The Invoices list: overdue and soonest due first. Drafts show under All only. */
    @Transactional(readOnly = true)
    public Page<InvoiceSummaryResponse> list(InvoiceView view, Pageable pageable) {
        LocalDate today = today();
        Page<Invoice> page = switch (view == null ? InvoiceView.ALL : view) {
            case ALL -> invoices.findByStatusIn(EnumSet.allOf(InvoiceStatus.class), pageable);
            case TO_BE_PAID -> invoices.findByStatusIn(UNPAID, pageable);
            case OVERDUE -> invoices.findByStatusInAndDueOnBefore(UNPAID, today, pageable);
            case PAID -> invoices.findByStatusIn(EnumSet.of(InvoiceStatus.PAID), pageable);
        };
        return page.map(i -> InvoiceMapper.toSummary(i, today));
    }

    @Transactional(readOnly = true)
    public InvoiceResponse get(UUID id) {
        return view(invoice(id));
    }

    /**
     * A request's invoices on the staff side (Request review): the deposit issued at acceptance and any later invoice
     * of its job, drafts and voids included.
     */
    @Transactional(readOnly = true)
    public List<InvoiceSummaryResponse> forRequest(UUID requestId) {
        if (!requests.existsById(requestId)) throw ResourceNotFoundException.of("Request", requestId);
        LocalDate today = today();
        return invoices.findByQuotation_Request_IdOrderByCreatedAtAsc(requestId).stream()
                .map(i -> InvoiceMapper.toSummary(i, today))
                .toList();
    }

    /** A request's invoices on the customer's side: issued ones only, of their own club. */
    @Transactional(readOnly = true)
    public List<InvoiceSummaryResponse> ofRequest(User customer, UUID requestId) {
        Club club = clubs.requireClub(customer);
        requests.findByIdAndClubId(requestId, club.getId())
                .orElseThrow(() -> ResourceNotFoundException.of("Request", requestId));
        LocalDate today = today();
        return invoices
                .findByQuotation_Request_IdAndStatusNotOrderByCreatedAtAsc(requestId, InvoiceStatus.DRAFT)
                .stream()
                .map(i -> InvoiceMapper.toSummary(i, today))
                .toList();
    }

    /** One of the club's issued invoices; anyone else's, or a draft, is not found. */
    @Transactional(readOnly = true)
    public InvoiceResponse ofCustomer(User customer, UUID invoiceId) {
        Club club = clubs.requireClub(customer);
        Invoice invoice = invoices.findById(invoiceId)
                .filter(i -> i.getClub().getId().equals(club.getId()) && i.getStatus() != InvoiceStatus.DRAFT)
                .orElseThrow(() -> ResourceNotFoundException.of("Invoice", invoiceId));
        return view(invoice);
    }

    // ---------- building ----------

    /** An estimated line's actual quantity and why it differs. */
    record Actual(BigDecimal quantity, String note) {}

    private Map<UUID, Actual> actualsOf(Invoice invoice) {
        Map<UUID, Actual> actuals = new HashMap<>();
        invoice.getLines().stream()
                .filter(l -> l.getKind() == InvoiceLineKind.ACTUALISED && l.getQuotationLine() != null)
                .forEach(l -> actuals.put(l.getQuotationLine().getId(), new Actual(l.getQuantity(), l.getNote())));
        return actuals;
    }

    /** The final invoice's lines, in order, from the quotation, the actual quantities and what happened. */
    void build(Invoice invoice, Handover handover, Map<UUID, Actual> actuals) {
        Quotation q = invoice.getQuotation();
        TransportJob job = invoice.getJob();
        Map<UUID, BigDecimal> amounts = new HashMap<>();
        for (QuotationLine ql : q.getLines().stream()
                .sorted(Comparator.comparing(QuotationLine::getGroupCode).thenComparing(QuotationLine::getPosition))
                .toList()) {
            Actual actual = actuals.get(ql.getId());
            InvoiceLine line;
            if (actual != null && InvoiceMapper.actualisable(ql)) {
                BigDecimal amount = actual.quantity().multiply(ql.getUnitRate()).setScale(2, RoundingMode.HALF_UP);
                amounts.put(ql.getId(), amount);
                line = line(invoice, InvoiceLineKind.ACTUALISED, ql.getDescription(), amount);
                line.setQuantity(actual.quantity());
                line.setNote(actual.note());
            } else {
                line = line(invoice, InvoiceLineKind.QUOTED, ql.getDescription(), quotedAmount(ql));
                line.setQuantity(ql.getQuantity());
            }
            line.setUnitRate(ql.getUnitRate());
            line.setQuotationLine(ql);
            invoice.getLines().add(line);
        }
        // The rows worked out from the lines follow the quotation's fixed order on the actual amounts.
        PricedTotals totals = amounts.isEmpty() ? null : pricing.totalsWith(q, job.getRequest(), amounts);
        // The volume break is stored as the discount it takes off (QuotePricer); on the invoice it is a negative line.
        addTotalRow(
                invoice,
                "Volume break",
                negate(q.getVolumeBreak()),
                totals == null ? null : negate(totals.volumeBreak()));
        addTotalRow(
                invoice,
                "Arrival window",
                q.getArrivalWindowSurcharge(),
                totals == null ? null : totals.arrivalWindow());
        addTotalRow(invoice, "Fuel surcharge", q.getFuel(), totals == null ? null : totals.fuel());
        addTotalRow(invoice, "Transit insurance", q.getInsurance(), totals == null ? null : totals.insurance());
        addTotalRow(invoice, "Contingency", q.getContingency(), totals == null ? null : totals.contingency());
        addTotalRow(invoice, "Service fee", q.getServiceFee(), totals == null ? null : totals.serviceFee());
        // Costs approved on the job's incidents that the customer pays (US-F5-03).
        for (JobCharge charge : charges.findByJob_IdOrderByCreatedAt(job.getId())) {
            InvoiceLine line = line(invoice, InvoiceLineKind.ADJUSTMENT, charge.getDescription(), charge.getAmount());
            line.setNote(charge.getDescription());
            invoice.getLines().add(line);
        }
        // The late-arrival credit, when there is a window and the horses were late (PRODUCT.md).
        BigDecimal penalty = latePenalty(job, q, handover);
        if (penalty.signum() > 0) {
            InvoiceLine line = line(
                    invoice,
                    InvoiceLineKind.LATE_PENALTY_CREDIT,
                    "Late arrival credit: " + IncidentService.duration(handover.getLateMinutes())
                            + " after the window closed",
                    penalty.negate());
            line.setNote(penaltyBasis(q, handover.getLateMinutes()));
            invoice.getLines().add(line);
        }
        invoices.findFirstByQuotation_IdAndKindAndStatusNot(q.getId(), InvoiceKind.DEPOSIT, InvoiceStatus.VOID)
                .ifPresent(deposit -> invoice.getLines()
                        .add(line(
                                invoice,
                                InvoiceLineKind.DEPOSIT_DEDUCTION,
                                "Deposit invoiced on " + deposit.getCode(),
                                deposit.getTotal().negate())));
        totalUp(invoice);
    }

    private static BigDecimal negate(BigDecimal amount) {
        return amount == null ? null : amount.negate();
    }

    private static BigDecimal quotedAmount(QuotationLine ql) {
        BigDecimal amount = ql.getOverrideAmount() != null ? ql.getOverrideAmount() : ql.getCatalogAmount();
        return amount == null ? BigDecimal.ZERO : amount;
    }

    /** A total row of the quotation, as quoted, or worked out again when an actual quantity moved it. */
    private void addTotalRow(Invoice invoice, String label, BigDecimal quoted, BigDecimal actual) {
        BigDecimal amount = actual == null ? quoted : actual;
        if (amount == null || amount.signum() == 0) return;
        boolean moved = actual != null && quoted != null && actual.compareTo(quoted) != 0;
        InvoiceLine line = line(invoice, moved ? InvoiceLineKind.ACTUALISED : InvoiceLineKind.QUOTED, label, amount);
        if (moved) {
            line.setNote("Worked out again on the actual quantities; quoted "
                    + money(invoice.getQuotation().getCurrency(), quoted));
        }
        invoice.getLines().add(line);
    }

    /**
     * The late-arrival credit (PRODUCT.md, arrival window): with a window, the minutes the horses were delivered after
     * it closed, less the minutes an incident stopped the clock; then the quotation's % per started hour, capped, of
     * its total. The minutes and the amount are kept on the handover.
     */
    BigDecimal latePenalty(TransportJob job, Quotation q, Handover handover) {
        Instant delivered = handover.getDeliveredAt() != null ? handover.getDeliveredAt() : job.getDeliveredAt();
        Integer late = LateArrival.minutes(
                job.getWindowEnd(), delivered, incidents.findByJob_IdAndStopsClockTrue(job.getId()));
        handover.setLateMinutes(late);
        if (late == null || late == 0) {
            handover.setPenaltyAmount(late == null ? null : BigDecimal.ZERO);
            return BigDecimal.ZERO;
        }
        long hours = (late + 59) / 60;
        BigDecimal pct = perHour(q).multiply(BigDecimal.valueOf(hours)).min(cap(q));
        BigDecimal amount = q.getTotal().multiply(pct).divide(HUNDRED, 2, RoundingMode.HALF_UP);
        handover.setPenaltyAmount(amount);
        handovers.save(handover);
        return amount;
    }

    private static BigDecimal perHour(Quotation q) {
        return q.getLatePenaltyPctPerHour() == null ? DEFAULT_PENALTY_PCT_PER_HOUR : q.getLatePenaltyPctPerHour();
    }

    private static BigDecimal cap(Quotation q) {
        return q.getLatePenaltyCapPct() == null ? DEFAULT_PENALTY_CAP_PCT : q.getLatePenaltyCapPct();
    }

    private static String penaltyBasis(Quotation q, int lateMinutes) {
        long hours = (lateMinutes + 59) / 60;
        return hours + " started " + (hours == 1 ? "hour" : "hours") + " × "
                + perHour(q).stripTrailingZeros().toPlainString() + "% of the quotation total, at most "
                + cap(q).stripTrailingZeros().toPlainString() + "%";
    }

    // ---------- shared ----------

    /** A discrepancy waits for its incident to be resolved; then the job can be invoiced. */
    private void requireSettled(TransportJob job, Handover handover) {
        if (handover.getCustomerOutcome() == null) {
            throw new BusinessException(
                    job.getCode() + "'s handover waits for the customer's answer; the final invoice follows it");
        }
        if (handover.getCustomerOutcome() == HandoverOutcome.PROBLEM_REPORTED
                && handover.getDiscrepancyIncident() != null
                && handover.getDiscrepancyIncident().getStatus() != IncidentStatus.RESOLVED) {
            throw new BusinessException("The customer reported a problem with the handover of " + job.getCode()
                    + ": close that incident first, then the final invoice follows");
        }
    }

    private Invoice newInvoice(InvoiceKind kind, Quotation quotation, TransportJob job, Club club) {
        Invoice invoice = new Invoice();
        invoice.setCode(codes.next(CodePrefix.INV, today().getYear()));
        invoice.setKind(kind);
        invoice.setQuotation(quotation);
        invoice.setJob(job);
        invoice.setClub(club);
        invoice.setStatus(InvoiceStatus.DRAFT);
        return invoice;
    }

    private static InvoiceLine line(Invoice invoice, InvoiceLineKind kind, String description, BigDecimal amount) {
        InvoiceLine line = new InvoiceLine();
        line.setInvoice(invoice);
        line.setPosition((short) (invoice.getLines().size() + 1));
        line.setKind(kind);
        line.setDescription(description.length() > 160 ? description.substring(0, 157) + "..." : description);
        line.setAmount(amount);
        return line;
    }

    private static void totalUp(Invoice invoice) {
        BigDecimal subtotal = invoice.getLines().stream()
                .map(InvoiceLine::getAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        invoice.setSubtotal(subtotal);
        invoice.setTaxPct(BigDecimal.ZERO);
        invoice.setTaxAmount(BigDecimal.ZERO);
        invoice.setTotal(subtotal);
    }

    /** Issues the invoice now: due in 7 days, and nothing to pay when the deposit already covers it. */
    private Invoice issueNow(Invoice invoice, User issuedBy, User actor) {
        Instant now = clock.instant();
        invoice.setIssuedBy(issuedBy);
        invoice.setIssuedAt(now);
        invoice.setDueOn(today().plusDays(DUE_DAYS));
        invoice.setStatus(invoice.getTotal().signum() > 0 ? InvoiceStatus.ISSUED : InvoiceStatus.PAID);
        Invoice saved = invoices.save(invoice);
        String currency = saved.getQuotation().getCurrency();
        String what = saved.getKind() == InvoiceKind.DEPOSIT ? "Deposit invoice" : "Final invoice";
        audit.recordDecision(
                actor,
                "ISSUE_INVOICE",
                AuditText.fit(what + " " + saved.getCode() + " issued: " + money(currency, saved.getTotal()) + ", due "
                        + DAY.format(saved.getDueOn())),
                ENTITY_TYPE,
                saved.getId(),
                saved.getCode(),
                null,
                InvoiceStatus.DRAFT.name(),
                saved.getStatus().name());
        notifications.notify(
                NotificationKind.INVOICE_ISSUED,
                Audience.club(saved.getClub().getId()),
                Subject.invoice(saved),
                what + " " + saved.getCode(),
                saved.getStatus() == InvoiceStatus.PAID
                        ? "Nothing more to pay: the deposit already covers it."
                        : money(currency, saved.getTotal()) + " is due by " + DAY.format(saved.getDueOn())
                                + ". Pay by bank transfer with " + saved.getCode() + " as the reference.");
        log.info("{} {} issued", what, saved.getCode());
        return saved;
    }

    private InvoiceResponse view(Invoice invoice) {
        List<Payment> paid =
                invoice.getId() == null ? List.of() : payments.findByInvoice_IdOrderByReceivedAtAsc(invoice.getId());
        return InvoiceMapper.toResponse(invoice, new ArrayList<>(paid), today());
    }

    private Invoice invoice(UUID id) {
        return invoices.findById(id).orElseThrow(() -> ResourceNotFoundException.of("Invoice", id));
    }

    private LocalDate today() {
        return LocalDate.now(clock.withZone(BusinessTime.ZONE));
    }

    static String money(String currency, BigDecimal amount) {
        return (currency == null ? "USD" : currency) + " " + String.format(Locale.ENGLISH, "%,.2f", amount);
    }
}
