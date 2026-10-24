package com.equifreight.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.equifreight.configuration.BusinessTime;
import com.equifreight.entity.Handover;
import com.equifreight.entity.Incident;
import com.equifreight.entity.TransportJob;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.IncidentKind;
import com.equifreight.entity.enums.IncidentStatus;
import com.equifreight.entity.enums.JobStage;
import com.equifreight.entity.enums.TripStatus;
import com.equifreight.exception.BusinessException;
import com.equifreight.model.job.JobClosingResponse;
import com.equifreight.repository.HandoverRepository;
import com.equifreight.repository.IncidentRepository;
import com.equifreight.repository.TransportJobRepository;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** US-F6-04: the logistics manager closes a delivered job. */
class JobClosingServiceTest {

    private static final Instant NOW = Instant.parse("2026-10-24T03:00:00Z");

    private final TransportJobRepository jobs = mock(TransportJobRepository.class);
    private final HandoverRepository handovers = mock(HandoverRepository.class);
    private final IncidentRepository incidents = mock(IncidentRepository.class);
    private final AuditService audit = mock(AuditService.class);
    private JobClosingService service;
    private TransportJob job;
    private Handover handover;
    private User yen;

    @BeforeEach
    void setUp() {
        service = new JobClosingService(jobs, handovers, incidents, audit, Clock.fixed(NOW, BusinessTime.ZONE));
        job = new TransportJob();
        job.setId(UUID.randomUUID());
        job.setCode("CBRT-2026-041");
        job.setStage(JobStage.HANDOVER);
        job.setTripStatus(TripStatus.DELIVERED);
        job.setWindowStart(NOW.minus(Duration.ofHours(30)));
        job.setWindowEnd(NOW.minus(Duration.ofHours(26)));
        handover = new Handover();
        handover.setJob(job);
        handover.setDeliveredAt(NOW.minus(Duration.ofHours(27)));
        handover.setHandedOverAt(NOW.minus(Duration.ofHours(26)));
        yen = new User();
        yen.setId(UUID.randomUUID());
        yen.setFirstName("Hải Yến");
        yen.setLastName("Vũ");
        when(jobs.findById(job.getId())).thenReturn(Optional.of(job));
        when(handovers.findByJob_Id(job.getId())).thenReturn(Optional.of(handover));
        when(incidents.findByJob_IdOrderByOpenedAtAsc(job.getId())).thenReturn(List.of());
        when(incidents.findByJob_IdAndStopsClockTrue(job.getId())).thenReturn(List.of());
    }

    @Test
    @DisplayName("Closing records who closed it, when, and that the horses arrived inside the window")
    void closingOnTime() {
        JobClosingResponse r = service.close(job.getId(), yen);

        assertTrue(r.closed());
        assertEquals(JobStage.CLOSED, job.getStage());
        assertEquals(NOW, job.getClosedAt());
        assertEquals(yen, job.getClosedBy());
        assertTrue(job.getOnTime());
        assertEquals(0, job.getLateMinutes());
        assertEquals("Vũ Hải Yến", r.closedByName());
        assertEquals("the arrival window", r.measuredAgainst());
        verify(audit)
                .recordDecision(
                        eq(yen),
                        eq("CLOSE_JOB"),
                        eq("Closed CBRT-2026-041: delivered on time against the arrival window"),
                        eq("TRANSPORT_JOB"),
                        eq(job.getId()),
                        eq(job.getCode()),
                        any(),
                        eq("HANDOVER"),
                        eq("CLOSED"));
    }

    @Test
    @DisplayName("Delivered after the window, it closes late by the minutes past it, less a stopped clock")
    void closingLate() {
        handover.setDeliveredAt(job.getWindowEnd().plus(Duration.ofMinutes(95)));
        Incident held = new Incident();
        held.setClockStoppedFrom(job.getWindowEnd().plus(Duration.ofMinutes(20)));
        held.setClockStoppedUntil(job.getWindowEnd().plus(Duration.ofMinutes(50)));
        when(incidents.findByJob_IdAndStopsClockTrue(job.getId())).thenReturn(List.of(held));

        JobClosingResponse r = service.close(job.getId(), yen);

        assertFalse(r.onTime());
        assertEquals(65, r.lateMinutes());
    }

    @Test
    @DisplayName("Without a window, on time is measured against the planned arrival")
    void withoutAWindow() {
        job.setWindowEnd(null);
        // 70 minutes after the planned arrival: 40 past its 30 minutes' tolerance.
        job.setPlannedArrivalAt(handover.getDeliveredAt().minus(Duration.ofMinutes(70)));

        JobClosingResponse r = service.close(job.getId(), yen);

        assertFalse(r.onTime());
        assertEquals(40, r.lateMinutes());
        assertEquals("the planned arrival, with 30 minutes' tolerance", r.measuredAgainst());
    }

    @Test
    @DisplayName("Without a window, up to 30 minutes after the planned arrival is on time")
    void withinTheTolerance() {
        job.setWindowEnd(null);
        job.setPlannedArrivalAt(handover.getDeliveredAt().minus(Duration.ofMinutes(25)));

        assertTrue(service.close(job.getId(), yen).onTime());
    }

    @Test
    @DisplayName("A job closes only with the handover recorded and no incident open, and once")
    void whatHoldsTheClosing() {
        handover.setHandedOverAt(null);
        Incident open = new Incident();
        open.setStatus(IncidentStatus.OPEN);
        open.setKind(IncidentKind.CUSTOMER_REPORT);
        Incident resolved = new Incident();
        resolved.setStatus(IncidentStatus.RESOLVED);
        resolved.setKind(IncidentKind.WEATHER);
        when(incidents.findByJob_IdOrderByOpenedAtAsc(job.getId())).thenReturn(List.of(resolved, open));

        assertEquals(
                List.of("the handover isn't recorded", "an incident is still open: Customer report"),
                service.closing(job.getId()).blockers());
        BusinessException held = assertThrows(BusinessException.class, () -> service.close(job.getId(), yen));
        assertEquals(
                "CBRT-2026-041 can't close yet: the handover isn't recorded; an incident is still open: Customer report",
                held.getMessage());
        verify(jobs, never()).save(any());

        handover.setHandedOverAt(NOW.minus(Duration.ofHours(26)));
        open.setStatus(IncidentStatus.RESOLVED);
        service.close(job.getId(), yen);
        assertThrows(BusinessException.class, () -> service.close(job.getId(), yen));
    }
}
