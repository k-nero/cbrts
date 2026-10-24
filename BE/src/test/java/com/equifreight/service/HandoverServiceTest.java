package com.equifreight.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
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
import com.equifreight.entity.TransportJob;
import com.equifreight.entity.TransportRequest;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.HandoverOutcome;
import com.equifreight.entity.enums.NotificationKind;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ConflictException;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.model.trip.HandoverResponse;
import com.equifreight.repository.HandoverRepository;
import com.equifreight.repository.IncidentRepository;
import com.equifreight.repository.TransportJobRepository;
import com.equifreight.service.notification.Audience;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** US-F6-02: the customer accepts the trip or raises a discrepancy. */
class HandoverServiceTest {

    private static final Instant NOW = Instant.parse("2026-10-20T03:00:00Z");

    private final HandoverRepository handovers = mock(HandoverRepository.class);
    private final TransportJobRepository jobs = mock(TransportJobRepository.class);
    private final IncidentRepository incidents = mock(IncidentRepository.class);
    private final IncidentService incidentService = mock(IncidentService.class);
    private final AuditService audit = mock(AuditService.class);
    private final NotificationService notifications = mock(NotificationService.class);
    private HandoverService service;
    private TransportJob job;
    private Handover handover;
    private User customer;
    private User yen;
    private User khoi;

    private static User user(String first, String last) {
        User u = new User();
        u.setId(UUID.randomUUID());
        u.setFirstName(first);
        u.setLastName(last);
        return u;
    }

    @BeforeEach
    void setUp() {
        service = new HandoverService(
                handovers, jobs, incidents, incidentService, audit, notifications, Clock.fixed(NOW, BusinessTime.ZONE));
        Club club = new Club();
        club.setId(UUID.randomUUID());
        club.setName("Saigon Turf Club");
        customer = user("Club", "Saigon Turf");
        customer.setClub(club);
        yen = user("Hải Yến", "Vũ");
        khoi = user("Minh Khôi", "Đỗ");
        TransportRequest request = new TransportRequest();
        request.setClub(club);
        job = new TransportJob();
        job.setId(UUID.randomUUID());
        job.setCode("CBRT-2026-041");
        job.setRequest(request);
        job.setApprovedBy(yen);
        job.setCoordinator(khoi);
        handover = new Handover();
        handover.setId(UUID.randomUUID());
        handover.setJob(job);
        handover.setHandedOverAt(NOW.minus(Duration.ofHours(5)));
        handover.setConfirmDueAt(NOW.minus(Duration.ofHours(5)).plus(Duration.ofDays(2)));
        when(jobs.findByCode(job.getCode())).thenReturn(Optional.of(job));
        when(handovers.findByJob_Id(job.getId())).thenReturn(Optional.of(handover));
        when(handovers.findById(handover.getId())).thenReturn(Optional.of(handover));
    }

    @Test
    @DisplayName("Accepting records who accepted and when, and tells the manager and the coordinator")
    void accepting() {
        HandoverResponse r = service.accept(job.getCode(), customer);

        assertEquals(HandoverOutcome.CONFIRMED_SOUND, r.customerOutcome());
        assertEquals(NOW, r.confirmedAt());
        assertEquals(customer, handover.getConfirmedBy());
        assertFalse(r.acceptedByDefault());
        verify(audit)
                .recordDecision(
                        eq(customer),
                        eq("HANDOVER_ACCEPTED"),
                        eq("Accepted the handover of CBRT-2026-041"),
                        eq("TRANSPORT_JOB"),
                        eq(job.getId()),
                        eq(job.getCode()),
                        any(),
                        any(),
                        eq("CONFIRMED_SOUND"));
        verify(notifications)
                .notify(
                        eq(NotificationKind.HANDOVER_ACCEPTED),
                        eq(Audience.staff(List.of(yen, khoi))),
                        any(),
                        eq("Handover accepted: CBRT-2026-041"),
                        anyString());
    }

    @Test
    @DisplayName("A discrepancy keeps the customer's words and opens an incident that alerts the manager")
    void raisingADiscrepancy() {
        Incident incident = new Incident();
        incident.setId(UUID.randomUUID());
        when(incidentService.raiseFromCustomer(job, customer, "Nightfall arrived with a cut on the left hind"))
                .thenReturn(incident);

        HandoverResponse r =
                service.reportDiscrepancy(job.getCode(), customer, " Nightfall arrived with a cut on the left hind ");

        assertEquals(HandoverOutcome.PROBLEM_REPORTED, r.customerOutcome());
        assertEquals("Nightfall arrived with a cut on the left hind", r.discrepancy());
        assertEquals(incident.getId(), r.discrepancyIncidentId());
        verify(audit)
                .recordDecision(
                        eq(customer),
                        eq("HANDOVER_DISCREPANCY"),
                        anyString(),
                        eq("TRANSPORT_JOB"),
                        eq(job.getId()),
                        eq(job.getCode()),
                        eq("Nightfall arrived with a cut on the left hind"),
                        any(),
                        eq("PROBLEM_REPORTED"));
    }

    @Test
    @DisplayName("A discrepancy needs a description")
    void aDiscrepancyNeedsWords() {
        assertThrows(BusinessException.class, () -> service.reportDiscrepancy(job.getCode(), customer, "  "));
        verify(incidentService, never()).raiseFromCustomer(any(), any(), any());
        assertNull(handover.getCustomerOutcome());
    }

    @Test
    @DisplayName("The customer answers once, after the handover, and only on their own club's job")
    void whoAnswersAndWhen() {
        User other = user("Club", "Other");
        Club otherClub = new Club();
        otherClub.setId(UUID.randomUUID());
        other.setClub(otherClub);
        assertThrows(ResourceNotFoundException.class, () -> service.accept(job.getCode(), other));

        handover.setHandedOverAt(null);
        assertThrows(BusinessException.class, () -> service.accept(job.getCode(), customer));

        handover.setHandedOverAt(NOW.minus(Duration.ofHours(5)));
        service.accept(job.getCode(), customer);
        ConflictException twice =
                assertThrows(ConflictException.class, () -> service.reportDiscrepancy(job.getCode(), customer, "Late"));
        assertEquals("The handover of CBRT-2026-041 was already accepted on 20 Oct 10:00", twice.getMessage());
    }

    @Test
    @DisplayName("With no answer by the due time, the handover is taken as accepted")
    void acceptedByDefault() {
        when(incidents.existsByJob_IdAndStatusIn(eq(job.getId()), any())).thenReturn(false);

        service.acceptByDefault(handover.getId());

        assertEquals(HandoverOutcome.CONFIRMED_SOUND, handover.getCustomerOutcome());
        assertTrue(handover.isAcceptedByDefault());
        assertNull(handover.getConfirmedBy());
        verify(audit)
                .recordSystem(
                        eq("HANDOVER_ACCEPTED"),
                        anyString(),
                        eq("TRANSPORT_JOB"),
                        eq(job.getId()),
                        eq(job.getCode()),
                        any(),
                        eq("CONFIRMED_SOUND"));
    }

    @Test
    @DisplayName("An incident still open on the job holds the default acceptance")
    void anOpenIncidentHoldsTheDefault() {
        when(incidents.existsByJob_IdAndStatusIn(eq(job.getId()), any())).thenReturn(true);

        service.acceptByDefault(handover.getId());

        assertNull(handover.getCustomerOutcome());
        verify(handovers, never()).save(any());
    }
}
