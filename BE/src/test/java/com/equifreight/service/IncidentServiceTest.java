package com.equifreight.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.equifreight.entity.Club;
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
import com.equifreight.entity.User;
import com.equifreight.entity.enums.IncidentKind;
import com.equifreight.entity.enums.IncidentSource;
import com.equifreight.entity.enums.IncidentStatus;
import com.equifreight.entity.enums.NotificationKind;
import com.equifreight.entity.enums.RoleName;
import com.equifreight.entity.enums.TripHorseStatus;
import com.equifreight.entity.enums.TripStatus;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.model.incident.AddIncidentOptionRequest;
import com.equifreight.model.incident.DecideIncidentRequest;
import com.equifreight.model.incident.IncidentResponse;
import com.equifreight.model.incident.ProposeOptionRequest;
import com.equifreight.model.incident.RaiseIncidentRequest;
import com.equifreight.model.incident.ReturnProposalRequest;
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
        when(jobTrips.findTripOf(any())).thenReturn(Optional.of(trip));
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
        when(routePlans.reviseForIncident(eq(trip), eq(90), any(), anyString(), eq(yen)))
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
        verify(routePlans, never()).reviseForIncident(any(), anyInt(), any(), any(), any());
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
}
