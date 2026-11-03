package com.equifreight.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.equifreight.entity.Corridor;
import com.equifreight.entity.Place;
import com.equifreight.entity.Vehicle;
import com.equifreight.entity.enums.PlaceKind;
import com.equifreight.repository.ChecklistItemRepository;
import com.equifreight.repository.CorridorCrossingRepository;
import com.equifreight.repository.CorridorRepository;
import com.equifreight.repository.LoadPlanStallRepository;
import com.equifreight.repository.PlaceRepository;
import com.equifreight.repository.QuarantinePeriodRepository;
import com.equifreight.repository.RateLineRepository;
import com.equifreight.repository.RateServiceClassRepository;
import com.equifreight.repository.RateVolumeBreakRepository;
import com.equifreight.repository.RouteLegRepository;
import com.equifreight.repository.RouteStopRepository;
import com.equifreight.repository.TransportRequestRepository;
import com.equifreight.repository.TripRepository;
import com.equifreight.repository.TripVehicleRepository;
import com.equifreight.repository.VehicleBookingRepository;
import com.equifreight.repository.VehicleRepository;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** What keeps a route, place, crossing or vehicle from being deleted, in the coordinator's words. */
class CatalogUsageTest {

    private final TransportRequestRepository requests = mock(TransportRequestRepository.class);
    private final VehicleRepository vehicles = mock(VehicleRepository.class);
    private final CorridorRepository corridors = mock(CorridorRepository.class);
    private final PlaceRepository places = mock(PlaceRepository.class);
    private final CatalogUsage usage = new CatalogUsage(
            requests,
            mock(TripRepository.class),
            mock(RateLineRepository.class),
            mock(RateServiceClassRepository.class),
            mock(RateVolumeBreakRepository.class),
            vehicles,
            corridors,
            mock(CorridorCrossingRepository.class),
            places,
            mock(RouteStopRepository.class),
            mock(QuarantinePeriodRepository.class),
            mock(ChecklistItemRepository.class),
            mock(TripVehicleRepository.class),
            mock(VehicleBookingRepository.class),
            mock(RouteLegRepository.class),
            mock(LoadPlanStallRepository.class));

    private static Corridor route() {
        Corridor c = new Corridor();
        c.setId(UUID.randomUUID());
        c.setCode("RD HCM → PNH");
        return c;
    }

    private static Vehicle vehicle(String code) {
        Vehicle v = new Vehicle();
        v.setCode(code);
        return v;
    }

    private static Place place(String name, PlaceKind kind) {
        Place p = new Place();
        p.setId(UUID.randomUUID());
        p.setName(name);
        p.setKind(kind);
        p.setCity("Phnom Penh");
        return p;
    }

    @Test
    @DisplayName("a route nothing uses is free to delete")
    void anUnusedRouteIsFree() {
        assertThat(usage.corridorInUse(route())).isEmpty();
    }

    @Test
    @DisplayName("a route requests ran on stays on record")
    void aRouteWithRequestsStays() {
        Corridor c = route();
        when(requests.existsByCorridorIdOrFirstLegCorridorIdOrLastLegCorridorId(c.getId(), c.getId(), c.getId()))
                .thenReturn(true);

        assertThat(usage.corridorInUse(c)).contains("Requests run on RD HCM → PNH, so it stays on record.");
    }

    @Test
    @DisplayName("a route vehicles work names them")
    void aRouteVehiclesWorkNamesThem() {
        Corridor c = route();
        when(vehicles.findRunning(c.getId())).thenReturn(List.of(vehicle("TX-550"), vehicle("TX-447")));

        assertThat(usage.corridorInUse(c)).contains("TX-447, TX-550 work RD HCM → PNH. Take the route off them first.");
    }

    @Test
    @DisplayName("the last place in a city a route runs to is needed; one of two isn't, nor a welfare stop")
    void theLastPlaceOfARouteCityIsNeeded() {
        Place stables = place("Phnom Penh stables", PlaceKind.STABLE);
        Place stop = place("Highway rest", PlaceKind.WELFARE_STOP);
        when(corridors.existsByOriginCityIgnoreCaseOrDestinationCityIgnoreCase(anyString(), anyString()))
                .thenReturn(true);
        when(places.findByCityIgnoreCase("Phnom Penh")).thenReturn(List.of(stables, stop));

        assertThat(usage.lastPlaceOfCity(stables))
                .hasValueSatisfying(
                        r -> assertThat(r).startsWith("Phnom Penh stables is the last place in Phnom Penh"));
        assertThat(usage.lastPlaceOfCity(stop)).isEmpty();

        Place racecourse = place("Phnom Penh racecourse", PlaceKind.RACECOURSE);
        when(places.findByCityIgnoreCase(any())).thenReturn(List.of(stables, racecourse));
        assertThat(usage.lastPlaceOfCity(stables)).isEmpty();
    }
}
