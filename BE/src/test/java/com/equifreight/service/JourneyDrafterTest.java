package com.equifreight.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.equifreight.entity.BorderCrossing;
import com.equifreight.entity.Corridor;
import com.equifreight.entity.CorridorCrossing;
import com.equifreight.entity.Country;
import com.equifreight.entity.Place;
import com.equifreight.entity.TransportJob;
import com.equifreight.entity.TransportRequest;
import com.equifreight.entity.Trip;
import com.equifreight.entity.TripJob;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.PlaceKind;
import com.equifreight.entity.enums.RatePolicyKey;
import com.equifreight.entity.enums.RouteStopKind;
import com.equifreight.entity.enums.TransportMode;
import com.equifreight.exception.BusinessException;
import com.equifreight.repository.PlaceRepository;
import com.equifreight.repository.RoutePlanRepository;
import com.equifreight.repository.RouteStopRepository;
import com.equifreight.repository.TransportJobRepository;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** US-F3-22: a journey drafted from its quoted route, its road routes timed from the planning settings. */
class JourneyDrafterTest {

    private static final PlanningDefaults.Planning DEFAULTS = PlanningDefaults.of(Map.of());
    /** 18 Oct 2026, 06:00 in Ho Chi Minh City. */
    private static final Instant START = Instant.parse("2026-10-17T23:00:00Z");

    private final Country vn = country("VN", "Vietnam");
    private final Country kh = country("KH", "Cambodia");
    private final BorderCrossing mocBai = crossing("Mộc Bài – Bavet", vn, kh);
    private final Place phuTho = place("Phú Thọ training centre", PlaceKind.TRAINING_CENTRE, "Ho Chi Minh City", vn);
    private final Place phnomPenh = place("Phnom Penh Equestrian Centre", PlaceKind.STABLE, "Phnom Penh", kh);
    private final Place svayRieng = place("Svay Rieng welfare stop", PlaceKind.WELFARE_STOP, "Svay Rieng", kh);

    @Test
    @DisplayName("A road route crosses its borders in order and takes a welfare stop per interval of driving")
    void aRoadRouteHasItsBorderAndWelfareStops() {
        // 480 km at 60 km/h is 8 h of driving: one welfare stop at the 4 h interval (a second would fall at the end).
        Trip trip = trip(corridor("RD HCM → PNH", "Ho Chi Minh City", "Phnom Penh", 480, vn, kh, mocBai), false);

        JourneyDrafter.DraftRoute route = JourneyDrafter.road(
                trip, phuTho, RouteStopKind.DELIVERY, phnomPenh, START, false, DEFAULTS, List.of(svayRieng));

        assertThat(route.stops())
                .extracting(JourneyDrafter.DraftStop::kind)
                .containsExactly(
                        RouteStopKind.PICKUP, RouteStopKind.BORDER, RouteStopKind.WELFARE, RouteStopKind.DELIVERY);
        assertThat(route.stops().get(1).crossing()).isSameAs(mocBai);
        assertThat(route.stops().get(2).place()).isSameAs(svayRieng);
        assertThat(route.legKm()).isEqualTo(160);
        assertThat(route.legMin()).isEqualTo(160);
        // 06:00, then 160 min to the border (+90 min there), 160 min to the welfare stop (+45), 160 min to delivery.
        assertThat(route.stops())
                .extracting(JourneyDrafter.DraftStop::plannedAt)
                .containsExactly(
                        START,
                        Instant.parse("2026-10-18T01:40:00Z"),
                        Instant.parse("2026-10-18T05:50:00Z"),
                        Instant.parse("2026-10-18T09:15:00Z"));
        assertThat(route.notes()).isEmpty();
    }

    @Test
    @DisplayName("A route run the other way crosses the border from the other side")
    void aReversedRouteReadsItsCountriesBackwards() {
        Trip trip = trip(corridor("RD HCM → PNH", "Ho Chi Minh City", "Phnom Penh", 480, vn, kh, mocBai), true);

        JourneyDrafter.DraftRoute route = JourneyDrafter.road(
                trip, phnomPenh, RouteStopKind.DELIVERY, phuTho, START, false, DEFAULTS, List.of(svayRieng));

        // Cambodia first: the welfare stop there comes before the border back into Vietnam.
        assertThat(route.stops())
                .extracting(JourneyDrafter.DraftStop::kind)
                .containsExactly(
                        RouteStopKind.PICKUP, RouteStopKind.WELFARE, RouteStopKind.BORDER, RouteStopKind.DELIVERY);
    }

    @Test
    @DisplayName("A drive with no welfare place in its countries says so in the draft")
    void aMissingWelfarePlaceIsNamed() {
        Place hoaXuan = place("Hòa Xuân racing stables", PlaceKind.STABLE, "Da Nang", vn);
        Place sgn = place("Tân Sơn Nhất cargo terminal (SGN)", PlaceKind.CARGO_TERMINAL, "Ho Chi Minh City", vn);
        Trip trip = trip(corridor("RD DAD → HCM", "Da Nang", "Ho Chi Minh City", 960, vn, vn, null), false);

        JourneyDrafter.DraftRoute route = JourneyDrafter.road(
                trip, hoaXuan, RouteStopKind.TRANSFER, sgn, START, true, DEFAULTS, List.of(svayRieng));

        assertThat(route.stops())
                .extracting(JourneyDrafter.DraftStop::kind)
                .containsExactly(RouteStopKind.PICKUP, RouteStopKind.TRANSFER);
        assertThat(route.notes())
                .containsExactly("The drive takes about 16 h, so it needs 3 welfare stops; the catalog has 0 in"
                        + " Vietnam. Add one if the drive needs a rest.");
        // Before the flight the horses wait at the cargo terminal: 4 h by default.
        assertThat(route.stops().getLast().stayMin()).isEqualTo((short) 240);
    }

    @Test
    @DisplayName("A route after a flight has no times until the flight's are set")
    void aRouteAfterAFlightIsUntimed() {
        Country hk = country("HK", "Hong Kong");
        Place hkg = place("HKG cargo terminal", PlaceKind.CARGO_TERMINAL, "Hong Kong", hk);
        Place shaTin = place("Sha Tin stables", PlaceKind.STABLE, "Sha Tin", hk);
        Trip trip = trip(corridor("RD HKG → Sha Tin", "Hong Kong", "Sha Tin", 40, hk, hk, null), false);

        JourneyDrafter.DraftRoute route =
                JourneyDrafter.road(trip, hkg, RouteStopKind.DELIVERY, shaTin, null, false, DEFAULTS, List.of());

        assertThat(route.stops())
                .extracting(JourneyDrafter.DraftStop::plannedAt)
                .containsOnlyNulls();
        assertThat(route.notes()).containsExactly("Plan the times once the trip before is timed.");
    }

    @Test
    @DisplayName("The planning settings come from the catalog, each falling back to its default")
    void theSettingsFallBackToTheirDefaults() {
        PlanningDefaults.Planning planning =
                PlanningDefaults.of(Map.of(RatePolicyKey.PLAN_SPEED_KMH, 80, RatePolicyKey.PLAN_START_HOUR, 5));

        assertThat(planning.speedKmh()).isEqualTo(80);
        assertThat(planning.startHour()).isEqualTo(5);
        assertThat(planning.welfareEveryHours()).isEqualTo(4);
        assertThat(planning.borderStopMin()).isEqualTo(90);
        assertThat(planning.airportAfterHours()).isEqualTo(3);
    }

    @Test
    @DisplayName("A job that already has trips isn't drafted again")
    void aStartedJourneyIsRefused() {
        TransportJobRepository jobs = mock(TransportJobRepository.class);
        JobTripService jobTrips = mock(JobTripService.class);
        JourneyService journeys = mock(JourneyService.class);
        JourneyDrafter drafter = new JourneyDrafter(
                jobs,
                mock(PlaceRepository.class),
                mock(RoutePlanRepository.class),
                mock(RouteStopRepository.class),
                jobTrips,
                journeys,
                mock(RoutePlanService.class),
                mock(PlanningDefaults.class),
                mock(AuditService.class));
        TransportJob job = new TransportJob();
        job.setId(UUID.randomUUID());
        job.setCode("CBRT-2026-043");
        job.setRequest(new TransportRequest());
        when(jobs.findById(job.getId())).thenReturn(Optional.of(job));
        when(jobTrips.journey(job)).thenReturn(List.of(new TripJob()));

        assertThatThrownBy(() -> drafter.draft(job.getId(), new User()))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("already has trips");
        verify(journeys, never()).addTrip(any(), any(), any());
    }

    private static Trip trip(Corridor corridor, boolean reversed) {
        Trip t = new Trip();
        t.setId(UUID.randomUUID());
        t.setCorridor(corridor);
        t.setReversed(reversed);
        return t;
    }

    private static Corridor corridor(
            String code, String from, String to, Integer km, Country a, Country b, BorderCrossing crossing) {
        Corridor c = new Corridor();
        c.setId(UUID.randomUUID());
        c.setCode(code);
        c.setMode(TransportMode.ROAD);
        c.setOriginCity(from);
        c.setDestinationCity(to);
        c.setDistanceKm(km);
        c.setOriginCountry(a);
        c.setDestinationCountry(b);
        if (crossing != null) {
            CorridorCrossing cc = new CorridorCrossing();
            cc.setCorridor(c);
            cc.setSeq((short) 1);
            cc.setBorderCrossing(crossing);
            c.getCrossings().add(cc);
        }
        return c;
    }

    private static BorderCrossing crossing(String name, Country from, Country to) {
        BorderCrossing b = new BorderCrossing();
        b.setId(UUID.randomUUID());
        b.setName(name);
        b.setFromCountry(from);
        b.setToCountry(to);
        return b;
    }

    private static Country country(String code, String name) {
        Country c = new Country();
        c.setId(UUID.randomUUID());
        c.setCode(code);
        c.setName(name);
        return c;
    }

    private static Place place(String name, PlaceKind kind, String city, Country country) {
        Place p = new Place();
        p.setId(UUID.randomUUID());
        p.setName(name);
        p.setKind(kind);
        p.setCity(city);
        p.setCountry(country);
        return p;
    }
}
