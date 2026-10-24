package com.equifreight.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.equifreight.configuration.BusinessTime;
import com.equifreight.entity.Club;
import com.equifreight.entity.Corridor;
import com.equifreight.entity.Incident;
import com.equifreight.entity.IncidentOption;
import com.equifreight.entity.Invoice;
import com.equifreight.entity.InvoiceLine;
import com.equifreight.entity.Quotation;
import com.equifreight.entity.QuotationLine;
import com.equifreight.entity.TransportJob;
import com.equifreight.entity.TransportRequest;
import com.equifreight.entity.enums.InvoiceKind;
import com.equifreight.entity.enums.InvoiceLineKind;
import com.equifreight.entity.enums.InvoiceStatus;
import com.equifreight.entity.enums.TransportMode;
import com.equifreight.exception.BusinessException;
import com.equifreight.model.report.RevenueReportResponse;
import com.equifreight.repository.CorridorRepository;
import com.equifreight.repository.IncidentRepository;
import com.equifreight.repository.InvoiceRepository;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

/** US-R-02: revenue and operating cost by period and corridor. */
class RevenueReportServiceTest {

    /** 25 Oct 2026 in Ho Chi Minh City. */
    private static final Instant NOW = Instant.parse("2026-10-25T03:00:00Z");

    private final InvoiceRepository invoices = mock(InvoiceRepository.class);
    private final IncidentRepository incidents = mock(IncidentRepository.class);
    private final CorridorRepository corridors = mock(CorridorRepository.class);
    private RevenueReportService service;
    private Corridor road;

    @BeforeEach
    void setUp() {
        service = new RevenueReportService(invoices, incidents, corridors, Clock.fixed(NOW, BusinessTime.ZONE));
        road = new Corridor();
        road.setId(UUID.randomUUID());
        road.setOriginCity("Ho Chi Minh City");
        road.setDestinationCity("Phnom Penh");
        road.setMode(TransportMode.ROAD);
        when(corridors.findAllByOrderByCodeAsc()).thenReturn(List.of(road));
        when(invoices.findByQuotation_IdInAndKindAndStatusNot(any(), any(), any()))
                .thenReturn(List.of());
        when(incidents.findDecidedForJobs(any())).thenReturn(List.of());
    }

    private static InvoiceLine line(InvoiceLineKind kind, String amount, boolean settlesQuotation) {
        InvoiceLine l = new InvoiceLine();
        l.setKind(kind);
        l.setAmount(new BigDecimal(amount));
        if (settlesQuotation) l.setQuotationLine(new QuotationLine());
        return l;
    }

    /** A settled job: its final invoice, issued at {@code issued}, on {@code corridor}. */
    private Invoice finalInvoice(
            String jobCode, Corridor corridor, Instant issued, String total, InvoiceLine... lines) {
        Club club = new Club();
        club.setName("Saigon Turf Club");
        TransportRequest request = new TransportRequest();
        request.setCorridor(corridor);
        TransportJob job = new TransportJob();
        job.setId(UUID.randomUUID());
        job.setCode(jobCode);
        job.setRequest(request);
        Quotation q = new Quotation();
        q.setId(UUID.randomUUID());
        Invoice i = new Invoice();
        i.setCode("INV-2026-00" + jobCode.substring(jobCode.length() - 2));
        i.setKind(InvoiceKind.FINAL);
        i.setStatus(InvoiceStatus.ISSUED);
        i.setJob(job);
        i.setClub(club);
        i.setQuotation(q);
        i.setIssuedAt(issued);
        i.setTotal(new BigDecimal(total));
        i.getLines().addAll(List.of(lines));
        return i;
    }

    @Test
    @DisplayName("Revenue is the deposit and the final invoice; cost the settled lines and the incidents")
    void revenueAndCostOfAJob() {
        Invoice fin = finalInvoice(
                "CBRT-2026-041",
                road,
                Instant.parse("2026-10-10T03:00:00Z"),
                "6575.79",
                line(InvoiceLineKind.QUOTED, "9799.00", true),
                line(InvoiceLineKind.ACTUALISED, "285.00", true),
                line(InvoiceLineKind.QUOTED, "-134.40", false),
                line(InvoiceLineKind.ACTUALISED, "1787.21", false),
                line(InvoiceLineKind.LATE_PENALTY_CREDIT, "-2366.02", false),
                line(InvoiceLineKind.DEPOSIT_DEDUCTION, "-3000.00", false));
        Invoice deposit = new Invoice();
        deposit.setQuotation(fin.getQuotation());
        deposit.setTotal(new BigDecimal("3000.00"));
        when(invoices.findFinalIssuedBetween(any(), any(), isNull())).thenReturn(List.of(fin));
        when(invoices.findByQuotation_IdInAndKindAndStatusNot(any(), eq(InvoiceKind.DEPOSIT), eq(InvoiceStatus.VOID)))
                .thenReturn(List.of(deposit));
        Incident decided = new Incident();
        decided.setJob(fin.getJob());
        IncidentOption option = new IncidentOption();
        option.setExtraCost(new BigDecimal("1200.00"));
        decided.setDecidedOption(option);
        when(incidents.findDecidedForJobs(List.of(fin.getJob().getId()))).thenReturn(List.of(decided));

        RevenueReportResponse r = service.report(null, null, null);

        RevenueReportResponse.JobRow row = r.jobs().getFirst();
        assertEquals(new BigDecimal("9575.79"), row.revenue());
        assertEquals(new BigDecimal("10084.00"), row.lineCost());
        assertEquals(new BigDecimal("1200.00"), row.incidentCost());
        assertEquals(new BigDecimal("11284.00"), row.cost());
        assertEquals(new BigDecimal("-1708.21"), row.margin());
        assertEquals("2026-10", row.month());
        assertEquals("Ho Chi Minh City → Phnom Penh · road", row.corridor());
        assertEquals(new BigDecimal("-17.8"), r.totals().marginPct());
    }

    @Test
    @DisplayName("The default period is the last six months, each listed, empty ones included")
    void theDefaultPeriod() {
        when(invoices.findFinalIssuedBetween(any(), any(), isNull())).thenReturn(List.of());

        RevenueReportResponse r = service.report(null, null, null);

        assertEquals("2026-05", r.from());
        assertEquals("2026-10", r.to());
        assertEquals(
                List.of("2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"),
                r.months().stream().map(RevenueReportResponse.Month::month).toList());
        assertEquals(BigDecimal.ZERO, r.totals().revenue());
        assertEquals(null, r.totals().marginPct());
        ArgumentCaptor<Instant> from = ArgumentCaptor.forClass(Instant.class);
        ArgumentCaptor<Instant> to = ArgumentCaptor.forClass(Instant.class);
        verify(invoices).findFinalIssuedBetween(from.capture(), to.capture(), isNull());
        // Months begin at midnight in Ho Chi Minh City, 17:00 UTC the day before.
        assertEquals(Instant.parse("2026-04-30T17:00:00Z"), from.getValue());
        assertEquals(Instant.parse("2026-10-31T17:00:00Z"), to.getValue());
    }

    @Test
    @DisplayName("Jobs fall in the month and corridor of their final invoice, most revenue first")
    void byMonthAndCorridor() {
        Corridor air = new Corridor();
        air.setId(UUID.randomUUID());
        air.setOriginCity("Ho Chi Minh City");
        air.setDestinationCity("Hong Kong");
        air.setMode(TransportMode.AIR);
        when(invoices.findFinalIssuedBetween(any(), any(), isNull()))
                .thenReturn(List.of(
                        finalInvoice(
                                "CBRT-2026-031",
                                road,
                                Instant.parse("2026-09-30T16:59:00Z"),
                                "1000.00",
                                line(InvoiceLineKind.QUOTED, "800.00", true)),
                        finalInvoice(
                                "CBRT-2026-032",
                                road,
                                Instant.parse("2026-09-30T17:01:00Z"),
                                "2000.00",
                                line(InvoiceLineKind.QUOTED, "1500.00", true)),
                        finalInvoice(
                                "CBRT-2026-033",
                                air,
                                Instant.parse("2026-10-05T03:00:00Z"),
                                "5000.00",
                                line(InvoiceLineKind.QUOTED, "4000.00", true))));

        RevenueReportResponse r = service.report("2026-09", "2026-10", null);

        // 16:59 UTC on 30 Sep is still September in Ho Chi Minh City; 17:01 is 1 October.
        assertEquals(new BigDecimal("1000.00"), r.months().get(0).revenue());
        assertEquals(new BigDecimal("7000.00"), r.months().get(1).revenue());
        assertEquals(new BigDecimal("5500.00"), r.months().get(1).cost());
        assertEquals("Ho Chi Minh City → Hong Kong · air", r.corridors().get(0).label());
        assertEquals(new BigDecimal("20.0"), r.corridors().get(0).marginPct());
        assertEquals(2, r.corridors().get(1).jobs());
        assertEquals(3, r.totals().jobs());
    }

    @Test
    @DisplayName("A period is YYYY-MM to YYYY-MM, in order, at most 24 months")
    void theePeriodIsChecked() {
        assertThrows(BusinessException.class, () -> service.report("2026-10", "2026-09", null));
        assertThrows(BusinessException.class, () -> service.report("2024-01", "2026-10", null));
        BusinessException bad = assertThrows(BusinessException.class, () -> service.report("Oct", null, null));
        assertEquals("The period's from month is YYYY-MM, such as 2026-10; got Oct", bad.getMessage());
    }

    @Test
    @DisplayName("The CSV has a row per job, and quotes or neutralises what a spreadsheet would misread")
    void theCsv() {
        Invoice fin = finalInvoice(
                "CBRT-2026-041",
                road,
                Instant.parse("2026-10-10T03:00:00Z"),
                "100.00",
                line(InvoiceLineKind.QUOTED, "60.00", true));
        fin.getClub().setName("=HYPERLINK(\"x\"), Club");
        when(invoices.findFinalIssuedBetween(any(), any(), isNull())).thenReturn(List.of(fin));

        String[] csv = service.csv("2026-10", "2026-10", null).split("\n");

        assertTrue(csv[0].startsWith("\uFEFFMonth,Job,Club,Corridor"));
        assertEquals(
                "2026-10,CBRT-2026-041,\"'=HYPERLINK(\"\"x\"\"), Club\",Ho Chi Minh City → Phnom Penh · road,"
                        + "INV-2026-0041,100.00,60.00,0.00,60.00,40.00",
                csv[1]);
    }
}
