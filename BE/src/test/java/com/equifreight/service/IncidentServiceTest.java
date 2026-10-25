package com.equifreight.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.equifreight.entity.AuditLog;
import com.equifreight.entity.Club;
import com.equifreight.entity.CrewAssignment;
import com.equifreight.entity.Horse;
import com.equifreight.entity.Incident;
import com.equifreight.entity.IncidentOption;
import com.equifreight.entity.JobCharge;
import com.equifreight.entity.Quotation;
import com.equifreight.entity.RoutePlan;
import com.equifreight.entity.TransportJob;
import com.equifreight.entity.TransportRequest;
import com.equifreight.entity.Trip;
import com.equifreight.entity.TripHorse;
import com.equifreight.entity.TripJob;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.IncidentKind;
import com.equifreight.entity.enums.IncidentSource;
import com.equifreight.entity.enums.IncidentStatus;
import com.equifreight.entity.enums.LeavingKind;
import com.equifreight.entity.enums.NotificationKind;
import com.equifreight.entity.enums.RoleName;
import com.equifreight.entity.enums.TripHorseStatus;
import com.equifreight.entity.enums.TripStatus;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.model.incident.AddIncidentOptionRequest;
import com.equifreight.model.incident.DecideIncidentRequest;
import com.equifreight.model.incident.DelayAlertRequest;
import com.equifreight.model.incident.IncidentResponse;
import com.equifreight.model.incident.JobIncidentResponse;
import com.equifreight.model.incident.ProposeOptionRequest;
import com.equifreight.model.incident.RaiseIncidentRequest;
import com.equifreight.model.incident.ResolveIncidentRequest;
import com.equifreight.model.incident.ReturnProposalRequest;
import com.equifreight.repository.AuditLogRepository;
import com.equifreight.repository.CrewAssignmentRepository;
import com.equifreight.repository.IncidentRepository;
import com.equifreight.repository.JobChargeRepository;
import com.equifreight.repository.TransportJobRepository;
import com.equifreight.repository.TripRecordRepository;
import com.equifreight.repository.UserRepository;
import com.equifreight.service.notification.Audience;
import com.equifreight.service.notification.Subject;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

/** US-F5-01: the escort reports an emergency from the cab. */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class IncidentServiceTest {

    // 14:05 in Vietnam time.
    private static final Instant NOW = Instant.parse("2026-10-18T07:05:00Z");

    @Mock
    private IncidentRepository incidents;

    @Mock
    private TransportJobRepository jobs;

    @Mock
    private CrewAssignmentRepository crew;

    @Mock
    private UserRepository users;

    @Mock
    private JobTripService jobTrips;

    @Mock
    private FileService files;

    @Mock
    private AuditService audit;

    @Mock
    private NotificationService notifications;

    @Mock
    private RoutePlanService routePlans;

    @Mock
    private ClearanceService clearance;

    @Mock
    private JobChargeRepository charges;

    @Mock
    private TripRecordRepository records;

    @Mock
    private TripLeavingService leaving;

    @Mock
    private FlightService flights;

    @Mock
    private TripNotices notices;

    @Mock
    private AuditLogRepository auditLogs;

    private IncidentService service;
    private User minh;
    private User yen;
    private User khoi;
    private TransportJob job;
    private Trip trip;

    private static User user(String first, String last) {
        User u = new User();
        u.setId(UUID.randomUUID());
        u.setFirstName(first);
        u.setLastName(last);
        u.setEmail(first.toLowerCase() + "@equifreight.vn");
        return u;
    }

    private static TransportJob job(String code) {
        TransportRequest request = new TransportRequest();
        request.setId(UUID.randomUUID());
        TransportJob j = new TransportJob();
        j.setId(UUID.randomUUID());
        j.setCode(code);
        j.setRequest(request);
        j.setTripStatus(TripStatus.DEPARTED);
        return j;
    }

    private TripHorse rider(TransportJob owner, String name) {
        Horse horse = new Horse();
        horse.setId(UUID.randomUUID());
        horse.setName(name);
        TripHorse th = new TripHorse();
        th.setTrip(trip);
        th.setJob(owner);
        th.setHorse(horse);
        th.setStatus(TripHorseStatus.ON_TRIP);
        return th;
    }

    @BeforeEach
    void setUp() {
        service = new IncidentService(
                incidents,
                jobs,
                crew,
                users,
                jobTrips,
                files,
                audit,
                notifications,
                routePlans,
                clearance,
                charges,
                records,
                leaving,
                flights,
                notices,
                auditLogs,
                Clock.fixed(NOW, ZoneOffset.UTC));
        minh = user("Minh", "Trần");
        yen = user("Hải Yến", "Vũ");
        khoi = user("Khôi", "Đỗ Minh");
        trip = new Trip();
        trip.setId(UUID.randomUUID());
        trip.setCode("TRP-2026-001");
        job = job("CBRT-2026-041");
        job.setApprovedBy(yen);
        job.setCoordinator(khoi);
        when(jobs.findByCode(job.getCode())).thenReturn(Optional.of(job));
        when(jobTrips.tripOf(job.getId())).thenReturn(trip);
        lenient().when(jobTrips.tripOf(eq(job.getId()), isNull())).thenReturn(trip);
        when(leaving.movingTrip(any())).thenReturn(trip);
        // The job's part on the trip, as released as the job is when it's asked for.
        when(jobTrips.partsOf(any())).thenAnswer(inv -> {
            TransportJob j = inv.getArgument(0);
            TripJob part = new TripJob();
            part.setTrip(trip);
            part.setJob(j);
            part.setStatus(j.getTripStatus());
            part.setSignedOffAt(j.getSignedOffAt());
            return List.of(part);
        });
        when(jobTrips.findTripOf(any())).thenReturn(Optional.of(trip));
        lenient().when(jobTrips.findTripOf(any(), isNull())).thenReturn(Optional.of(trip));
        when(crew.existsByTrip_IdAndUser_Id(trip.getId(), minh.getId())).thenReturn(true);
        when(incidents.findByClientRef(any())).thenReturn(Optional.empty());
        when(incidents.save(any())).thenAnswer(inv -> {
            Incident i = inv.getArgument(0);
            if (i.getId() == null) i.setId(UUID.randomUUID());
            return i;
        });
    }

    private static RaiseIncidentRequest report(IncidentKind kind, UUID horseId) {
        return new RaiseIncidentRequest(
                kind, "QL22 km 41, before Gò Dầu", "Rear tyre blew out", horseId, List.of(), UUID.randomUUID(), NOW);
    }

    @Test
    @DisplayName("A breakdown reported from the cab opens an incident the manager owns, and alerts her and Khôi")
    void aBreakdownAlertsTheOwnerAndCoordinator() {
        IncidentResponse r = service.raiseFromCab(job.getCode(), minh, report(IncidentKind.VEHICLE, null));

        assertEquals(IncidentStatus.OPEN, r.status());
        assertEquals(IncidentSource.CAB, r.source());
        assertEquals("Vehicle breakdown", r.kindLabel());
        assertEquals("QL22 km 41, before Gò Dầu", r.location());
        assertEquals("Trần Minh", r.reportedByName());
        assertEquals("Vũ Hải Yến", r.ownerName());
        assertEquals("TRP-2026-001", r.tripCode());

        ArgumentCaptor<Audience> audience = ArgumentCaptor.forClass(Audience.class);
        ArgumentCaptor<Subject> subject = ArgumentCaptor.forClass(Subject.class);
        verify(notifications)
                .notify(
                        eq(NotificationKind.INCIDENT_RAISED),
                        audience.capture(),
                        subject.capture(),
                        eq("Vehicle breakdown: CBRT-2026-041"),
                        eq("Rear tyre blew out · QL22 km 41, before Gò Dầu. Reported by Trần Minh from the cab at"
                                + " 14:05."));
        assertEquals(List.of(yen, khoi), ((Audience.StaffMembers) audience.getValue()).users());
        assertEquals(r.id(), subject.getValue().id());
        verify(audit)
                .recordFromDevice(
                        eq(minh),
                        any(),
                        eq(NOW),
                        eq("RAISE_INCIDENT"),
                        anyString(),
                        eq("INCIDENT"),
                        any(),
                        any(),
                        any());
    }

    @Test
    @DisplayName("A horse medical incident names the horse and is raised on that horse's job, on a shared trailer too")
    void aMedicalIncidentIsTheHorsesJob() {
        TransportJob other = job("CBRT-2026-042");
        other.setApprovedBy(yen);
        TripHorse ivory = rider(other, "Ivory Bay");
        when(jobTrips.horsesOn(trip)).thenReturn(List.of(rider(job, "Shadowfax"), ivory));

        IncidentResponse r = service.raiseFromCab(
                job.getCode(),
                minh,
                report(IncidentKind.WELFARE, ivory.getHorse().getId()));

        assertEquals("CBRT-2026-042", r.jobCode());
        assertEquals("Ivory Bay", r.horseName());
        assertEquals("Horse medical incident", r.kindLabel());
    }

    @Test
    @DisplayName("A medical incident without a horse is refused")
    void aMedicalIncidentNeedsTheHorse() {
        BusinessException ex = assertThrows(
                BusinessException.class,
                () -> service.raiseFromCab(job.getCode(), minh, report(IncidentKind.WELFARE, null)));

        assertEquals("Name the horse the medical incident concerns", ex.getMessage());
        verify(incidents, never()).save(any());
    }

    @Test
    @DisplayName("Only the trip's crew can report, and only once the trip is released to them")
    void onlyTheCrewReports() {
        User other = user("Tuấn", "Phạm");
        assertThrows(
                ResourceNotFoundException.class,
                () -> service.raiseFromCab(job.getCode(), other, report(IncidentKind.TRAFFIC, null)));

        job.setTripStatus(TripStatus.NOT_STARTED);
        assertThrows(
                ResourceNotFoundException.class,
                () -> service.raiseFromCab(job.getCode(), minh, report(IncidentKind.TRAFFIC, null)));
    }

    @Test
    @DisplayName("The cab can't open a hold or a customer report")
    void theCabReportsItsOwnKinds() {
        assertThrows(
                BusinessException.class,
                () -> service.raiseFromCab(job.getCode(), minh, report(IncidentKind.CUSTOMER_REPORT, null)));
    }

    @Test
    @DisplayName("A resent report returns the incident already opened, without alerting again")
    void aResendIsTheSameIncident() {
        Incident opened = new Incident();
        opened.setId(UUID.randomUUID());
        opened.setJob(job);
        opened.setKind(IncidentKind.TRAFFIC);
        opened.setSource(IncidentSource.CAB);
        opened.setSummary("Stuck behind a crash");
        opened.setOwner(yen);
        RaiseIncidentRequest resend = report(IncidentKind.TRAFFIC, null);
        when(incidents.findByClientRef(resend.clientRef())).thenReturn(Optional.of(opened));

        assertEquals(
                opened.getId(),
                service.raiseFromCab(job.getCode(), minh, resend).id());
        verify(notifications, never()).notify(any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName(
            "A job without a coordinator alerts every coordinator; without its manager, the first active one owns it")
    void fallbacks() {
        job.setCoordinator(null);
        job.setApprovedBy(null);
        when(users.findByRoleAndStatus(eq(RoleName.LOGISTICS_MANAGER), any())).thenReturn(List.of(yen));

        IncidentResponse r = service.raiseFromCab(job.getCode(), minh, report(IncidentKind.OTHER, null));

        assertEquals("Vũ Hải Yến", r.ownerName());
        verify(notifications)
                .notify(
                        eq(NotificationKind.INCIDENT_RAISED),
                        eq(Audience.role(RoleName.FLEET_COORDINATOR)),
                        any(),
                        anyString(),
                        anyString());
    }

    // ---------- options (US-F5-02) ----------

    private Incident opened() {
        Quotation quotation = new Quotation();
        quotation.setCurrency("USD");
        job.setQuotation(quotation);
        Incident i = new Incident();
        i.setId(UUID.randomUUID());
        i.setJob(job);
        i.setKind(IncidentKind.VEHICLE);
        i.setSource(IncidentSource.CAB);
        i.setStatus(IncidentStatus.OPEN);
        i.setSummary("Rear tyre blew out");
        i.setOwner(yen);
        when(incidents.findById(i.getId())).thenReturn(Optional.of(i));
        when(incidents.saveAndFlush(any())).thenAnswer(inv -> {
            Incident saved = inv.getArgument(0);
            saved.getOptions().stream().filter(o -> o.getId() == null).forEach(o -> o.setId(UUID.randomUUID()));
            return saved;
        });
        return i;
    }

    private static AddIncidentOptionRequest option(String title, String cost, int delay, boolean route) {
        return new AddIncidentOptionRequest(title, null, new BigDecimal(cost), delay, route);
    }

    @Test
    @DisplayName("The coordinator records several options, each with its cost and delay, in order")
    void optionsAreRecorded() {
        Incident i = opened();

        service.addOption(i.getId(), option("Wait for the roadside mechanic", "350", 180, false), khoi);
        IncidentResponse r =
                service.addOption(i.getId(), option("Second trailer from Tây Ninh", "1200", 90, true), khoi);

        assertEquals(2, r.options().size());
        assertEquals("USD", r.currency());
        assertEquals(
                List.of((short) 1, (short) 2),
                r.options().stream().map(o -> o.position()).toList());
        assertEquals(new BigDecimal("1200"), r.options().get(1).extraCost());
        assertEquals("Đỗ Minh Khôi", r.options().get(1).createdByName());
        verify(audit)
                .recordDecision(
                        eq(khoi),
                        eq("ADD_INCIDENT_OPTION"),
                        eq("Option \"Second trailer from Tây Ninh\" recorded for the incident on CBRT-2026-041:"
                                + " + USD 1,200.00, + 1 h 30 min, new route"),
                        eq("INCIDENT"),
                        any(),
                        any(),
                        any(),
                        any(),
                        any());
    }

    @Test
    @DisplayName("Proposing an option tells the owner a decision waits, and freezes the options until then")
    void proposingTellsTheOwner() {
        Incident i = opened();
        IncidentResponse r =
                service.addOption(i.getId(), option("Second trailer from Tây Ninh", "1200", 90, true), khoi);
        UUID optionId = r.options().getFirst().id();

        r = service.propose(
                i.getId(), new ProposeOptionRequest(optionId, "Fastest way to keep the 6-hour rule."), khoi);

        assertEquals(optionId, r.proposedOptionId());
        assertEquals("Đỗ Minh Khôi", r.proposedByName());
        verify(notifications)
                .notify(
                        eq(NotificationKind.INCIDENT_PROPOSAL),
                        eq(Audience.staff(yen)),
                        any(),
                        eq("Decision needed: Vehicle breakdown on CBRT-2026-041"),
                        eq("Đỗ Minh Khôi proposes \"Second trailer from Tây Ninh\": + USD 1,200.00, + 1 h 30 min,"
                                + " new route. Fastest way to keep the 6-hour rule."));
        BusinessException ex = assertThrows(
                BusinessException.class,
                () -> service.addOption(i.getId(), option("Return to origin", "0", 300, true), khoi));
        assertEquals(
                "\"Second trailer from Tây Ninh\" waits for the logistics manager's decision: you can add an option"
                        + " once they decide or send it back",
                ex.getMessage());
    }

    @Test
    @DisplayName("An option can be taken off before anything is proposed; an unknown option is not found")
    void optionsCanBeRemoved() {
        Incident i = opened();
        IncidentResponse r = service.addOption(i.getId(), option("Wait", "0", 60, false), khoi);

        r = service.removeOption(i.getId(), r.options().getFirst().id(), khoi);

        assertEquals(0, r.options().size());
        assertThrows(
                ResourceNotFoundException.class,
                () -> service.propose(i.getId(), new ProposeOptionRequest(UUID.randomUUID(), null), khoi));
    }

    @Test
    @DisplayName("A decided incident takes no more options")
    void aDecidedIncidentIsClosedToOptions() {
        Incident i = opened();
        i.setStatus(IncidentStatus.DECIDED);

        assertThrows(BusinessException.class, () -> service.addOption(i.getId(), option("Wait", "0", 60, false), khoi));
    }

    // ---------- the decision (US-F5-03) ----------

    /** An open incident with "Second trailer" proposed by Khôi: + USD 1,200, + 90 min, a new route. */
    private Incident proposed() {
        Incident i = opened();
        Club club = new Club();
        club.setId(UUID.randomUUID());
        job.getRequest().setClub(club);
        job.setPlannedArrivalAt(NOW.plusSeconds(6 * 3600));
        IncidentOption option = new IncidentOption();
        option.setId(UUID.randomUUID());
        option.setIncident(i);
        option.setPosition((short) 1);
        option.setTitle("Second trailer from Tây Ninh");
        option.setExtraCost(new BigDecimal("1200"));
        option.setDelayMinutes(90);
        option.setChangesRoute(true);
        i.getOptions().add(option);
        i.setProposedOption(option);
        i.setProposedBy(khoi);
        when(jobTrips.jobsOn(trip)).thenReturn(List.of(job));
        when(records.findByTrip_IdOrderByOccurredAtAsc(trip.getId())).thenReturn(List.of());
        when(charges.findByIncident_Id(any())).thenReturn(Optional.empty());
        RoutePlan v3 = new RoutePlan();
        v3.setVersionNo((short) 3);
        when(routePlans.reviseForIncident(eq(trip), eq(90), any(), anyString(), eq(yen), any()))
                .thenAnswer(inv -> {
                    job.setPlannedArrivalAt(job.getPlannedArrivalAt().plusSeconds(90 * 60));
                    return Optional.of(v3);
                });
        when(clearance.recheckAfterReplan(job.getId())).thenReturn(List.of("Shadowfax · Health certificate"));
        return i;
    }

    private static DecideIncidentRequest approve(Incident i, boolean charge) {
        return new DecideIncidentRequest(
                i.getProposedOption().getId(),
                "Cheapest safe option.",
                "Your horses will reach Phnom Penh about 90 minutes later than planned, on a second trailer.",
                charge);
    }

    @Test
    @DisplayName("Approving gives the trip a new route version, re-checks the documents and charges the job")
    void approvalRevisesTheRouteAndChargesTheJob() {
        Incident i = proposed();
        job.setTransportSpecialist(user("Lan", "Nguyễn Thị"));

        IncidentResponse r = service.decide(i.getId(), approve(i, true), yen);

        assertEquals(IncidentStatus.DECIDED, r.status());
        assertEquals(i.getProposedOption().getId(), r.decidedOptionId());
        assertEquals((short) 3, r.routePlanVersion());
        verify(clearance).recheckAfterReplan(job.getId());
        ArgumentCaptor<JobCharge> charge = ArgumentCaptor.forClass(JobCharge.class);
        verify(charges).save(charge.capture());
        assertEquals(new BigDecimal("1200"), charge.getValue().getAmount());
        assertEquals(job, charge.getValue().getJob());
        assertEquals(
                "Vehicle breakdown: Second trailer from Tây Ninh",
                charge.getValue().getDescription());
        // The customer gets the manager's message as written; the specialist hears which documents to check.
        verify(notifications)
                .notify(
                        eq(NotificationKind.INCIDENT_UPDATE),
                        eq(Audience.club(job.getRequest().getClub().getId())),
                        any(),
                        eq("Update on CBRT-2026-041"),
                        eq("Your horses will reach Phnom Penh about 90 minutes later than planned, on a second"
                                + " trailer."),
                        eq("INCIDENT_UPDATE:" + i.getId()));
        verify(notifications)
                .notify(
                        eq(NotificationKind.INCIDENT_DECIDED),
                        eq(Audience.staff(khoi)),
                        any(),
                        eq("Approved: Second trailer from Tây Ninh"),
                        eq("Vũ Hải Yến approved \"Second trailer from Tây Ninh\": + USD 1,200.00, + 1 h 30 min, new"
                                + " route. Route version 3 is confirmed."));
        verify(notifications)
                .notify(
                        eq(NotificationKind.INCIDENT_DECIDED),
                        any(Audience.StaffMembers.class),
                        any(),
                        eq("Documents to check for CBRT-2026-041"),
                        anyString());
    }

    @Test
    @DisplayName("An option the customer doesn't pay for attaches no charge")
    void approvalWithoutCharge() {
        Incident i = proposed();

        service.decide(i.getId(), approve(i, false), yen);

        verify(charges, never()).save(any());
    }

    @Test
    @DisplayName("Only the proposed option can be approved, and only once")
    void onlyTheProposalIsApproved() {
        Incident i = proposed();
        BusinessException ex = assertThrows(
                BusinessException.class,
                () -> service.decide(
                        i.getId(), new DecideIncidentRequest(UUID.randomUUID(), null, "Message", true), yen));
        assertEquals(
                "Approve the proposed option, \"Second trailer from Tây Ninh\", or send it back so another can be"
                        + " proposed",
                ex.getMessage());

        service.decide(i.getId(), approve(i, true), yen);
        assertThrows(BusinessException.class, () -> service.decide(i.getId(), approve(i, true), yen));
    }

    @Test
    @DisplayName("An option without a delay or a new route leaves the route and the documents alone")
    void aCostOnlyOptionKeepsTheRoute() {
        Incident i = proposed();
        i.getProposedOption().setDelayMinutes(0);
        i.getProposedOption().setChangesRoute(false);

        IncidentResponse r = service.decide(i.getId(), approve(i, true), yen);

        assertEquals(null, r.routePlanVersion());
        verify(routePlans, never()).reviseForIncident(any(), anyInt(), any(), any(), any(), any());
        verify(clearance, never()).recheckAfterReplan(any());
    }

    @Test
    @DisplayName("Sending a proposal back tells whoever proposed it why, and unlocks the options")
    void aProposalCanBeSentBack() {
        Incident i = proposed();

        IncidentResponse r = service.returnProposal(i.getId(), new ReturnProposalRequest("Ask Tây Ninh first."), yen);

        assertEquals(null, r.proposedOptionId());
        verify(notifications)
                .notify(
                        eq(NotificationKind.INCIDENT_RETURNED),
                        eq(Audience.staff(khoi)),
                        any(),
                        eq("Sent back: Second trailer from Tây Ninh"),
                        eq("Vũ Hải Yến: Ask Tây Ninh first."));
        service.addOption(i.getId(), option("Wait for the mechanic", "0", 180, false), khoi);
    }

    // ---------- leaving a moving trip (US-F5-06) ----------

    @Test
    @DisplayName("A leaving option moves the job to a new trip; the trip carries on without its stops")
    void theJobLeavesTheTrip() {
        Incident i = proposed();
        IncidentOption option = i.getProposedOption();
        option.setLeavingKind(LeavingKind.UNLOAD);
        option.setDelayMinutes(30);
        Trip later = new Trip();
        later.setId(UUID.randomUUID());
        later.setCode("TRP-2026-009");
        when(leaving.leave(eq(trip), eq(job), eq(option), eq(yen), any()))
                .thenReturn(new TripLeavingService.Departure(later, true, List.of("Shadowfax")));
        TransportJob other = job("CBRT-2026-042");
        Club club = new Club();
        club.setId(UUID.randomUUID());
        other.getRequest().setClub(club);
        other.setApprovedBy(yen);
        other.setPlannedArrivalAt(NOW.plusSeconds(5 * 3600));
        other.setWindowEnd(NOW.plusSeconds(5 * 3600 + 600));
        // Once the job has left, only the other job rides the trip; its arrival moves 30 minutes, past its window.
        when(jobTrips.jobsOn(trip)).thenReturn(List.of(job, other), List.of(other));
        RoutePlan v4 = new RoutePlan();
        v4.setId(UUID.randomUUID());
        v4.setVersionNo((short) 4);
        when(routePlans.reviseForIncident(eq(trip), eq(30), any(), anyString(), eq(yen), eq(Set.of(job.getId()))))
                .thenAnswer(inv -> {
                    other.setPlannedArrivalAt(other.getPlannedArrivalAt().plusSeconds(30 * 60));
                    return Optional.of(v4);
                });
        when(clearance.recheckAfterReplan(other.getId())).thenReturn(List.of());
        job.setTransportSpecialist(user("Lan", "Nguyễn Thị"));

        IncidentResponse r = service.decide(i.getId(), approve(i, false), yen);

        assertEquals("TRP-2026-009", r.newTripCode());
        assertEquals((short) 4, r.routePlanVersion());
        verify(flights).allocate(trip, v4);
        // The other customer hears only their new time; the missed window is an incident of its own.
        verify(notices).arrivalMoved(other, v4);
        ArgumentCaptor<Incident> late = ArgumentCaptor.forClass(Incident.class);
        verify(incidents, org.mockito.Mockito.atLeastOnce()).save(late.capture());
        Incident opened = late.getAllValues().stream()
                .filter(x -> x.getKind() == IncidentKind.LATE_ARRIVAL)
                .findFirst()
                .orElseThrow();
        assertEquals(other, opened.getJob());
        assertEquals(IncidentSource.STAFF, opened.getSource());
        verify(notifications)
                .notify(
                        eq(NotificationKind.INCIDENT_DECIDED),
                        any(Audience.StaffMembers.class),
                        any(),
                        eq("Check the permits for CBRT-2026-041 on trip TRP-2026-009"),
                        anyString());
    }

    @Test
    @DisplayName("An option that keeps everyone aboard leaves the trip's jobs as they are")
    void noOneLeaves() {
        Incident i = proposed();

        service.decide(i.getId(), approve(i, true), yen);

        verify(leaving, never()).leave(any(), any(), any(), any(), any());
        verify(routePlans).reviseForIncident(eq(trip), eq(90), any(), anyString(), eq(yen), eq(Set.of()));
    }

    // ---------- delay alerts (US-F5-04) ----------

    /** The job on the road, arriving at 20:05, with Minh on the cab; the alert pushes the stops ahead by its delay. */
    private void onTheRoad() {
        Quotation quotation = new Quotation();
        quotation.setCurrency("USD");
        job.setQuotation(quotation);
        Club club = new Club();
        club.setId(UUID.randomUUID());
        job.getRequest().setClub(club);
        job.setPlannedArrivalAt(NOW.plusSeconds(6 * 3600));
        TripJob part = new TripJob();
        part.setTrip(trip);
        part.setJob(job);
        part.setStatus(TripStatus.DEPARTED);
        when(jobTrips.activePartsOf(job)).thenReturn(List.of(part));
        when(jobs.findById(job.getId())).thenReturn(Optional.of(job));
        when(jobTrips.jobsOn(trip)).thenReturn(List.of(job));
        when(records.findByTrip_IdOrderByOccurredAtAsc(trip.getId())).thenReturn(List.of());
        when(charges.findByIncident_Id(any())).thenReturn(Optional.empty());
        CrewAssignment driver = new CrewAssignment();
        driver.setUser(minh);
        when(crew.findByTrip_Id(trip.getId())).thenReturn(List.of(driver));
        RoutePlan v4 = new RoutePlan();
        v4.setVersionNo((short) 4);
        when(routePlans.reviseForIncident(eq(trip), anyInt(), any(), anyString(), any(), any()))
                .thenAnswer(inv -> {
                    long minutes = inv.<Integer>getArgument(1);
                    for (TransportJob j : jobTrips.jobsOn(trip)) {
                        j.setPlannedArrivalAt(j.getPlannedArrivalAt().plusSeconds(minutes * 60));
                    }
                    return Optional.of(v4);
                });
    }

    private static DelayAlertRequest delay(IncidentKind reason, Instant eta, String note) {
        return new DelayAlertRequest(reason, eta.atOffset(ZoneOffset.ofHours(7)), note);
    }

    @Test
    @DisplayName("A delay alert moves the stops ahead, and the crew and the customer hear the reason and new arrival")
    void aDelayAlertReachesTheCrewAndTheCustomer() {
        onTheRoad();
        Instant eta = NOW.plusSeconds(8 * 3600);

        IncidentResponse r =
                service.sendDelayAlert(job.getId(), delay(IncidentKind.WEATHER, eta, "Heavy rain at Mộc Bài"), khoi);

        assertEquals(IncidentKind.WEATHER, r.kind());
        assertEquals("Bad weather", r.kindLabel());
        assertEquals(IncidentStatus.OPEN, r.status());
        assertEquals(IncidentSource.STAFF, r.source());
        assertEquals(eta, r.etaAt());
        assertEquals((short) 4, r.routePlanVersion());
        verify(routePlans).reviseForIncident(eq(trip), eq(120), any(), anyString(), eq(khoi), eq(Set.of()));
        verify(notices).delayAlert(job, IncidentKind.WEATHER, "Heavy rain at Mộc Bài", 120, r.id());
        verify(notifications)
                .notify(
                        eq(NotificationKind.DELAY_ALERT),
                        eq(Audience.escorts(List.of(minh))),
                        any(),
                        eq("Delay: Bad weather"),
                        eq("Heavy rain at Mộc Bài. The stops ahead on trip TRP-2026-001 move by 2 h; CBRT-2026-041 now"
                                + " arrives 18 Oct 22:05."));
        // The owner hears it from Khôi; Khôi sent it, so isn't told.
        verify(notifications)
                .notify(
                        eq(NotificationKind.DELAY_ALERT),
                        eq(Audience.staff(List.of(yen))),
                        any(),
                        eq("Bad weather: CBRT-2026-041"),
                        anyString());
        verify(audit)
                .recordDecision(
                        eq(khoi),
                        eq("DELAY_ALERT"),
                        eq("Bad weather delay alert on CBRT-2026-041: arrival now 18 Oct 22:05, 2 h later"),
                        eq("INCIDENT"),
                        eq(r.id()),
                        eq("CBRT-2026-041"),
                        eq("Heavy rain at Mộc Bài"),
                        any(),
                        eq("OPEN"));
    }

    @Test
    @DisplayName("Another customer on the trip hears the reason and its own time without the note, and a missed"
            + " window opens an incident for it")
    void aDelayAlertOnASharedTrailer() {
        onTheRoad();
        TransportJob other = job("CBRT-2026-042");
        other.setApprovedBy(yen);
        other.setPlannedArrivalAt(NOW.plusSeconds(5 * 3600));
        other.setWindowEnd(NOW.plusSeconds(6 * 3600));
        when(jobTrips.jobsOn(trip)).thenReturn(List.of(job, other));

        IncidentResponse r = service.sendDelayAlert(
                job.getId(), delay(IncidentKind.BORDER_CONGESTION, NOW.plusSeconds(8 * 3600), "Queue at Bavet"), khoi);

        verify(notices).delayAlert(other, IncidentKind.BORDER_CONGESTION, null, 120, r.id());
        ArgumentCaptor<Incident> saved = ArgumentCaptor.forClass(Incident.class);
        verify(incidents, org.mockito.Mockito.atLeastOnce()).save(saved.capture());
        Incident late = saved.getAllValues().stream()
                .filter(i -> i.getKind() == IncidentKind.LATE_ARRIVAL)
                .findFirst()
                .orElseThrow();
        assertEquals(other, late.getJob());
        assertEquals(
                "The delay alert on CBRT-2026-041 moves CBRT-2026-042's arrival to 18 Oct 21:05, after its window"
                        + " closes at 18 Oct 20:05",
                late.getSummary());
    }

    @Test
    @DisplayName("A delay alert is about traffic, weather or a border, on a job on the road, with a later arrival")
    void whatADelayAlertNeeds() {
        onTheRoad();
        Instant later = NOW.plusSeconds(8 * 3600);
        assertThrows(
                BusinessException.class,
                () -> service.sendDelayAlert(job.getId(), delay(IncidentKind.VEHICLE, later, null), khoi));
        BusinessException earlier = assertThrows(
                BusinessException.class,
                () -> service.sendDelayAlert(
                        job.getId(), delay(IncidentKind.TRAFFIC, NOW.plusSeconds(3600), null), khoi));
        assertEquals(
                "The new arrival must be after the planned one, 18 Oct 20:05. It was 18 Oct 15:05.",
                earlier.getMessage());
        assertThrows(
                BusinessException.class,
                () -> service.sendDelayAlert(
                        job.getId(), delay(IncidentKind.TRAFFIC, NOW.plusSeconds(9 * 24 * 3600), null), khoi));

        TripJob waiting = new TripJob();
        waiting.setTrip(trip);
        waiting.setJob(job);
        waiting.setStatus(TripStatus.NOT_STARTED);
        when(jobTrips.activePartsOf(job)).thenReturn(List.of(waiting));
        BusinessException notMoving = assertThrows(
                BusinessException.class,
                () -> service.sendDelayAlert(job.getId(), delay(IncidentKind.TRAFFIC, later, null), khoi));
        assertEquals(
                "CBRT-2026-041 isn't on the road: before departure, its times move on the Route tab",
                notMoving.getMessage());
        verify(routePlans, never()).reviseForIncident(any(), anyInt(), any(), anyString(), any(), any());
    }

    // ---------- closing (US-F5-05) ----------

    private static ResolveIncidentRequest closing() {
        return new ResolveIncidentRequest(
                "Second trailer delivered both horses at 17:40", "Tyre supplier on QL22 to be reviewed.");
    }

    @Test
    @DisplayName("Closing records the resolution and the note, and tells whoever worked on it, the cab included")
    void closingAnIncident() {
        Incident i = proposed();
        service.decide(i.getId(), approve(i, false), yen);
        i.setReportedBy(minh);

        IncidentResponse r = service.resolve(i.getId(), closing(), yen);

        assertEquals(IncidentStatus.RESOLVED, r.status());
        assertEquals("Second trailer delivered both horses at 17:40", r.resolution());
        assertEquals("Tyre supplier on QL22 to be reviewed.", r.closingNote());
        assertEquals(NOW, r.resolvedAt());
        assertEquals("Vũ Hải Yến", r.resolvedByName());
        verify(audit)
                .recordDecision(
                        eq(yen),
                        eq("RESOLVE_INCIDENT"),
                        eq("Closed the incident on CBRT-2026-041: Second trailer delivered both horses at 17:40"),
                        eq("INCIDENT"),
                        eq(i.getId()),
                        eq("CBRT-2026-041"),
                        eq("Tyre supplier on QL22 to be reviewed."),
                        eq("DECIDED"),
                        eq("RESOLVED"));
        verify(notifications)
                .notify(
                        eq(NotificationKind.INCIDENT_RESOLVED),
                        eq(Audience.staff(List.of(khoi))),
                        any(),
                        eq("Closed: Vehicle breakdown on CBRT-2026-041"),
                        anyString());
        verify(notifications)
                .notify(
                        eq(NotificationKind.INCIDENT_RESOLVED),
                        eq(Audience.escorts(List.of(minh))),
                        any(),
                        anyString(),
                        anyString());
    }

    @Test
    @DisplayName("An incident isn't closed while a proposal waits, nor closed twice")
    void closingRefusals() {
        Incident i = proposed();
        assertThrows(BusinessException.class, () -> service.resolve(i.getId(), closing(), yen));

        service.decide(i.getId(), approve(i, false), yen);
        service.resolve(i.getId(), closing(), yen);
        BusinessException twice =
                assertThrows(BusinessException.class, () -> service.resolve(i.getId(), closing(), yen));
        assertEquals("The incident was already closed on 18 Oct 14:05", twice.getMessage());
    }

    @Test
    @DisplayName("The resolution and the closing note are both required")
    void resolutionAndNoteAreRequired() {
        try (var factory = jakarta.validation.Validation.buildDefaultValidatorFactory()) {
            var validator = factory.getValidator();
            assertEquals(
                    1,
                    validator.validate(new ResolveIncidentRequest(" ", "Note")).size());
            assertEquals(
                    1,
                    validator
                            .validate(new ResolveIncidentRequest("Resolved", null))
                            .size());
            assertEquals(0, validator.validate(closing()).size());
        }
    }

    @Test
    @DisplayName("The job keeps each incident with its timeline, oldest first")
    void theJobKeepsTheTimeline() {
        Incident i = opened();
        i.setOpenedAt(NOW);
        when(jobs.existsById(job.getId())).thenReturn(true);
        when(incidents.findByJob_IdOrderByOpenedAtAsc(job.getId())).thenReturn(List.of(i));
        AuditLog raised = new AuditLog();
        raised.setEntityId(i.getId());
        raised.setOccurredAt(NOW);
        raised.setSummary("Vehicle breakdown reported on CBRT-2026-041 at QL22 km 41");
        raised.setActorLabel("Trần Minh");
        AuditLog closed = new AuditLog();
        closed.setEntityId(i.getId());
        closed.setOccurredAt(NOW.plusSeconds(3600));
        closed.setSummary("Closed the incident on CBRT-2026-041: Tyre changed");
        closed.setActorLabel("Vũ Hải Yến");
        when(auditLogs.findByEntityTypeAndEntityIdInOrderByOccurredAtAsc("INCIDENT", List.of(i.getId())))
                .thenReturn(List.of(raised, closed));

        List<JobIncidentResponse> list = service.ofJob(job.getId());

        assertEquals(1, list.size());
        assertEquals(
                List.of(raised.getSummary(), closed.getSummary()),
                list.getFirst().timeline().stream().map(h -> h.getSummary()).toList());
        assertThrows(ResourceNotFoundException.class, () -> service.ofJob(UUID.randomUUID()));
    }
}
