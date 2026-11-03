package com.equifreight.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.equifreight.configuration.BusinessTime;
import com.equifreight.entity.BorderCrossing;
import com.equifreight.entity.Corridor;
import com.equifreight.entity.CorridorCrossing;
import com.equifreight.entity.Country;
import com.equifreight.entity.Place;
import com.equifreight.entity.RateCatalogVersion;
import com.equifreight.entity.RatePolicy;
import com.equifreight.entity.RoutePlan;
import com.equifreight.entity.RouteStop;
import com.equifreight.entity.TransportJob;
import com.equifreight.entity.TransportRequest;
import com.equifreight.entity.Trip;
import com.equifreight.entity.Vehicle;
import com.equifreight.entity.VehicleBooking;
import com.equifreight.entity.enums.BookingKind;
import com.equifreight.entity.enums.CatalogStatus;
import com.equifreight.entity.enums.PlaceKind;
import com.equifreight.entity.enums.RatePolicyKey;
import com.equifreight.entity.enums.RoutePlanStatus;
import com.equifreight.entity.enums.TransportMode;
import com.equifreight.entity.enums.VehicleStatus;
import com.equifreight.exception.BusinessException;
import com.equifreight.repository.CorridorRepository;
import com.equifreight.repository.RateCatalogVersionRepository;
import com.equifreight.repository.RatePolicyRepository;
import com.equifreight.repository.RoutePlanRepository;
import com.equifreight.repository.VehicleBookingRepository;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * US-F7-01: a vehicle runs a corridor only with a permit for each of its countries, and joins a road trip only on one
 * of its operating corridors, from where the trip starts, when no other booking overlaps.
 */
class VehicleAvailabilityTest {

    private final Country vn = country("VN", "Vietnam");
    private final Country kh = country("KH", "Cambodia");
    private final Country th = country("TH", "Thailand");
    private final Country my = country("MY", "Malaysia");
    private final Country hk = country("HK", "Hong Kong");

    private final BorderCrossing mocBai = crossing("Mộc Bài – Bavet", vn, kh);
    private final BorderCrossing poipet = crossing("Poipet – Aranyaprathet", kh, th);
    private final BorderCrossing sadao = crossing("Sadao – Bukit Kayu Hitam", th, my);

    private final Corridor hcmBkk = road("RD HCM → BKK", vn, th, mocBai, poipet);
    private final Corridor bkkHcm = road("RD BKK → HCM", th, vn, reverse(poipet), reverse(mocBai));
    private final Corridor bkkKul = road("RD BKK → KUL", th, my, sadao);
    private final Corridor hcmHan = road("RD HCM → HAN", vn, vn);
    private final Corridor hkgShaTin = road("RD HKG → Sha Tin", hk, hk);
    private final Corridor sgnHkg = air("AIR SGN → HKG", vn, hk);

    private final JobTripService jobTrips = mock(JobTripService.class);
    private final CorridorRepository corridors = mock(CorridorRepository.class);
    private final VehicleBookingRepository bookings = mock(VehicleBookingRepository.class);
    private final RateCatalogVersionRepository versions = mock(RateCatalogVersionRepository.class);
    private final RatePolicyRepository policies = mock(RatePolicyRepository.class);
    private final RoutePlanRepository routePlans = mock(RoutePlanRepository.class);
    private VehicleAvailability availability;

    @BeforeEach
    void setUp() {
        // Now is 1 Oct 2026 in Ho Chi Minh City: a vehicle with no trip yet sets off from its home city from then.
        Clock clock = Clock.fixed(
                LocalDateTime.of(2026, 10, 1, 0, 0).atZone(BusinessTime.ZONE).toInstant(), BusinessTime.ZONE);
        availability = new VehicleAvailability(jobTrips, bookings, versions, policies, corridors, routePlans, clock);
        when(bookings.findForAvailability(any())).thenReturn(List.of());
        when(versions.findFirstByStatusOrderByVersionNoDesc(CatalogStatus.PUBLISHED))
                .thenReturn(Optional.empty());
        cities(hcmBkk, "Ho Chi Minh City", "Bangkok", 3);
        cities(bkkHcm, "Bangkok", "Ho Chi Minh City", 3);
        cities(bkkKul, "Bangkok", "Kuala Lumpur", 3);
        cities(hcmHan, "Ho Chi Minh City", "Hanoi", 4);
        cities(hkgShaTin, "Hong Kong", "Sha Tin", 1);
        cities(sgnHkg, "Ho Chi Minh City", "Hong Kong", 3);
        when(corridors.findRoadNetwork()).thenReturn(List.of(hcmBkk, bkkHcm, bkkKul, hcmHan, hkgShaTin));
    }

    // --- Corridor countries and permits

    @Test
    @DisplayName("a corridor's countries are where it starts, then each country a crossing enters")
    void corridorCountries() {
        assertThat(hcmBkk.countries()).containsExactly(vn, kh, th);
        assertThat(hcmHan.countries()).containsExactly(vn);
    }

    @Test
    @DisplayName("a new corridor's driving days come from its distance at 500 km a day, 1 to 30")
    void drivingDaysFromDistance() {
        assertThat(Corridor.drivingDaysFor(null)).isEqualTo((short) 1);
        assertThat(Corridor.drivingDaysFor(230)).isEqualTo((short) 1);
        assertThat(Corridor.drivingDaysFor(960)).isEqualTo((short) 2);
        assertThat(Corridor.drivingDaysFor(1450)).isEqualTo((short) 3);
        assertThat(Corridor.drivingDaysFor(40_000)).isEqualTo((short) 30);
    }

    @Test
    @DisplayName("a corridor needs a permit for every country on it, naming the first one missing")
    void corridorNeedsEveryPermit() {
        Vehicle tx447 = vehicle("TX-447", vn, kh);

        assertThat(tx447.refusalToRun(hcmBkk))
                .contains("TX-447 has no permit for Thailand, so it can't run RD HCM → BKK.");
        assertThat(vehicle("TX-447", vn, kh, th).refusalToRun(hcmBkk)).isEmpty();
    }

    @Test
    @DisplayName("a corridor that doesn't touch the home country is allowed with every permit (decision 1)")
    void thirdCountryCarriageWithPermits() {
        assertThat(vehicle("TK-102", vn, th, my).refusalToRun(bkkKul)).isEmpty();
    }

    @Test
    @DisplayName("an air corridor is never an operating corridor")
    void airIsNotAnOperatingCorridor() {
        assertThat(vehicle("TX-447", vn, hk).refusalToRun(sgnHkg)).isPresent();
    }

    // --- Planning a road trip

    @Test
    @DisplayName("a vehicle based where the trip starts, on one of its corridors and free, may join it")
    void allowed() {
        Vehicle tx447 = runs(vehicle("TX-447", vn, kh, th), hcmBkk);

        assertThat(availability.refusalFor(tx447, trip(hcmBkk, at(10)))).isEmpty();
    }

    @Test
    @DisplayName("a vehicle in maintenance is refused")
    void inactiveRefused() {
        Vehicle tx210 = runs(vehicle("TX-210", vn, kh, th), hcmBkk);
        tx210.setStatus(VehicleStatus.MAINTENANCE);

        assertThat(availability.refusalFor(tx210, trip(hcmBkk, at(10))))
                .contains("TX-210 is in maintenance and can't run a trip.");
    }

    @Test
    @DisplayName("a corridor the vehicle doesn't run is refused, even with the permits")
    void notAnOperatingCorridor() {
        Vehicle tk102 = runs(vehicle("TK-102", vn, kh, th, my), hcmBkk);

        assertThat(availability.refusalFor(tk102, trip(bkkKul, at(10)))).contains("TK-102 doesn't run RD BKK → KUL.");
    }

    @Test
    @DisplayName("a trip that starts in a city with no permitted road from home is refused")
    void notWhereTheTripStarts() {
        // Ho Chi Minh City to Bangkok passes Cambodia, which it has no permit for.
        Vehicle tx447 = runs(vehicle("TX-447", vn, th, my), bkkKul);

        assertThat(availability.refusalFor(tx447, trip(bkkKul, at(14))))
                .contains("TX-447 is based in Ho Chi Minh City and has no permitted road to Bangkok.");
    }

    @Test
    @DisplayName("the return load: a vehicle whose last trip ends in Thailand may take a trip from Thailand")
    void returnLoad() {
        Vehicle tx447 = runs(vehicle("TX-447", vn, kh, th), hcmBkk, bkkHcm);
        Trip outbound = trip(hcmBkk, at(10));
        when(bookings.findForAvailability(tx447.getId())).thenReturn(List.of(booking(tx447, outbound, at(10), at(12))));

        assertThat(availability.refusalFor(tx447, trip(bkkHcm, at(14)))).isEmpty();
    }

    @Test
    @DisplayName("the road leg after a flight takes only a vehicle that runs it and is there")
    void legAfterAFlight() {
        Vehicle tx447 = runs(vehicle("TX-447", vn, kh, th, hk), hcmBkk);
        Vehicle hk031 = runs(vehicle("HK-031", hk), hkgShaTin);
        Trip afterFlight = trip(hkgShaTin, at(20));

        assertThat(availability.refusalFor(tx447, afterFlight)).contains("TX-447 doesn't run RD HKG → Sha Tin.");
        assertThat(availability.refusalFor(hk031, afterFlight)).isEmpty();
    }

    @Test
    @DisplayName("an air trip carries no vehicle, so only the status is checked")
    void airTripUnchecked() {
        Vehicle tx447 = vehicle("TX-447", vn);

        assertThat(availability.refusalFor(tx447, trip(sgnHkg, at(10)))).isEmpty();
    }

    @Test
    @DisplayName("a vehicle booked over the trip's span is refused with when it is free")
    void busy() {
        Vehicle tx447 = runs(vehicle("TX-447", vn, kh, th), hcmBkk);
        Trip other = trip(hcmHan, at(9));
        when(bookings.findForAvailability(tx447.getId()))
                .thenReturn(List.of(booking(tx447, other, at(9), at(11).plusSeconds(4 * 3600))));

        assertThat(availability.refusalFor(tx447, trip(hcmBkk, at(10), at(12))))
                .contains("TX-447 is booked until 11 Oct 10:00.");
    }

    @Test
    @DisplayName("the trip's own booking doesn't make the vehicle busy for it")
    void ownBookingIsNotAnOverlap() {
        Vehicle tx447 = runs(vehicle("TX-447", vn, kh, th), hcmBkk);
        Trip trip = trip(hcmBkk, at(10), at(12));
        when(bookings.findForAvailability(tx447.getId())).thenReturn(List.of(booking(tx447, trip, at(10), at(12))));

        assertThat(availability.refusalFor(tx447, trip)).isEmpty();
    }

    @Test
    @DisplayName("require refuses with the same sentence")
    void requireRefuses() {
        Vehicle tk102 = runs(vehicle("TK-102", vn, kh, th), hcmBkk);

        assertThatThrownBy(() -> availability.require(tk102, trip(bkkKul, at(10))))
                .isInstanceOf(BusinessException.class)
                .hasMessage("TK-102 doesn't run RD BKK → KUL.");
    }

    @Test
    @DisplayName("the default pick skips a vehicle that may not run the trip")
    void firstAvailableSkips() {
        Vehicle tk102 = runs(vehicle("TK-102", vn, kh, th, my), bkkKul);
        Vehicle tx447 = runs(vehicle("TX-447", vn, kh, th), hcmBkk);

        assertThat(availability.firstAvailable(List.of(tk102, tx447), trip(hcmBkk, at(10))))
                .isSameAs(tx447);
    }

    @Test
    @DisplayName("a corridor nobody runs can't be planned")
    void nobodyRunsIt() {
        Vehicle tx447 = runs(vehicle("TX-447", vn, kh, th), hcmBkk);

        assertThatThrownBy(() -> availability.firstAvailable(List.of(tx447), trip(bkkKul, at(10))))
                .isInstanceOf(BusinessException.class)
                .hasMessage("No vehicle runs RD BKK → KUL yet. Assign one on the Vehicles page.");
    }

    @Test
    @DisplayName("when vehicles run the corridor but none can be there and free, the refusal says so")
    void noneThereAndFree() {
        Vehicle tx447 = runs(vehicle("TX-447", vn, th, my), bkkKul);

        assertThatThrownBy(() -> availability.firstAvailable(List.of(tx447), trip(bkkKul, at(14))))
                .isInstanceOf(BusinessException.class)
                .hasMessage("No vehicle that runs RD BKK → KUL is free and in Bangkok on 14 Oct.");
    }

    // --- Over time (US-F7-02)

    @Test
    @DisplayName("a truck ending abroad can start at home once the turnaround and the drive back fit: VN→TH 1–5 Oct")
    void driveBack() {
        Vehicle tx447 = runs(vehicle("TX-447", vn, kh, th), hcmBkk, bkkHcm, hcmHan);
        Trip earlier = trip(hcmBkk, at(1));
        when(bookings.findForAvailability(tx447.getId())).thenReturn(List.of(booking(tx447, earlier, at(1), at(5))));

        // Ready in Bangkok on 6 Oct after 24 hours, back in Vietnam 3 driving days later: 9 Oct.
        assertThat(availability.refusalFor(tx447, trip(hcmHan, at(8))))
                .contains("TX-447 can be in Ho Chi Minh City on 9 Oct (driving from Bangkok, 3 days); this trip starts"
                        + " 8 Oct.");
        assertThat(availability.refusalFor(tx447, trip(hcmHan, at(9)))).isEmpty();
    }

    @Test
    @DisplayName("the turnaround comes from the published rate catalog")
    void turnaroundFromCatalog() {
        RateCatalogVersion published = new RateCatalogVersion();
        published.setId(UUID.randomUUID());
        RatePolicy turnaround = new RatePolicy();
        turnaround.setKey(RatePolicyKey.TURNAROUND_HOURS);
        turnaround.setValue(new BigDecimal("48"));
        when(versions.findFirstByStatusOrderByVersionNoDesc(CatalogStatus.PUBLISHED))
                .thenReturn(Optional.of(published));
        when(policies.findByVersionIdAndKey(published.getId(), RatePolicyKey.TURNAROUND_HOURS))
                .thenReturn(Optional.of(turnaround));
        Vehicle tx447 = runs(vehicle("TX-447", vn, kh, th), hcmBkk, bkkHcm);
        Trip earlier = trip(hcmBkk, at(10));
        when(bookings.findForAvailability(tx447.getId())).thenReturn(List.of(booking(tx447, earlier, at(10), at(12))));

        assertThat(availability.refusalFor(tx447, trip(bkkHcm, at(13))))
                .contains("TX-447 is ready in Bangkok on 14 Oct after its last trip; this trip starts 13 Oct.");
    }

    @Test
    @DisplayName("a later 'available on' date wins over the worked-out one")
    void availableOn() {
        Vehicle tx447 = runs(vehicle("TX-447", vn, kh, th), hcmBkk);
        tx447.setAvailableOn(LocalDate.of(2026, 10, 12));

        assertThat(availability.refusalFor(tx447, trip(hcmBkk, at(10))))
                .contains("TX-447 is expected back on 12 Oct; this trip starts 10 Oct.");
        assertThat(availability.refusalFor(tx447, trip(hcmBkk, at(12)))).isEmpty();
    }

    @Test
    @DisplayName("a truck with no permitted road back isn't available at home")
    void noCorridorBack() {
        // Back from Kuala Lumpur to Ho Chi Minh City passes Cambodia, which it has no permit for.
        Vehicle tx447 = runs(vehicle("TX-447", vn, th, my), bkkKul, hcmHan);
        Trip earlier = trip(bkkKul, at(1));
        when(bookings.findForAvailability(tx447.getId())).thenReturn(List.of(booking(tx447, earlier, at(1), at(5))));

        assertThat(availability.refusalFor(tx447, trip(hcmHan, at(20))))
                .contains("TX-447 will be in Kuala Lumpur from 5 Oct and has no permitted road to Ho Chi Minh City.");
    }

    @Test
    @DisplayName("Hanoi to Ho Chi Minh City counts the drive, though both are in Vietnam, using RD HCM → HAN backwards")
    void sameCountryOtherCity() {
        Vehicle tx447 = runs(vehicle("TX-447", vn), hcmHan);
        Trip earlier = trip(hcmHan, at(1));
        when(bookings.findForAvailability(tx447.getId())).thenReturn(List.of(booking(tx447, earlier, at(1), at(5))));

        // Ready in Hanoi on 6 Oct, 4 driving days back: 10 Oct.
        assertThat(availability.refusalFor(tx447, trip(hcmHan, at(8))))
                .contains("TX-447 can be in Ho Chi Minh City on 10 Oct (driving from Hanoi, 4 days); this trip starts"
                        + " 8 Oct.");
        assertThat(availability.refusalFor(tx447, trip(hcmHan, at(10)))).isEmpty();
    }

    @Test
    @DisplayName("the drive chains corridors: Kuala Lumpur to Ho Chi Minh City through Bangkok, 6 days")
    void chainedDrive() {
        Vehicle tk102 = runs(vehicle("TK-102", vn, kh, th, my), bkkKul, hcmHan);
        Trip earlier = trip(bkkKul, at(1));
        when(bookings.findForAvailability(tk102.getId())).thenReturn(List.of(booking(tk102, earlier, at(1), at(5))));

        assertThat(availability.refusalFor(tk102, trip(hcmHan, at(11))))
                .contains("TK-102 can be in Ho Chi Minh City on 12 Oct (driving from Kuala Lumpur, 6 days); this trip"
                        + " starts 11 Oct.");
        assertThat(availability.refusalFor(tk102, trip(hcmHan, at(12)))).isEmpty();
    }

    @Test
    @DisplayName("another request's hold makes the vehicle busy; the request's own hold doesn't")
    void holds() {
        Vehicle tx447 = runs(vehicle("TX-447", vn, kh, th), hcmBkk);
        TransportRequest mine = request(hcmBkk, LocalDate.of(2026, 10, 10));
        TransportRequest other = request(hcmBkk, LocalDate.of(2026, 10, 10));
        when(bookings.findForAvailability(tx447.getId())).thenReturn(List.of(hold(tx447, mine)));

        assertThat(availability.refusalFor(tx447, mine, LocalDate.of(2026, 10, 10)))
                .isEmpty();
        assertThat(availability.refusalFor(tx447, other, LocalDate.of(2026, 10, 10)))
                .hasValueSatisfying(r -> assertThat(r).startsWith("TX-447 is booked until 13 Oct"));
    }

    @Test
    @DisplayName("the earliest start is the first day the drive back fits")
    void earliestStart() {
        Vehicle tx447 = runs(vehicle("TX-447", vn, kh, th), hcmBkk, bkkHcm, hcmHan);
        Trip earlier = trip(hcmBkk, at(1));
        when(bookings.findForAvailability(tx447.getId())).thenReturn(List.of(booking(tx447, earlier, at(1), at(5))));
        TransportRequest request = request(hcmHan, LocalDate.of(2026, 10, 8));

        // Back in Vietnam on 9 Oct at 06:00, so the first whole day it can start is 10 Oct.
        assertThat(availability.earliestStart(tx447, request, LocalDate.of(2026, 10, 8), LocalDate.of(2026, 10, 31)))
                .contains(LocalDate.of(2026, 10, 10));
    }

    // --- Local runs to and from the cargo terminal (US-F3-22)

    @Test
    @DisplayName(
            "a flight's request holds the local run from its stable, the leg to the hub, or nothing from the airport")
    void heldCorridorBeforeAFlight() {
        Corridor hcmLocal = road("RD HCM local", vn, vn);
        cities(hcmLocal, "Ho Chi Minh City", "Ho Chi Minh City", 1);
        when(corridors.findLocalRun("Ho Chi Minh City")).thenReturn(Optional.of(hcmLocal));
        TransportRequest fromStable = request(sgnHkg, LocalDate.of(2026, 10, 10));
        fromStable.setOriginPlace(place(PlaceKind.TRAINING_CENTRE, "Ho Chi Minh City"));
        TransportRequest fromAirport = request(sgnHkg, LocalDate.of(2026, 10, 10));
        fromAirport.setOriginPlace(place(PlaceKind.AIRPORT, "Ho Chi Minh City"));
        TransportRequest viaHub = request(sgnHkg, LocalDate.of(2026, 10, 10));
        viaHub.setOriginPlace(place(PlaceKind.TRAINING_CENTRE, "Hanoi"));
        viaHub.setFirstLegCorridor(hcmHan);

        assertThat(availability.heldCorridor(fromStable)).contains(hcmLocal);
        assertThat(availability.heldCorridor(fromAirport)).isEmpty();
        assertThat(availability.heldCorridor(viaHub)).contains(hcmHan);
        assertThat(availability.heldCorridor(request(hcmBkk, LocalDate.of(2026, 10, 10))))
                .contains(hcmBkk);
    }

    @Test
    @DisplayName("a local run lasts its own route's hours, and its vehicle is ready after the shorter local turnaround")
    void localRunOwnHours() {
        Corridor hcmLocal = road("RD HCM local", vn, vn);
        cities(hcmLocal, "Ho Chi Minh City", "Ho Chi Minh City", 1);
        Vehicle tx447 = runs(vehicle("TX-447", vn, kh, th), hcmLocal, hcmBkk);
        // Leaves the stable at 06:00, reaches the terminal at 07:00 and waits 4 hours there for the flight.
        Trip local = trip(hcmLocal, at(10), at(14));
        RoutePlan plan = new RoutePlan();
        plan.getStops().add(stop(1, at(10), null));
        plan.getStops().add(stop(2, at(10).plus(Duration.ofHours(1)), (short) 240));
        when(routePlans.findByTrip_IdAndStatus(local.getId(), RoutePlanStatus.CONFIRMED))
                .thenReturn(Optional.of(plan));

        VehicleAvailability.Span span = availability.spanOf(local);
        assertThat(span.startsAt()).isEqualTo(at(10));
        assertThat(span.endsAt()).isEqualTo(at(10).plus(Duration.ofHours(5)));

        when(bookings.findForAvailability(tx447.getId()))
                .thenReturn(List.of(booking(tx447, local, span.startsAt(), span.endsAt())));
        // Free at 11:00, ready 4 hours later: 15:00 the same day.
        assertThat(availability.refusalFor(tx447, trip(hcmBkk, at(10).plus(Duration.ofHours(9)))))
                .isEmpty();
        assertThat(availability.refusalFor(tx447, trip(hcmBkk, at(10).plus(Duration.ofHours(6)))))
                .contains(
                        "TX-447 is ready in Ho Chi Minh City on 10 Oct after its last trip; this trip starts 10 Oct.");
    }

    // --- Fixtures

    private static Place place(PlaceKind kind, String city) {
        Place p = new Place();
        p.setId(UUID.randomUUID());
        p.setKind(kind);
        p.setCity(city);
        return p;
    }

    private static RouteStop stop(int seq, Instant at, Short stayMin) {
        RouteStop st = new RouteStop();
        st.setSeq((short) seq);
        st.setPlannedAt(at);
        st.setPlannedStayMin(stayMin);
        return st;
    }

    private static TransportRequest request(Corridor corridor, LocalDate departs) {
        TransportRequest r = new TransportRequest();
        r.setId(UUID.randomUUID());
        r.setCode("REQ-" + r.getId().toString().substring(0, 4));
        r.setCorridor(corridor);
        r.setDepartureDate(departs);
        return r;
    }

    private static VehicleBooking hold(Vehicle vehicle, TransportRequest request) {
        VehicleBooking b = new VehicleBooking();
        b.setId(UUID.randomUUID());
        b.setVehicle(vehicle);
        b.setRequest(request);
        b.setKind(BookingKind.RESERVED);
        b.setStartsAt(VehicleAvailability.startOf(request.getDepartureDate()));
        b.setEndsAt(VehicleAvailability.afterDriving(b.getStartsAt(), request.getCorridor()));
        return b;
    }

    /** 06:00 in Ho Chi Minh City on {@code day} Oct 2026. */
    private static Instant at(int day) {
        return LocalDateTime.of(2026, 10, day, 6, 0).atZone(BusinessTime.ZONE).toInstant();
    }

    private Trip trip(Corridor corridor, Instant departs) {
        return trip(corridor, departs, null);
    }

    private Trip trip(Corridor corridor, Instant departs, Instant arrives) {
        Trip trip = new Trip();
        trip.setId(UUID.randomUUID());
        trip.setCode("TRP-" + trip.getId().toString().substring(0, 4));
        trip.setCorridor(corridor);
        trip.setPlannedDepartureAt(departs);
        TransportJob job = new TransportJob();
        job.setPlannedDepartureAt(departs);
        job.setPlannedArrivalAt(arrives);
        when(jobTrips.jobsOn(trip)).thenReturn(List.of(job));
        return trip;
    }

    private static VehicleBooking booking(Vehicle vehicle, Trip trip, Instant starts, Instant ends) {
        VehicleBooking b = new VehicleBooking();
        b.setId(UUID.randomUUID());
        b.setVehicle(vehicle);
        b.setTrip(trip);
        b.setKind(BookingKind.JOB);
        b.setStartsAt(starts);
        b.setEndsAt(ends);
        return b;
    }

    private static void cities(Corridor c, String from, String to, int days) {
        c.setOriginCity(from);
        c.setDestinationCity(to);
        c.setDrivingDays((short) days);
    }

    private static Vehicle vehicle(String code, Country home, Country... permits) {
        Vehicle v = new Vehicle();
        v.setHomeCity("HK".equals(home.getCode()) ? "Hong Kong" : "Ho Chi Minh City");
        v.setId(UUID.randomUUID());
        v.setCode(code);
        v.setStatus(VehicleStatus.ACTIVE);
        v.setHomeCountry(home);
        v.getPermittedCountries().addAll(List.of(permits));
        return v;
    }

    private static Vehicle runs(Vehicle v, Corridor... corridors) {
        v.getOperatingCorridors().addAll(List.of(corridors));
        return v;
    }

    private static Corridor road(String code, Country from, Country to, BorderCrossing... crossings) {
        Corridor c = corridor(code, TransportMode.ROAD, from, to);
        for (int i = 0; i < crossings.length; i++) {
            CorridorCrossing link = new CorridorCrossing();
            link.setCorridor(c);
            link.setSeq((short) (i + 1));
            link.setBorderCrossing(crossings[i]);
            c.getCrossings().add(link);
        }
        return c;
    }

    private static Corridor air(String code, Country from, Country to) {
        return corridor(code, TransportMode.AIR, from, to);
    }

    private static Corridor corridor(String code, TransportMode mode, Country from, Country to) {
        Corridor c = new Corridor();
        c.setId(UUID.randomUUID());
        c.setCode(code);
        c.setMode(mode);
        c.setOriginCountry(from);
        c.setDestinationCountry(to);
        return c;
    }

    private static BorderCrossing reverse(BorderCrossing b) {
        return crossing(b.getName(), b.getToCountry(), b.getFromCountry());
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
}
