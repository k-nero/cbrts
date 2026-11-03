package com.equifreight.service;

import com.equifreight.entity.BorderCrossing;
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
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Why a route, place, border crossing or vehicle can't be deleted, or a place or crossing can't move: something that
 * stays still points at it. Each answer is the sentence the coordinator reads, or empty when nothing does. A record
 * with history is kept; only one nothing has used yet can go.
 */
@Component
@Transactional(readOnly = true)
public class CatalogUsage {

    private final TransportRequestRepository requests;
    private final TripRepository trips;
    private final RateLineRepository rateLines;
    private final RateServiceClassRepository rateClasses;
    private final RateVolumeBreakRepository rateBreaks;
    private final VehicleRepository vehicles;
    private final CorridorRepository corridors;
    private final CorridorCrossingRepository corridorCrossings;
    private final PlaceRepository places;
    private final RouteStopRepository routeStops;
    private final QuarantinePeriodRepository quarantines;
    private final ChecklistItemRepository checklistItems;
    private final TripVehicleRepository tripVehicles;
    private final VehicleBookingRepository bookings;
    private final RouteLegRepository routeLegs;
    private final LoadPlanStallRepository loadPlanStalls;

    public CatalogUsage(
            TransportRequestRepository requests,
            TripRepository trips,
            RateLineRepository rateLines,
            RateServiceClassRepository rateClasses,
            RateVolumeBreakRepository rateBreaks,
            VehicleRepository vehicles,
            CorridorRepository corridors,
            CorridorCrossingRepository corridorCrossings,
            PlaceRepository places,
            RouteStopRepository routeStops,
            QuarantinePeriodRepository quarantines,
            ChecklistItemRepository checklistItems,
            TripVehicleRepository tripVehicles,
            VehicleBookingRepository bookings,
            RouteLegRepository routeLegs,
            LoadPlanStallRepository loadPlanStalls) {
        this.requests = requests;
        this.trips = trips;
        this.rateLines = rateLines;
        this.rateClasses = rateClasses;
        this.rateBreaks = rateBreaks;
        this.vehicles = vehicles;
        this.corridors = corridors;
        this.corridorCrossings = corridorCrossings;
        this.places = places;
        this.routeStops = routeStops;
        this.quarantines = quarantines;
        this.checklistItems = checklistItems;
        this.tripVehicles = tripVehicles;
        this.bookings = bookings;
        this.routeLegs = routeLegs;
        this.loadPlanStalls = loadPlanStalls;
    }

    /** A route requests or trips have run on, that a rate version prices, or that a vehicle works, stays. */
    public Optional<String> corridorInUse(Corridor corridor) {
        UUID id = corridor.getId();
        String code = corridor.getCode();
        if (requests.existsByCorridorIdOrFirstLegCorridorIdOrLastLegCorridorId(id, id, id)) {
            return Optional.of("Requests run on " + code + ", so it stays on record.");
        }
        if (trips.existsByCorridorId(id)) {
            return Optional.of("Trips run on " + code + ", so it stays on record.");
        }
        if (rateLines.existsByCorridorId(id)
                || rateClasses.existsByCorridorId(id)
                || rateBreaks.existsByCorridorId(id)) {
            return Optional.of(code + " is priced in a rate version. Take its rates out of the draft first.");
        }
        List<String> running =
                vehicles.findRunning(id).stream().map(Vehicle::getCode).sorted().toList();
        if (!running.isEmpty()) {
            return Optional.of(String.join(", ", running) + (running.size() == 1 ? " works " : " work ") + code
                    + ". Take the route off " + (running.size() == 1 ? "it" : "them") + " first.");
        }
        return Optional.empty();
    }

    /** A place a request starts or ends at, a route plan stops at, or a quarantine is held at, stays. */
    public Optional<String> placeInUse(Place place) {
        UUID id = place.getId();
        if (requests.existsByOriginPlaceIdOrDestinationPlaceId(id, id)) {
            return Optional.of("Requests start or end at " + place.getName() + ".");
        }
        if (routeStops.existsByPlaceId(id)) {
            return Optional.of("A trip's route stops at " + place.getName() + ".");
        }
        if (quarantines.existsByPlaceId(id)) {
            return Optional.of("A quarantine is held at " + place.getName() + ".");
        }
        return Optional.empty();
    }

    /**
     * A request finds its route from the city of its places, and a vehicle's home country from its city: the last
     * pickup or delivery place in a city a route or a vehicle needs can't leave it.
     */
    public Optional<String> lastPlaceOfCity(Place place) {
        String city = place.getCity();
        if (city == null || place.getKind() == PlaceKind.WELFARE_STOP) return Optional.empty();
        boolean another = places.findByCityIgnoreCase(city).stream()
                .anyMatch(p -> !p.getId().equals(place.getId()) && p.getKind() != PlaceKind.WELFARE_STOP);
        if (another) return Optional.empty();
        if (corridors.existsByOriginCityIgnoreCaseOrDestinationCityIgnoreCase(city, city)) {
            return Optional.of(place.getName() + " is the last place in " + city
                    + ", and a route runs from or to there. Add another place in " + city + " first.");
        }
        if (vehicles.existsByHomeCityIgnoreCase(city)) {
            return Optional.of(place.getName() + " is the last place in " + city
                    + ", and a vehicle is based there. Add another place in " + city + " first.");
        }
        return Optional.empty();
    }

    /** A crossing a route takes, a route plan stops at, or a checklist item is for, stays. */
    public Optional<String> crossingInUse(BorderCrossing crossing) {
        UUID id = crossing.getId();
        List<String> routes = corridorCrossings.findCorridorCodesByBorderCrossingId(id);
        if (!routes.isEmpty()) {
            return Optional.of(String.join(", ", routes) + (routes.size() == 1 ? " takes " : " take ")
                    + crossing.getName() + ". Take it off " + (routes.size() == 1 ? "that route" : "those routes")
                    + " first.");
        }
        if (routeStops.existsByBorderCrossingId(id)) {
            return Optional.of("A trip's route stops at " + crossing.getName() + ".");
        }
        if (checklistItems.existsByBorderCrossingId(id)) {
            return Optional.of("A job's clearance checklist names " + crossing.getName() + ".");
        }
        return Optional.empty();
    }

    /** A vehicle that has been on a trip, booked, or placed on a load plan stays on record. */
    public Optional<String> vehicleInUse(Vehicle vehicle) {
        UUID id = vehicle.getId();
        if (tripVehicles.existsByVehicleId(id)
                || routeLegs.existsByVehicleId(id)
                || loadPlanStalls.existsByVehicleStallVehicleId(id)) {
            return Optional.of(vehicle.getCode() + " has been on trips, so it stays on record.");
        }
        if (bookings.existsByVehicleId(id)) {
            return Optional.of(vehicle.getCode() + " has bookings on the fleet calendar, so it stays on record.");
        }
        return Optional.empty();
    }
}
