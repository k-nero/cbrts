package com.equifreight.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.equifreight.configuration.BusinessTime;
import com.equifreight.entity.Corridor;
import com.equifreight.entity.Country;
import com.equifreight.entity.Place;
import com.equifreight.entity.Trip;
import com.equifreight.entity.User;
import com.equifreight.entity.Vehicle;
import com.equifreight.entity.enums.PlaceKind;
import com.equifreight.entity.enums.TransportMode;
import com.equifreight.entity.enums.VehicleKind;
import com.equifreight.entity.enums.VehicleStatus;
import com.equifreight.exception.BusinessException;
import com.equifreight.model.fleet.CreateVehicleRequest;
import com.equifreight.model.fleet.UpdateVehicleRequest;
import com.equifreight.model.fleet.VehicleCorridorResponse;
import com.equifreight.model.fleet.VehicleResponse;
import com.equifreight.model.route.CountryOptionResponse;
import com.equifreight.repository.CorridorRepository;
import com.equifreight.repository.CountryRepository;
import com.equifreight.repository.PlaceRepository;
import com.equifreight.repository.TransportJobRepository;
import com.equifreight.repository.TripVehicleRepository;
import com.equifreight.repository.VehicleBookingRepository;
import com.equifreight.repository.VehicleRepository;
import com.equifreight.repository.VehicleStallRepository;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** US-F7-01: a vehicle's home country, permits and operating corridors, as the fleet coordinator sets them. */
class VehiclePermitsServiceTest {

    private final Country vn = country("VN", "Vietnam");
    private final Country kh = country("KH", "Cambodia");
    private final Country th = country("TH", "Thailand");
    private final Corridor hcmPnh = road("RD HCM → PNH", vn, kh);
    private final Corridor hcmHan = road("RD HCM → HAN", vn, vn);

    private final VehicleRepository vehicles = mock(VehicleRepository.class);
    private final CountryRepository countries = mock(CountryRepository.class);
    private final CorridorRepository corridors = mock(CorridorRepository.class);
    private final TripVehicleRepository tripVehicles = mock(TripVehicleRepository.class);
    private final JobTripService jobTrips = mock(JobTripService.class);
    private final VehicleAvailability availability = mock(VehicleAvailability.class);
    private final AuditService audit = mock(AuditService.class);
    private final PlaceRepository places = mock(PlaceRepository.class);
    private final User khoi = new User();
    private VehicleService service;

    @BeforeEach
    void setUp() {
        service = new VehicleService(
                vehicles,
                mock(VehicleStallRepository.class),
                mock(VehicleBookingRepository.class),
                mock(TransportJobRepository.class),
                jobTrips,
                countries,
                corridors,
                tripVehicles,
                availability,
                audit,
                places);
        Map<UUID, Country> countryById = byId(List.of(vn, kh, th), Country::getId);
        Map<UUID, Corridor> corridorById = byId(List.of(hcmPnh, hcmHan), Corridor::getId);
        when(countries.findById(any())).thenAnswer(i -> Optional.ofNullable(countryById.get(i.<UUID>getArgument(0))));
        when(countries.findAllById(anyCollection()))
                .thenAnswer(i -> i.<Collection<UUID>>getArgument(0).stream()
                        .map(countryById::get)
                        .filter(java.util.Objects::nonNull)
                        .toList());
        when(corridors.findAllById(anyCollection()))
                .thenAnswer(i -> i.<Collection<UUID>>getArgument(0).stream()
                        .map(corridorById::get)
                        .filter(java.util.Objects::nonNull)
                        .toList());
        when(vehicles.save(any(Vehicle.class))).thenAnswer(i -> i.getArgument(0));
        when(places.findByCityIgnoreCase("Ho Chi Minh City")).thenReturn(List.of(place(vn)));
        when(places.findByCityIgnoreCase("Bangkok")).thenReturn(List.of(place(th)));
        when(tripVehicles.findOpenTrips(any(), any())).thenReturn(List.of());
        when(tripVehicles.findOpenTripsOn(any(), anyCollection(), any())).thenReturn(List.of());
    }

    @Test
    @DisplayName("a new vehicle keeps its home country out of its permits, runs its corridors, and is audited")
    void createsWithCountriesAndCorridors() {
        VehicleResponse created = service.create(
                khoi,
                CreateVehicleRequest.builder()
                        .code("TX-500")
                        .kind(VehicleKind.TRAILER)
                        .payloadKg(3200)
                        .homeCity("Ho Chi Minh City")
                        .permittedCountryIds(List.of(vn.getId(), kh.getId()))
                        .operatingCorridorIds(List.of(hcmPnh.getId()))
                        .build());

        assertThat(created.homeCountry().code()).isEqualTo("VN");
        assertThat(created.permittedCountries())
                .extracting(CountryOptionResponse::code)
                .containsExactly("KH");
        assertThat(created.operatingCorridors())
                .extracting(VehicleCorridorResponse::code)
                .containsExactly("RD HCM → PNH");
        verify(audit)
                .recordDecision(
                        eq(khoi),
                        eq("VEHICLE_CREATED"),
                        eq("Added vehicle TX-500: Ho Chi Minh City (VN) · KH; runs RD HCM → PNH."),
                        eq("VEHICLE"),
                        any(),
                        eq("TX-500"),
                        isNull(),
                        isNull(),
                        isNull());
    }

    @Test
    @DisplayName("a new vehicle needs a home city")
    void createNeedsHome() {
        assertThatThrownBy(() -> service.create(
                        khoi,
                        CreateVehicleRequest.builder()
                                .code("TX-500")
                                .kind(VehicleKind.TRAILER)
                                .payloadKg(3200)
                                .build()))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Pick the city the vehicle is based in.");
    }

    @Test
    @DisplayName("a corridor without a permit for one of its countries is refused, naming the country")
    void corridorWithoutPermitRefused() {
        assertThatThrownBy(() -> service.create(
                        khoi,
                        CreateVehicleRequest.builder()
                                .code("TX-500")
                                .kind(VehicleKind.TRAILER)
                                .payloadKg(3200)
                                .homeCity("Ho Chi Minh City")
                                .operatingCorridorIds(List.of(hcmPnh.getId()))
                                .build()))
                .isInstanceOf(BusinessException.class)
                .hasMessage("TX-500 has no permit for Cambodia, so it can't run RD HCM → PNH.");
        verify(vehicles, never()).save(any());
    }

    @Test
    @DisplayName("a permit one of its corridors needs can't be taken away")
    void permitNeededByCorridor() {
        Vehicle tx447 = vehicle("TX-447", vn, List.of(kh), List.of(hcmPnh));
        when(vehicles.findById(tx447.getId())).thenReturn(Optional.of(tx447));

        assertThatThrownBy(() -> service.update(
                        khoi,
                        tx447.getId(),
                        UpdateVehicleRequest.builder()
                                .permittedCountryIds(List.of())
                                .build()))
                .isInstanceOf(BusinessException.class)
                .hasMessage("TX-447 has no permit for Cambodia, so it can't run RD HCM → PNH."
                        + " Take the corridor off the vehicle first.");
    }

    @Test
    @DisplayName("a corridor can't be taken off while the vehicle is on a trip on it that hasn't ended")
    void corridorInUse() {
        Vehicle tx447 = vehicle("TX-447", vn, List.of(kh), List.of(hcmPnh, hcmHan));
        when(vehicles.findById(tx447.getId())).thenReturn(Optional.of(tx447));
        Trip trip = new Trip();
        trip.setCode("TRP-2026-014");
        trip.setCorridor(hcmPnh);
        trip.setPlannedDepartureAt(
                LocalDateTime.of(2026, 10, 18, 6, 0).atZone(BusinessTime.ZONE).toInstant());
        when(tripVehicles.findOpenTripsOn(eq(tx447.getId()), anyCollection(), any()))
                .thenReturn(List.of(trip));

        assertThatThrownBy(() -> service.update(
                        khoi,
                        tx447.getId(),
                        UpdateVehicleRequest.builder()
                                .operatingCorridorIds(List.of(hcmHan.getId()))
                                .build()))
                .isInstanceOf(BusinessException.class)
                .hasMessage("TX-447 is on TRP-2026-014 (RD HCM → PNH), leaving 18 Oct; take it off that trip"
                        + " before changing that corridor.");
    }

    @Test
    @DisplayName("narrowing permits and corridors is saved and audited with before and after")
    void narrowingIsAudited() {
        Vehicle tx447 = vehicle("TX-447", vn, List.of(kh, th), List.of(hcmPnh, hcmHan));
        when(vehicles.findById(tx447.getId())).thenReturn(Optional.of(tx447));

        VehicleResponse updated = service.update(
                khoi,
                tx447.getId(),
                UpdateVehicleRequest.builder()
                        .permittedCountryIds(List.of(kh.getId()))
                        .operatingCorridorIds(List.of(hcmPnh.getId()))
                        .build());

        assertThat(updated.permittedCountries())
                .extracting(CountryOptionResponse::code)
                .containsExactly("KH");
        verify(audit)
                .recordDecision(
                        eq(khoi),
                        eq("VEHICLE_PERMITS_CHANGED"),
                        eq(
                                "TX-447: Ho Chi Minh City (VN) · KH, TH; runs RD HCM → HAN, RD HCM → PNH → Ho Chi Minh City (VN)"
                                        + " · KH; runs RD HCM → PNH."),
                        eq("VEHICLE"),
                        any(),
                        eq("TX-447"),
                        isNull(),
                        isNull(),
                        isNull());
    }

    @Test
    @DisplayName("a change to payload alone writes no permit audit row")
    void payloadAloneNotAudited() {
        Vehicle tx447 = vehicle("TX-447", vn, List.of(kh), List.of(hcmPnh));
        when(vehicles.findById(tx447.getId())).thenReturn(Optional.of(tx447));

        service.update(
                khoi,
                tx447.getId(),
                UpdateVehicleRequest.builder().payloadKg(3400).build());

        verify(audit, never())
                .recordDecision(
                        any(), eq("VEHICLE_PERMITS_CHANGED"), anyString(), any(), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("the home city can't change while the vehicle is on a trip that hasn't ended")
    void homeInUse() {
        Vehicle tx447 = vehicle("TX-447", vn, List.of(kh), List.of());
        when(vehicles.findById(tx447.getId())).thenReturn(Optional.of(tx447));
        Trip trip = new Trip();
        trip.setCode("TRP-2026-014");
        trip.setCorridor(hcmPnh);
        when(tripVehicles.findOpenTrips(eq(tx447.getId()), any())).thenReturn(List.of(trip));

        assertThatThrownBy(() -> service.update(
                        khoi,
                        tx447.getId(),
                        UpdateVehicleRequest.builder().homeCity("Bangkok").build()))
                .isInstanceOf(BusinessException.class)
                .hasMessage("TX-447 is on TRP-2026-014 (RD HCM → PNH); take it off that trip before changing its"
                        + " home city.");
    }

    @Test
    @DisplayName("listed for a trip, the vehicles that may join it come first and the others carry the reason")
    void listedForTrip() {
        Vehicle tk102 = vehicle("TK-102", vn, List.of(kh), List.of(hcmPnh));
        Vehicle tx447 = vehicle("TX-447", vn, List.of(kh), List.of(hcmPnh));
        Trip trip = new Trip();
        when(jobTrips.tripOf(any(), any())).thenReturn(trip);
        when(vehicles.findAllByStatus(VehicleStatus.ACTIVE)).thenReturn(List.of(tk102, tx447));
        when(availability.refusalFor(tk102, trip)).thenReturn(Optional.of("TK-102 is booked until 11 Oct 10:00."));
        when(availability.refusalFor(tx447, trip)).thenReturn(Optional.empty());

        List<VehicleResponse> listed = service.listForTrip(UUID.randomUUID(), null);

        assertThat(listed).extracting(VehicleResponse::code).containsExactly("TX-447", "TK-102");
        assertThat(listed.get(0).available()).isTrue();
        assertThat(listed.get(1).unavailableReason()).isEqualTo("TK-102 is booked until 11 Oct 10:00.");
    }

    private static <T> Map<UUID, T> byId(List<T> items, Function<T, UUID> id) {
        return items.stream().collect(Collectors.toMap(id, Function.identity()));
    }

    private static Vehicle vehicle(String code, Country home, List<Country> permits, List<Corridor> runs) {
        Vehicle v = new Vehicle();
        v.setId(UUID.randomUUID());
        v.setCode(code);
        v.setKind(VehicleKind.TRAILER);
        v.setStatus(VehicleStatus.ACTIVE);
        v.setHomeCountry(home);
        v.setHomeCity("Ho Chi Minh City");
        v.getPermittedCountries().addAll(permits);
        v.getOperatingCorridors().addAll(runs);
        return v;
    }

    private static Corridor road(String code, Country from, Country to) {
        Corridor c = new Corridor();
        c.setId(UUID.randomUUID());
        c.setCode(code);
        c.setMode(TransportMode.ROAD);
        c.setOriginCountry(from);
        c.setDestinationCountry(to);
        return c;
    }

    private static Place place(Country country) {
        Place p = new Place();
        p.setKind(PlaceKind.STABLE);
        p.setCountry(country);
        return p;
    }

    private static Country country(String code, String name) {
        Country c = new Country();
        c.setId(UUID.randomUUID());
        c.setCode(code);
        c.setName(name);
        return c;
    }
}
