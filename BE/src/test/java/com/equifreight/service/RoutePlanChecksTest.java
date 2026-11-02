package com.equifreight.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.equifreight.entity.*;
import com.equifreight.entity.enums.RoutePlanStatus;
import com.equifreight.entity.enums.RouteStopKind;
import com.equifreight.entity.enums.TransportMode;
import com.equifreight.exception.BusinessException;
import com.equifreight.model.job.CreateRoutePlanRequest;
import com.equifreight.repository.*;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** A route is saved and confirmed only when it can be driven: its times run forward and it rests the horses. */
class RoutePlanChecksTest {

    private final RoutePlanRepository plans = mock(RoutePlanRepository.class);
    private final TransportJobRepository jobs = mock(TransportJobRepository.class);
    private final JobTripService jobTrips = mock(JobTripService.class);
    private final QuarantinePeriodRepository quarantines = mock(QuarantinePeriodRepository.class);
    private RoutePlanService service;

    private final TransportJob job = new TransportJob();
    private final Trip trip = new Trip();
    private final Corridor corridor = new Corridor();

    @BeforeEach
    void setUp() {
        job.setId(UUID.randomUUID());
        job.setCode("CBRT-2026-041");
        trip.setId(UUID.randomUUID());
        trip.setCode("TRP-2026-001");
        corridor.setMode(TransportMode.ROAD);
        trip.setCorridor(corridor);
        when(jobs.findById(job.getId())).thenReturn(Optional.of(job));
        when(jobTrips.tripOf(job.getId(), null)).thenReturn(trip);
        when(plans.save(any(RoutePlan.class))).thenAnswer(i -> i.getArgument(0));
        service = new RoutePlanService(
                plans,
                mock(RouteStopRepository.class),
                mock(RouteLegRepository.class),
                mock(FlightRepository.class),
                jobs,
                mock(PlaceRepository.class),
                mock(BorderCrossingRepository.class),
                mock(VehicleRepository.class),
                mock(ClearanceService.class),
                jobTrips,
                mock(AuditService.class),
                mock(TripNotices.class),
                PlanningStub.planningDefaults(),
                new QuarantineRules(quarantines));
    }

    private static RouteStop stop(RouteStopKind kind, String at, Integer stayMin) {
        RouteStop stop = new RouteStop();
        stop.setId(UUID.randomUUID());
        stop.setKind(kind);
        stop.setPlannedAt(at == null ? null : Instant.parse(at));
        stop.setPlannedStayMin(stayMin == null ? null : stayMin.shortValue());
        return stop;
    }

    private RoutePlan planOf(RouteStop... stops) {
        RoutePlan plan = new RoutePlan();
        plan.setId(UUID.randomUUID());
        plan.setTrip(trip);
        plan.setVersionNo((short) 1);
        plan.setStatus(RoutePlanStatus.DRAFT);
        for (int i = 0; i < stops.length; i++) {
            stops[i].setSeq((short) (i + 1));
            plan.getStops().add(stops[i]);
        }
        when(plans.findById(plan.getId())).thenReturn(Optional.of(plan));
        return plan;
    }

    private static CreateRoutePlanRequest.StopItem item(int seq, RouteStopKind kind, String at, Integer stayMin) {
        return CreateRoutePlanRequest.StopItem.builder()
                .seq((short) seq)
                .kind(kind)
                .plannedAt(at == null ? null : Instant.parse(at))
                .plannedStayMin(stayMin == null ? null : stayMin.shortValue())
                .build();
    }

    @Test
    @DisplayName("A draft whose welfare stop comes before the border it follows is refused before anything is saved")
    void aDraftWithTimesRunningBackwardsIsRefused() {
        // Stops 2 and 3 were swapped in the editor: the welfare stop now comes after the border but is timed before it.
        CreateRoutePlanRequest request = new CreateRoutePlanRequest(
                null,
                null,
                null,
                List.of(
                        item(1, RouteStopKind.PICKUP, "2026-12-01T23:00:00Z", null),
                        item(2, RouteStopKind.BORDER, "2026-12-02T03:00:00Z", 90),
                        item(3, RouteStopKind.WELFARE, "2026-12-02T01:00:00Z", 45),
                        item(4, RouteStopKind.DELIVERY, "2026-12-02T08:00:00Z", null)),
                List.of());

        BusinessException refused = assertThrows(
                BusinessException.class, () -> service.createOrUpdateDraft(job.getId(), request, new User()));

        // Business time is Asia/Ho_Chi_Minh, UTC+7; no raw instants in the message.
        assertThat(refused.getMessage())
                .isEqualTo("Stop 3, a welfare stop, is planned at 2 Dec 08:00, before the horses leave stop 2, the"
                        + " border crossing, at 2 Dec 11:30 (2 Dec 10:00 plus a 90 min stay). Plan it later, or"
                        + " recalculate the times from the departure.");
        verify(plans, never()).save(any());
    }

    @Test
    @DisplayName("A stop planned inside the stay before it is refused at confirmation")
    void aStopInsideThePreviousStayIsRefusedAtConfirmation() {
        RoutePlan plan = planOf(
                stop(RouteStopKind.PICKUP, "2026-12-01T23:00:00Z", null),
                stop(RouteStopKind.BORDER, "2026-12-02T03:00:00Z", 90),
                stop(RouteStopKind.DELIVERY, "2026-12-02T04:00:00Z", null));

        BusinessException refused = assertThrows(
                BusinessException.class, () -> service.confirmRoutePlan(job.getId(), plan.getId(), null, new User()));

        assertThat(refused.getMessage()).startsWith("Stop 3, the delivery, is planned at 2 Dec 11:00");
        assertThat(plan.getStatus()).isEqualTo(RoutePlanStatus.DRAFT);
    }

    @Test
    @DisplayName("Untimed stops are skipped, and a stop may be planned as the stay before it ends")
    void untimedStopsAndBackToBackTimesAreAccepted() {
        RoutePlan plan = planOf(
                stop(RouteStopKind.PICKUP, "2026-12-01T23:00:00Z", null),
                stop(RouteStopKind.BORDER, "2026-12-02T03:00:00Z", 90),
                stop(RouteStopKind.WELFARE, null, 45),
                stop(RouteStopKind.DELIVERY, "2026-12-02T04:30:00Z", null));

        service.confirmRoutePlan(job.getId(), plan.getId(), null, new User());

        assertThat(plan.getStatus()).isEqualTo(RoutePlanStatus.CONFIRMED);
    }

    @Test
    @DisplayName("A road route short of the welfare stops its drive needs is refused at confirmation (US-F3-22)")
    void aRouteShortOfWelfareStopsIsRefused() {
        // 600 km at the default 60 km/h is 10 h of driving: one welfare stop every 4 h makes two.
        corridor.setDistanceKm(600);
        RoutePlan plan = planOf(
                stop(RouteStopKind.PICKUP, "2026-12-01T23:00:00Z", null),
                stop(RouteStopKind.WELFARE, "2026-12-02T03:00:00Z", 45),
                stop(RouteStopKind.DELIVERY, "2026-12-02T10:00:00Z", null));

        BusinessException refused = assertThrows(
                BusinessException.class, () -> service.confirmRoutePlan(job.getId(), plan.getId(), null, new User()));

        assertThat(refused.getMessage())
                .isEqualTo("The drive takes about 10 h, so the route needs 2 welfare stops, one every 4 h of driving;"
                        + " it has 1. Add a welfare stop before you confirm.");
        assertThat(plan.getStatus()).isEqualTo(RoutePlanStatus.DRAFT);
    }

    @Test
    @DisplayName("A road route with the welfare stops its drive needs is confirmed, and a draft may still be short")
    void aRouteWithEnoughWelfareStopsIsConfirmed() {
        corridor.setDistanceKm(600);
        RoutePlan plan = planOf(
                stop(RouteStopKind.PICKUP, "2026-12-01T23:00:00Z", null),
                stop(RouteStopKind.WELFARE, "2026-12-02T03:00:00Z", 45),
                stop(RouteStopKind.WELFARE, "2026-12-02T07:00:00Z", 45),
                stop(RouteStopKind.DELIVERY, "2026-12-02T10:00:00Z", null));

        assertThat(service.toResponse(plan, job.getId()).welfareStopsNeeded()).isEqualTo(2);
        service.confirmRoutePlan(job.getId(), plan.getId(), null, new User());

        assertThat(plan.getStatus()).isEqualTo(RoutePlanStatus.CONFIRMED);
    }

    @Test
    @DisplayName("A delivery after the arrival window is refused in local time, naming the job")
    void aLateDeliveryNamesTheWindowInLocalTime() {
        job.setWindowEnd(Instant.parse("2026-12-02T07:00:00Z"));
        RoutePlan plan = planOf(
                stop(RouteStopKind.PICKUP, "2026-12-01T23:00:00Z", null),
                stop(RouteStopKind.DELIVERY, "2026-12-02T08:00:00Z", null));

        BusinessException refused = assertThrows(
                BusinessException.class, () -> service.confirmRoutePlan(job.getId(), plan.getId(), null, new User()));

        assertThat(refused.getMessage())
                .isEqualTo("CBRT-2026-041's delivery is planned at 2 Dec 15:00, after its arrival window closes at"
                        + " 2 Dec 14:00. Plan the delivery earlier, or agree a later window with the customer.");
    }

    private Place stationWithQuarantine(String startsOn, String endsOn) {
        Place station = new Place();
        station.setId(UUID.randomUUID());
        station.setName("Đại Nam isolation barn");
        QuarantinePeriod quarantine = new QuarantinePeriod();
        quarantine.setJob(job);
        quarantine.setPlace(station);
        quarantine.setStartsOn(LocalDate.parse(startsOn));
        quarantine.setEndsOn(LocalDate.parse(endsOn));
        when(quarantines.findByJobIdAndPlaceIdAndCompletedAtIsNull(job.getId(), station.getId()))
                .thenReturn(List.of(quarantine));
        return station;
    }

    private static RouteStop at(RouteStop stop, Place place) {
        stop.setPlace(place);
        return stop;
    }

    @Test
    @DisplayName("A pickup at the station before the quarantine ends is refused, naming both times (US-F3-22)")
    void aPickupBeforeTheQuarantineEndsIsRefused() {
        Place station = stationWithQuarantine("2026-11-20", "2026-11-27");
        RoutePlan plan = planOf(
                at(stop(RouteStopKind.PICKUP, "2026-11-26T01:00:00Z", null), station),
                stop(RouteStopKind.DELIVERY, "2026-11-26T03:00:00Z", null));

        BusinessException refused = assertThrows(
                BusinessException.class, () -> service.confirmRoutePlan(job.getId(), plan.getId(), null, new User()));

        assertThat(refused.getMessage())
                .isEqualTo("TRP-2026-001 collects the horses at 08:00 on 26 Nov; their quarantine at Đại Nam isolation"
                        + " barn ends on 27 Nov. Plan the pickup on or after then.");
        assertThat(plan.getStatus()).isEqualTo(RoutePlanStatus.DRAFT);
    }

    @Test
    @DisplayName("A pickup on the quarantine's last day, in business time, is confirmed")
    void aPickupOnTheLastDayIsConfirmed() {
        Place station = stationWithQuarantine("2026-11-20", "2026-11-27");
        // 00:30 on 27 Nov in Ho Chi Minh City is still 26 Nov in UTC.
        RoutePlan plan = planOf(
                at(stop(RouteStopKind.PICKUP, "2026-11-26T17:30:00Z", null), station),
                stop(RouteStopKind.DELIVERY, "2026-11-26T20:00:00Z", null));

        service.confirmRoutePlan(job.getId(), plan.getId(), null, new User());

        assertThat(plan.getStatus()).isEqualTo(RoutePlanStatus.CONFIRMED);
    }

    @Test
    @DisplayName("A transfer into the station after the quarantine starts is refused (US-F3-22)")
    void aTransferAfterTheQuarantineStartsIsRefused() {
        Place station = stationWithQuarantine("2026-11-20", "2026-11-27");
        when(jobTrips.handsOn(trip, job)).thenReturn(true);
        RoutePlan plan = planOf(
                stop(RouteStopKind.PICKUP, "2026-11-21T00:00:00Z", null),
                at(stop(RouteStopKind.TRANSFER, "2026-11-21T07:00:00Z", null), station));

        BusinessException refused = assertThrows(
                BusinessException.class, () -> service.confirmRoutePlan(job.getId(), plan.getId(), null, new User()));

        assertThat(refused.getMessage())
                .isEqualTo("TRP-2026-001 brings the horses to Đại Nam isolation barn at 14:00 on 21 Nov; their"
                        + " quarantine there starts on 20 Nov. Plan the transfer on or before then.");
    }

    @Test
    @DisplayName("A transfer on the quarantine's first day is confirmed")
    void aTransferOnTheFirstDayIsConfirmed() {
        Place station = stationWithQuarantine("2026-11-20", "2026-11-27");
        when(jobTrips.handsOn(trip, job)).thenReturn(true);
        RoutePlan plan = planOf(
                stop(RouteStopKind.PICKUP, "2026-11-20T00:00:00Z", null),
                at(stop(RouteStopKind.TRANSFER, "2026-11-20T07:00:00Z", null), station));

        service.confirmRoutePlan(job.getId(), plan.getId(), null, new User());

        assertThat(plan.getStatus()).isEqualTo(RoutePlanStatus.CONFIRMED);
    }
}
