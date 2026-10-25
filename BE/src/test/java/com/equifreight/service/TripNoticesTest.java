package com.equifreight.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.equifreight.entity.Club;
import com.equifreight.entity.Place;
import com.equifreight.entity.RoutePlan;
import com.equifreight.entity.RouteStop;
import com.equifreight.entity.TransportJob;
import com.equifreight.entity.TransportRequest;
import com.equifreight.entity.Trip;
import com.equifreight.entity.enums.DossierStatus;
import com.equifreight.entity.enums.NotificationKind;
import com.equifreight.entity.enums.NotificationSubject;
import com.equifreight.entity.enums.RouteStopKind;
import com.equifreight.repository.RoutePlanRepository;
import com.equifreight.service.notification.Audience;
import com.equifreight.service.notification.Subject;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/** The customer notices of US-F3-14 (docs/shared-trips-design.md, Customer notifications). */
@ExtendWith(MockitoExtension.class)
class TripNoticesTest {

    // 18 Oct 2026 13:00 and 20 Oct 18:00 in Vietnam time.
    private static final Instant DEPART = Instant.parse("2026-10-18T06:00:00Z");
    private static final Instant ARRIVE = Instant.parse("2026-10-20T11:00:00Z");

    @Mock
    private NotificationService notifications;

    @Mock
    private RoutePlanRepository routePlans;

    private TripNotices notices;
    private Trip trip;
    private TransportJob a;
    private TransportJob b;

    @BeforeEach
    void setUp() {
        notices = new TripNotices(notifications, routePlans);
        trip = new Trip();
        trip.setId(UUID.randomUUID());
        trip.setCode("TRP-2026-004");
        a = job("CBRT-2026-041", "Hồ Chí Minh City");
        b = job("CBRT-2026-042", "Biên Hòa");
    }

    private static TransportJob job(String code, String origin) {
        Club club = new Club();
        club.setId(UUID.randomUUID());
        Place place = new Place();
        place.setName(origin);
        TransportRequest request = new TransportRequest();
        request.setId(UUID.randomUUID());
        request.setClub(club);
        request.setOriginPlace(place);
        TransportJob job = new TransportJob();
        job.setId(UUID.randomUUID());
        job.setCode(code);
        job.setRequest(request);
        job.setDossierStatus(DossierStatus.CLEARANCE_READY);
        return job;
    }

    /** A confirmed route with a pickup and a delivery for each job, each pickup an hour after the last. */
    private RoutePlan plan(TransportJob... jobs) {
        RoutePlan plan = new RoutePlan();
        plan.setId(UUID.randomUUID());
        plan.setTrip(trip);
        plan.setConfirmedAt(Instant.now());
        List<RouteStop> stops = new ArrayList<>();
        for (int i = 0; i < jobs.length; i++) {
            stops.add(stop(jobs[i], RouteStopKind.PICKUP, DEPART.plusSeconds(3600L * i)));
        }
        for (TransportJob job : jobs) stops.add(stop(job, RouteStopKind.DELIVERY, ARRIVE));
        plan.setStops(stops);
        return plan;
    }

    private static RouteStop stop(TransportJob job, RouteStopKind kind, Instant at) {
        RouteStop stop = new RouteStop();
        stop.setId(UUID.randomUUID());
        stop.setKind(kind);
        stop.setJob(job);
        stop.setPlannedAt(at);
        Place place = new Place();
        place.setName(
                kind == RouteStopKind.PICKUP ? job.getRequest().getOriginPlace().getName() : "Bangkok");
        stop.setPlace(place);
        return stop;
    }

    private void previously(RoutePlan previous, RoutePlan now) {
        when(routePlans.findFirstByTrip_IdAndConfirmedAtIsNotNullAndIdNotOrderByConfirmedAtDesc(
                        trip.getId(), now.getId()))
                .thenReturn(Optional.ofNullable(previous));
    }

    /** Confirms {@code now}, as RoutePlanService does: times before, then the plan's times on each job. */
    private void confirm(RoutePlan now, TransportJob... jobs) {
        Map<UUID, TripNotices.Times> before = TripNotices.timesOf(List.of(jobs));
        for (TransportJob job : jobs) {
            job.setPlannedDepartureAt(DEPART);
            now.getStops().stream()
                    .filter(st -> st.getKind() == RouteStopKind.DELIVERY && st.getJob() == job)
                    .findFirst()
                    .ifPresent(st -> job.setPlannedArrivalAt(st.getPlannedAt()));
        }
        notices.confirmed(trip, now, List.of(jobs), before);
    }

    private record Sent(
            NotificationKind kind, Audience audience, Subject subject, String title, String body, String key) {}

    private List<Sent> sent() {
        ArgumentCaptor<NotificationKind> kind = ArgumentCaptor.forClass(NotificationKind.class);
        ArgumentCaptor<Audience> audience = ArgumentCaptor.forClass(Audience.class);
        ArgumentCaptor<Subject> subject = ArgumentCaptor.forClass(Subject.class);
        ArgumentCaptor<String> title = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> body = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> key = ArgumentCaptor.forClass(String.class);
        verify(notifications, org.mockito.Mockito.atLeastOnce())
                .notify(
                        kind.capture(),
                        audience.capture(),
                        subject.capture(),
                        title.capture(),
                        body.capture(),
                        key.capture());
        List<Sent> sent = new ArrayList<>();
        for (int i = 0; i < kind.getAllValues().size(); i++) {
            sent.add(new Sent(
                    kind.getAllValues().get(i),
                    audience.getAllValues().get(i),
                    subject.getAllValues().get(i),
                    title.getAllValues().get(i),
                    body.getAllValues().get(i),
                    key.getAllValues().get(i)));
        }
        return sent;
    }

    private void nothingSent() {
        verify(notifications, never()).notify(any(), any(), any(), anyString(), anyString(), anyString());
    }

    @Test
    @DisplayName("Confirming a trip with two jobs tells each club its horses share a trailer, naming only its own job")
    void sharingIsAnnounced() {
        RoutePlan now = plan(a, b);
        previously(null, now);

        confirm(now, a, b);

        List<Sent> sent = sent();
        assertEquals(2, sent.size());
        Sent toA = sent.getFirst();
        assertEquals(NotificationKind.TRIP_SHARED, toA.kind());
        assertEquals("Your horses will share a trailer", toA.title());
        assertEquals(
                "CBRT-2026-041 will travel with another client's horses on the same trailer, leaving Hồ Chí Minh City"
                        + " on 18 Oct at 13:00. Your price and your documents don't change. Each horse keeps its own"
                        + " stall, and the escort cares for every horse on board.",
                toA.body());
        assertEquals(new Audience.ClubAccounts(a.getRequest().getClub().getId()), toA.audience());
        assertEquals(NotificationSubject.TRIP_TRACKING, toA.subject().type());
        assertEquals("TRIP_SHARED:" + a.getId() + ":" + now.getId(), toA.key());
        // B leaves from its own pickup, an hour later; neither notice names the other job or the trip.
        assertTrue(sent.get(1).body().startsWith("CBRT-2026-042 will travel"));
        assertTrue(sent.get(1).body().contains("Biên Hòa on 18 Oct at 14:00"));
        for (Sent s : sent) {
            assertFalse(s.body().contains("TRP-") || s.title().contains("TRP-"));
        }
        assertFalse(toA.body().contains("CBRT-2026-042"));
    }

    @Test
    @DisplayName("A job that joins tells both clubs; a job already shared and on time hears nothing again")
    void onlyNewSharingIsAnnounced() {
        RoutePlan before = plan(a);
        RoutePlan now = plan(a, b);
        previously(before, now);
        a.setPlannedDepartureAt(DEPART);
        a.setPlannedArrivalAt(ARRIVE);

        confirm(now, a, b);

        List<Sent> sent = sent();
        assertEquals(
                List.of(NotificationKind.TRIP_SHARED, NotificationKind.TRIP_SHARED),
                sent.stream().map(Sent::kind).toList());
    }

    @Test
    @DisplayName("Reconfirming a shared trip without moving anyone's times sends nothing")
    void sameSharedTripIsQuiet() {
        RoutePlan before = plan(a, b);
        RoutePlan now = plan(a, b);
        previously(before, now);
        for (TransportJob j : List.of(a, b)) {
            j.setPlannedDepartureAt(DEPART);
            j.setPlannedArrivalAt(ARRIVE);
        }

        confirm(now, a, b);

        nothingSent();
    }

    @Test
    @DisplayName("When a job leaves and the other's times move, its club gets the new times, inside its window")
    void movedTimesAreAnnounced() {
        RoutePlan before = plan(a, b);
        RoutePlan now = plan(a);
        previously(before, now);
        a.setPlannedDepartureAt(DEPART.minusSeconds(86_400));
        a.setPlannedArrivalAt(ARRIVE.minusSeconds(86_400));
        a.setWindowEnd(ARRIVE.plusSeconds(3600));

        confirm(now, a);

        Sent s = sent().getFirst();
        assertEquals(NotificationKind.TRIP_TIMES_CHANGED, s.kind());
        assertEquals("New times for CBRT-2026-041", s.title());
        assertEquals(
                "Your horses now leave Hồ Chí Minh City on 18 Oct at 13:00 and arrive on 20 Oct at 18:00, still"
                        + " inside your window. Your price doesn't change.",
                s.body());
        assertEquals("TRIP_TIMES_CHANGED:" + a.getId() + ":" + now.getId(), s.key());
    }

    @Test
    @DisplayName("When a job leaves and the other's times stay, nobody is told")
    void unchangedTimesAreQuiet() {
        RoutePlan before = plan(a, b);
        RoutePlan now = plan(a);
        previously(before, now);
        a.setPlannedDepartureAt(DEPART);
        a.setPlannedArrivalAt(ARRIVE);

        confirm(now, a);

        nothingSent();
    }

    @Test
    @DisplayName(
            "A first plan for a job that never had times sends nothing; a replanned job's new trip sends its times")
    void firstTimesAndReplannedTimes() {
        RoutePlan now = plan(a);
        previously(null, now);
        confirm(now, a);
        nothingSent();

        // B was taken off a shared trip with times, and its own trip is confirmed for the first time.
        RoutePlan own = plan(b);
        previously(null, own);
        b.setPlannedDepartureAt(DEPART);
        b.setPlannedArrivalAt(ARRIVE);
        confirm(own, b);

        assertEquals(NotificationKind.TRIP_TIMES_CHANGED, sent().getFirst().kind());
    }

    @Test
    @DisplayName("A job taken off for its documents is told why, and that its price doesn't change")
    void replannedForItsDocuments() {
        a.setPlannedDepartureAt(DEPART);
        a.setDossierStatus(DossierStatus.OPEN);
        a.setWindowEnd(ARRIVE);

        notices.replanned(a, trip);

        verify(notifications)
                .notify(
                        eq(NotificationKind.JOB_REPLANNED),
                        eq(new Audience.ClubAccounts(a.getRequest().getClub().getId())),
                        any(),
                        eq("CBRT-2026-041 is being replanned"),
                        eq("Your documents weren't cleared in time for the trailer leaving on 18 Oct, so your horses"
                                + " won't travel on it. We're planning a new departure inside your window and will"
                                + " confirm it here. Your price doesn't change."),
                        eq("JOB_REPLANNED:" + a.getId() + ":" + trip.getId()));
    }

    @Test
    @DisplayName("A cleared job taken off is told the plan changed; one never given times isn't told")
    void replannedForThePlan() {
        notices.replanned(a, trip);
        verifyNoInteractions(notifications);

        a.setPlannedDepartureAt(DEPART);
        notices.replanned(a, trip);

        assertTrue(sent().getFirst().body().startsWith("The plan for the trailer leaving on 18 Oct changed, so"));
    }

    @Test
    @DisplayName("Customs cleared tells the club where and when, keyed by the border")
    void customsClearedIsAnnounced() {
        RouteStop border = stop(a, RouteStopKind.BORDER, ARRIVE);
        border.getPlace().setName("Mộc Bài");

        notices.clearedCustoms(a, border, ARRIVE, UUID.randomUUID());

        Sent sent = sent().getFirst();
        assertEquals(NotificationKind.HORSES_CLEARED_CUSTOMS, sent.kind());
        assertEquals("Your horses cleared customs at Mộc Bài", sent.title());
        assertEquals(
                "CBRT-2026-041 cleared customs at Mộc Bài on 20 Oct at 18:00 and is on its way."
                        + " Follow it leg by leg on the tracking page.",
                sent.body());
        assertEquals("HORSES_CLEARED_CUSTOMS:" + a.getId() + ":" + border.getId(), sent.key());
    }

    @Test
    @DisplayName("Arrival tells the club its horses reached the handover point, once per trip")
    void arrivalIsAnnounced() {
        RouteStop delivery = stop(a, RouteStopKind.DELIVERY, ARRIVE);

        notices.arrived(a, trip, delivery, ARRIVE);

        Sent sent = sent().getFirst();
        assertEquals(NotificationKind.HORSES_ARRIVED, sent.kind());
        assertEquals("Your horses have arrived at Bangkok", sent.title());
        assertTrue(sent.body().startsWith("CBRT-2026-041 reached Bangkok on 20 Oct at 18:00."));
        assertEquals("HORSES_ARRIVED:" + a.getId() + ":" + trip.getId(), sent.key());
    }
}
