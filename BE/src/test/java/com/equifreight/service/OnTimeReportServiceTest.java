package com.equifreight.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.equifreight.configuration.BusinessTime;
import com.equifreight.entity.Club;
import com.equifreight.entity.Corridor;
import com.equifreight.entity.Incident;
import com.equifreight.entity.TransportJob;
import com.equifreight.entity.TransportRequest;
import com.equifreight.entity.enums.TransportMode;
import com.equifreight.exception.BusinessException;
import com.equifreight.model.report.OnTimeReportResponse;
import com.equifreight.repository.CorridorRepository;
import com.equifreight.repository.IncidentRepository;
import com.equifreight.repository.TransportJobRepository;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

/** US-R-03: the on-time delivery rate. */
class OnTimeReportServiceTest {

    /** Sunday 25 Oct 2026, 10:00 in Ho Chi Minh City. */
    private static final Instant NOW = Instant.parse("2026-10-25T03:00:00Z");

    private final TransportJobRepository jobs = mock(TransportJobRepository.class);
    private final IncidentRepository incidents = mock(IncidentRepository.class);
    private final CorridorRepository corridors = mock(CorridorRepository.class);
    private OnTimeReportService service;
    private Corridor pnh;
    private Corridor bkk;

    private static Corridor corridor(String to) {
        Corridor c = new Corridor();
        c.setId(UUID.randomUUID());
        c.setOriginCity("Ho Chi Minh City");
        c.setDestinationCity(to);
        c.setMode(TransportMode.ROAD);
        return c;
    }

    /** A job delivered at {@code delivered}, due by {@code windowEnd} or, without one, its planned arrival. */
    private static TransportJob job(
            String code, Corridor corridor, Instant delivered, Instant windowEnd, Instant plannedArrival) {
        Club club = new Club();
        club.setName("Saigon Turf Club");
        TransportRequest request = new TransportRequest();
        request.setClub(club);
        request.setCorridor(corridor);
        TransportJob j = new TransportJob();
        j.setId(UUID.randomUUID());
        j.setCode(code);
        j.setRequest(request);
        j.setDeliveredAt(delivered);
        j.setWindowEnd(windowEnd);
        j.setPlannedArrivalAt(plannedArrival);
        return j;
    }

    @BeforeEach
    void setUp() {
        service = new OnTimeReportService(jobs, incidents, corridors, Clock.fixed(NOW, BusinessTime.ZONE));
        pnh = corridor("Phnom Penh");
        bkk = corridor("Bangkok");
        when(corridors.findAllByOrderByCodeAsc()).thenReturn(List.of(pnh, bkk));
        when(incidents.findByJob_IdInAndStopsClockTrue(any())).thenReturn(List.of());
    }

    @Test
    @DisplayName("On time is by the window's close, or the planned arrival plus 30 minutes; the late are listed")
    void whatCountsAsOnTime() {
        Instant d = Instant.parse("2026-10-20T07:00:00Z");
        TransportJob inWindow = job("CBRT-2026-041", pnh, d, d.plusSeconds(60), null);
        TransportJob pastWindow = job("CBRT-2026-042", pnh, d, d.minus(Duration.ofMinutes(45)), null);
        TransportJob inTolerance = job("CBRT-2026-043", bkk, d, null, d.minus(Duration.ofMinutes(25)));
        TransportJob pastTolerance = job("CBRT-2026-044", bkk, d, null, d.minus(Duration.ofMinutes(50)));
        when(jobs.findDeliveredBetween(any(), any(), isNull()))
                .thenReturn(List.of(inWindow, pastWindow, inTolerance, pastTolerance));

        OnTimeReportResponse r = service.report(null, null, null, null);

        assertEquals(4, r.totals().delivered());
        assertEquals(2, r.totals().late());
        assertEquals(new BigDecimal("50.0"), r.totals().rate());
        assertEquals(
                List.of("CBRT-2026-042", "CBRT-2026-044"),
                r.lateJobs().stream()
                        .map(OnTimeReportResponse.LateJob::jobCode)
                        .sorted()
                        .toList());
        OnTimeReportResponse.LateJob noWindow = r.lateJobs().stream()
                .filter(l -> l.jobCode().equals("CBRT-2026-044"))
                .findFirst()
                .orElseThrow();
        assertEquals(20, noWindow.lateMinutes());
        assertEquals("the planned arrival, with 30 minutes' tolerance", noWindow.measuredAgainst());
        assertEquals(new BigDecimal("95"), r.target());
    }

    @Test
    @DisplayName("A clock an incident stopped doesn't count against the window")
    void aStoppedClock() {
        Instant end = Instant.parse("2026-10-20T07:00:00Z");
        TransportJob held = job("CBRT-2026-041", pnh, end.plus(Duration.ofMinutes(40)), end, null);
        Incident hold = new Incident();
        hold.setJob(held);
        hold.setClockStoppedFrom(end.minus(Duration.ofMinutes(10)));
        hold.setClockStoppedUntil(end.plus(Duration.ofMinutes(50)));
        when(jobs.findDeliveredBetween(any(), any(), isNull())).thenReturn(List.of(held));
        when(incidents.findByJob_IdInAndStopsClockTrue(List.of(held.getId()))).thenReturn(List.of(hold));

        OnTimeReportResponse r = service.report(null, null, null, null);

        assertEquals(0, r.totals().late());
        assertEquals(new BigDecimal("100.0"), r.totals().rate());
    }

    @Test
    @DisplayName("By default the last 8 weeks by ISO week, Monday first, every week listed")
    void theDefaultWeeks() {
        when(jobs.findDeliveredBetween(any(), any(), isNull()))
                .thenReturn(List.of(job("CBRT-2026-041", pnh, Instant.parse("2026-10-19T03:00:00Z"), null, null)));

        OnTimeReportResponse r = service.report(null, null, null, null);

        assertEquals(LocalDate.of(2026, 8, 31), r.from());
        assertEquals(LocalDate.of(2026, 10, 25), r.to());
        assertEquals(8, r.buckets().size());
        assertEquals("W36", r.buckets().getFirst().label());
        assertEquals("W43", r.buckets().getLast().label());
        assertNull(r.buckets().getFirst().rate());
        // A job with no window and no planned arrival has nothing to be late against.
        assertEquals(new BigDecimal("100.0"), r.buckets().getLast().rate());
        ArgumentCaptor<Instant> from = ArgumentCaptor.forClass(Instant.class);
        verify(jobs).findDeliveredBetween(from.capture(), any(), isNull());
        assertEquals(Instant.parse("2026-08-30T17:00:00Z"), from.getValue());
    }

    @Test
    @DisplayName("By month and corridor, the worst corridor first")
    void byMonthAndCorridor() {
        Instant sep = Instant.parse("2026-09-10T03:00:00Z");
        Instant oct = Instant.parse("2026-10-10T03:00:00Z");
        when(jobs.findDeliveredBetween(any(), any(), isNull()))
                .thenReturn(List.of(
                        job("CBRT-2026-031", pnh, sep, sep.plusSeconds(60), null),
                        job("CBRT-2026-032", bkk, oct, oct.minusSeconds(3600), null),
                        job("CBRT-2026-033", bkk, oct, oct.plusSeconds(60), null)));

        OnTimeReportResponse r = service.report(
                LocalDate.of(2026, 9, 1), LocalDate.of(2026, 10, 31), OnTimeReportService.By.MONTH, null);

        assertEquals(
                List.of("Sep", "Oct"),
                r.buckets().stream().map(OnTimeReportResponse.Bucket::label).toList());
        assertEquals(new BigDecimal("50.0"), r.buckets().get(1).rate());
        assertEquals(
                "Ho Chi Minh City → Bangkok · road", r.corridors().getFirst().label());
        assertEquals(new BigDecimal("50.0"), r.corridors().getFirst().rate());
        assertEquals(new BigDecimal("100.0"), r.corridors().get(1).rate());
    }

    @Test
    @DisplayName("A period runs forward and covers at most a year")
    void thePeriodIsChecked() {
        assertThrows(
                BusinessException.class,
                () -> service.report(LocalDate.of(2026, 10, 2), LocalDate.of(2026, 10, 1), null, null));
        assertThrows(
                BusinessException.class,
                () -> service.report(LocalDate.of(2025, 1, 1), LocalDate.of(2026, 10, 1), null, null));
    }
}
