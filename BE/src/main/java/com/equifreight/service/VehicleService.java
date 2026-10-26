package com.equifreight.service;

import com.equifreight.configuration.BusinessTime;
import com.equifreight.entity.Corridor;
import com.equifreight.entity.Country;
import com.equifreight.entity.Place;
import com.equifreight.entity.TransportJob;
import com.equifreight.entity.Trip;
import com.equifreight.entity.User;
import com.equifreight.entity.Vehicle;
import com.equifreight.entity.VehicleBooking;
import com.equifreight.entity.VehicleStall;
import com.equifreight.entity.enums.BookingKind;
import com.equifreight.entity.enums.PlaceKind;
import com.equifreight.entity.enums.StallSide;
import com.equifreight.entity.enums.StallType;
import com.equifreight.entity.enums.VehicleKind;
import com.equifreight.entity.enums.VehicleStatus;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ConflictException;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.model.fleet.CreateVehicleRequest;
import com.equifreight.model.fleet.CreateVehicleStallRequest;
import com.equifreight.model.fleet.FleetMapper;
import com.equifreight.model.fleet.UpdateVehicleRequest;
import com.equifreight.model.fleet.VehicleBookingRequest;
import com.equifreight.model.fleet.VehicleBookingResponse;
import com.equifreight.model.fleet.VehicleResponse;
import com.equifreight.repository.CorridorRepository;
import com.equifreight.repository.CountryRepository;
import com.equifreight.repository.PlaceRepository;
import com.equifreight.repository.TransportJobRepository;
import com.equifreight.repository.TripVehicleRepository;
import com.equifreight.repository.VehicleBookingRepository;
import com.equifreight.repository.VehicleRepository;
import com.equifreight.repository.VehicleStallRepository;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.extern.log4j.Log4j2;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Log4j2
public class VehicleService {

    private final VehicleRepository vehicleRepository;
    private final VehicleStallRepository vehicleStallRepository;
    private final VehicleBookingRepository vehicleBookingRepository;
    private final TransportJobRepository transportJobRepository;
    private final JobTripService jobTrips;
    private final CountryRepository countries;
    private final CorridorRepository corridors;
    private final TripVehicleRepository tripVehicles;
    private final VehicleAvailability availability;
    private final AuditService audit;
    private final PlaceRepository places;

    public VehicleService(
            VehicleRepository vehicleRepository,
            VehicleStallRepository vehicleStallRepository,
            VehicleBookingRepository vehicleBookingRepository,
            TransportJobRepository transportJobRepository,
            JobTripService jobTrips,
            CountryRepository countries,
            CorridorRepository corridors,
            TripVehicleRepository tripVehicles,
            VehicleAvailability availability,
            AuditService audit,
            PlaceRepository places) {
        this.vehicleRepository = vehicleRepository;
        this.vehicleStallRepository = vehicleStallRepository;
        this.vehicleBookingRepository = vehicleBookingRepository;
        this.transportJobRepository = transportJobRepository;
        this.jobTrips = jobTrips;
        this.countries = countries;
        this.corridors = corridors;
        this.tripVehicles = tripVehicles;
        this.availability = availability;
        this.audit = audit;
        this.places = places;
    }

    @Transactional(readOnly = true)
    public Page<VehicleResponse> search(Specification<Vehicle> spec, Pageable pageable) {
        return vehicleRepository.findAll(spec, pageable).map(FleetMapper::toResponse);
    }

    @Transactional(readOnly = true)
    public List<VehicleResponse> listAllActive() {
        return vehicleRepository.findAllByStatus(VehicleStatus.ACTIVE).stream()
                .map(FleetMapper::toResponse)
                .toList();
    }

    /**
     * The active vehicles for one of a job's trips, each marked with whether it may join it and why not (US-F7-01):
     * those that may come first, the rest after, each group by code.
     */
    @Transactional(readOnly = true)
    public List<VehicleResponse> listForTrip(UUID jobId, UUID tripId) {
        Trip trip = jobTrips.tripOf(jobId, tripId);
        Set<UUID> held = availability.heldVehicleIds(trip);
        return vehicleRepository.findAllByStatus(VehicleStatus.ACTIVE).stream()
                .map(v -> {
                    String reason = availability.refusalFor(v, trip).orElse(null);
                    return FleetMapper.toResponse(v).toBuilder()
                            .available(reason == null)
                            .unavailableReason(reason)
                            .held(held.contains(v.getId()))
                            .build();
                })
                // The vehicle held for the trip's request first (US-F7-02), then those that may join it.
                .sorted(Comparator.comparing((VehicleResponse v) -> !(v.held() && v.available()))
                        .thenComparing(v -> !v.available())
                        .thenComparing(VehicleResponse::code))
                .toList();
    }

    @Transactional(readOnly = true)
    public VehicleResponse get(UUID id) {
        Vehicle vehicle = vehicleRepository
                .findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found: " + id));
        return FleetMapper.toResponse(vehicle);
    }

    @Transactional
    public VehicleResponse create(CreateVehicleRequest request) {
        return create(null, request);
    }

    /**
     * Adds a vehicle with its stalls, its home country, the countries it holds permits for and its operating
     * corridors; a corridor needs a permit for every country on it (US-F7-01).
     */
    @Transactional
    public VehicleResponse create(User actor, CreateVehicleRequest request) {
        if (vehicleRepository.existsByCode(request.code())) {
            throw new ConflictException("DUPLICATE_CODE", "Vehicle with code " + request.code() + " already exists");
        }

        Vehicle vehicle = new Vehicle();
        vehicle.setCode(request.code());
        vehicle.setKind(request.kind());
        vehicle.setPayloadKg(request.payloadKg());
        vehicle.setStatus(VehicleStatus.ACTIVE);
        if (request.homeCity() == null || request.homeCity().isBlank()) {
            throw new BusinessException("VEHICLE_HOME_CITY", "Pick the city the vehicle is based in.");
        }
        vehicle.setHomeCity(request.homeCity().trim());
        vehicle.setHomeCountry(countryOfCity(vehicle.getHomeCity()));
        vehicle.setPermittedCountries(permits(vehicle.getHomeCountry(), request.permittedCountryIds()));
        vehicle.setOperatingCorridors(operatingCorridors(vehicle, request.operatingCorridorIds()));

        List<VehicleStall> stalls = new ArrayList<>();
        if (request.stalls() != null && !request.stalls().isEmpty()) {
            for (CreateVehicleStallRequest sReq : request.stalls()) {
                VehicleStall stall = new VehicleStall();
                stall.setVehicle(vehicle);
                stall.setPositionNo(sReq.positionNo());
                stall.setStallType(sReq.stallType() != null ? sReq.stallType() : StallType.STANDARD);
                stall.setRowNo(sReq.rowNo());
                stall.setSide(sReq.side() != null ? sReq.side() : StallSide.LEFT);
                stall.setNearRamp(sReq.nearRamp());
                stalls.add(stall);
            }
        }
        vehicle.setStalls(stalls);

        Vehicle saved = vehicleRepository.save(vehicle);
        audit.recordDecision(
                actor,
                "VEHICLE_CREATED",
                summary("Added vehicle " + saved.getCode() + ": " + countriesText(saved) + "; runs "
                        + corridorsText(saved.getOperatingCorridors()) + "."),
                ENTITY_TYPE,
                saved.getId(),
                saved.getCode(),
                null,
                null,
                null);
        log.info("Created vehicle {} with {} stalls", saved.getCode(), stalls.size());
        return FleetMapper.toResponse(saved);
    }

    @Transactional
    public VehicleResponse update(UUID id, UpdateVehicleRequest request) {
        return update(null, id, request);
    }

    /**
     * Changes a vehicle. Its countries and corridors change only as a whole (US-F7-01): a corridor needs a permit for
     * every country on it, a permit stays while one of its corridors needs it, and a corridor or the home country
     * stays while the vehicle is on a trip that hasn't ended which depends on it. Each such change is audited.
     */
    @Transactional
    public VehicleResponse update(User actor, UUID id, UpdateVehicleRequest request) {
        Vehicle vehicle = vehicleRepository
                .findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found: " + id));

        if (request.payloadKg() != null && request.payloadKg() > 0) {
            vehicle.setPayloadKg(request.payloadKg());
        }
        if (request.status() != null) {
            vehicle.setStatus(request.status());
        }

        String before = countriesText(vehicle) + "; runs " + corridorsText(vehicle.getOperatingCorridors());
        boolean placeChanged = false;
        Country home = vehicle.getHomeCountry();
        String homeCity = vehicle.getHomeCity();
        if (request.homeCity() != null
                && !request.homeCity().isBlank()
                && !request.homeCity().trim().equalsIgnoreCase(homeCity)) {
            Country newHome = countryOfCity(request.homeCity().trim());
            refuseWhileOnOpenTrip(vehicle, tripVehicles.findOpenTrips(vehicle.getId(), Instant.now()), "its home city");
            homeCity = request.homeCity().trim();
            placeChanged = !Objects.equals(idOf(newHome), idOf(home));
            home = newHome;
        }
        Set<Country> permits = request.permittedCountryIds() == null && !placeChanged
                ? vehicle.getPermittedCountries()
                : permits(
                        home,
                        request.permittedCountryIds() == null
                                ? vehicle.getPermittedCountries().stream()
                                        .map(Country::getId)
                                        .toList()
                                : request.permittedCountryIds());
        Set<Corridor> runs = request.operatingCorridorIds() == null
                ? new HashSet<>(vehicle.getOperatingCorridors())
                : corridorsById(request.operatingCorridorIds());

        // A corridor taken off the vehicle can't be one of the trips it is still on.
        Set<UUID> dropped = vehicle.getOperatingCorridors().stream()
                .map(Corridor::getId)
                .filter(c -> runs.stream().noneMatch(r -> r.getId().equals(c)))
                .collect(Collectors.toSet());
        if (!dropped.isEmpty()) {
            refuseWhileOnOpenTrip(
                    vehicle, tripVehicles.findOpenTripsOn(vehicle.getId(), dropped, Instant.now()), "that corridor");
        }

        vehicle.setHomeCountry(home);
        vehicle.setHomeCity(homeCity);
        vehicle.setPermittedCountries(permits);
        // Every corridor it keeps or gains needs a permit for each of its countries; a permit taken away from a
        // corridor it keeps is refused here, naming the corridor.
        Set<UUID> kept =
                vehicle.getOperatingCorridors().stream().map(Corridor::getId).collect(Collectors.toSet());
        for (Corridor corridor : runs) {
            vehicle.refusalToRun(corridor).ifPresent(reason -> {
                throw new BusinessException(
                        "VEHICLE_PERMIT",
                        kept.contains(corridor.getId())
                                ? reason + " Take the corridor off the vehicle first."
                                : reason);
            });
        }
        vehicle.setOperatingCorridors(runs);

        Vehicle saved = vehicleRepository.save(vehicle);
        String after = countriesText(saved) + "; runs " + corridorsText(saved.getOperatingCorridors());
        if (!after.equals(before)) {
            audit.recordDecision(
                    actor,
                    "VEHICLE_PERMITS_CHANGED",
                    summary(saved.getCode() + ": " + before + " → " + after + "."),
                    ENTITY_TYPE,
                    saved.getId(),
                    saved.getCode(),
                    null,
                    null,
                    null);
        }
        return FleetMapper.toResponse(saved);
    }

    /**
     * Sets or clears the date the vehicle is expected back (US-F7-02), for what the calendar doesn't know. It counts
     * only while it is later than the date worked out from the bookings; a past date simply stops counting.
     */
    @Transactional
    public VehicleResponse setAvailableOn(User actor, UUID id, LocalDate availableOn) {
        Vehicle vehicle = vehicleRepository
                .findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found: " + id));
        LocalDate before = vehicle.getAvailableOn();
        if (Objects.equals(before, availableOn)) return FleetMapper.toResponse(vehicle);
        vehicle.setAvailableOn(availableOn);
        Vehicle saved = vehicleRepository.save(vehicle);
        audit.recordDecision(
                actor,
                "VEHICLE_AVAILABLE_ON_CHANGED",
                summary(saved.getCode() + " expected back: " + dateWords(before) + " → " + dateWords(availableOn)
                        + "."),
                ENTITY_TYPE,
                saved.getId(),
                saved.getCode(),
                null,
                null,
                null);
        return FleetMapper.toResponse(saved);
    }

    private static String dateWords(LocalDate date) {
        return date == null ? "not set" : BusinessTime.DAY.format(date);
    }

    private static final String ENTITY_TYPE = "VEHICLE";
    private static final int SUMMARY_MAX = 500;

    private static String summary(String text) {
        return text.length() <= SUMMARY_MAX ? text : text.substring(0, SUMMARY_MAX - 1) + "…";
    }

    private static UUID idOf(Country country) {
        return country == null ? null : country.getId();
    }

    /**
     * The country of a city's places (US-F7-03): a vehicle is based in a city a request can start or end at, as a
     * route's ends are.
     */
    private Country countryOfCity(String city) {
        return places.findByCityIgnoreCase(city).stream()
                .filter(p -> p.getKind() != PlaceKind.WELFARE_STOP)
                .map(Place::getCountry)
                .findFirst()
                .orElseThrow(() -> new BusinessException(
                        "VEHICLE_HOME_CITY", "No place in " + city + " yet. Add one on the Routes page first."));
    }

    /** The permitted countries; the home country is never listed, and an unknown one is refused. */
    private Set<Country> permits(Country home, Collection<UUID> ids) {
        Set<UUID> wanted = new LinkedHashSet<>(ids);
        wanted.remove(idOf(home));
        Map<UUID, Country> byId =
                countries.findAllById(wanted).stream().collect(Collectors.toMap(Country::getId, Function.identity()));
        for (UUID id : wanted) {
            if (!byId.containsKey(id)) throw ResourceNotFoundException.of("Country", id);
        }
        return new HashSet<>(byId.values());
    }

    private Set<Corridor> corridorsById(Collection<UUID> ids) {
        Set<UUID> wanted = new LinkedHashSet<>(ids);
        Map<UUID, Corridor> byId =
                corridors.findAllById(wanted).stream().collect(Collectors.toMap(Corridor::getId, Function.identity()));
        for (UUID id : wanted) {
            if (!byId.containsKey(id)) throw ResourceNotFoundException.of("Corridor", id);
        }
        return new HashSet<>(byId.values());
    }

    /** The corridors a new vehicle runs: road corridors only, each with a permit for every one of its countries. */
    private Set<Corridor> operatingCorridors(Vehicle vehicle, Collection<UUID> ids) {
        Set<Corridor> runs = corridorsById(ids);
        for (Corridor corridor : runs) {
            vehicle.refusalToRun(corridor).ifPresent(reason -> {
                throw new BusinessException("VEHICLE_PERMIT", reason);
            });
        }
        return runs;
    }

    private static void refuseWhileOnOpenTrip(Vehicle vehicle, List<Trip> open, String what) {
        if (open.isEmpty()) return;
        Trip trip = open.getFirst();
        String leaving = trip.getPlannedDepartureAt() == null
                ? ""
                : ", leaving "
                        + BusinessTime.SHORT_DAY.withZone(BusinessTime.ZONE).format(trip.getPlannedDepartureAt());
        throw new BusinessException(
                "VEHICLE_IN_USE",
                vehicle.getCode() + " is on " + trip.getCode() + " ("
                        + trip.getCorridor().getCode() + ")" + leaving + "; take it off that trip before changing "
                        + what + ".");
    }

    /** "Hanoi (VN) · KH, TH": the home city and country, then the permits. */
    private static String countriesText(Vehicle vehicle) {
        String home = (vehicle.getHomeCity() == null ? "" : vehicle.getHomeCity() + " ") + "("
                + (vehicle.getHomeCountry() == null
                        ? "?"
                        : vehicle.getHomeCountry().getCode()) + ")";
        String permits = vehicle.getPermittedCountries().stream()
                .map(Country::getCode)
                .filter(Objects::nonNull)
                .sorted()
                .collect(Collectors.joining(", "));
        return permits.isEmpty() ? home : home + " · " + permits;
    }

    private static String corridorsText(Collection<Corridor> runs) {
        if (runs.isEmpty()) return "no corridor";
        return runs.stream().map(Corridor::getCode).sorted().collect(Collectors.joining(", "));
    }

    @Transactional
    public VehicleBookingResponse bookVehicle(VehicleBookingRequest request) {
        Vehicle vehicle = vehicleRepository
                .findById(request.vehicleId())
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found: " + request.vehicleId()));

        if (vehicle.getStatus() != VehicleStatus.ACTIVE) {
            throw new BusinessException("Vehicle " + vehicle.getCode() + " is currently in " + vehicle.getStatus()
                    + " and cannot be booked");
        }

        if (!request.startsAt().isBefore(request.endsAt())) {
            throw new ConflictException("INVALID_PERIOD", "Booking start time must be before end time");
        }

        if (request.kind() == BookingKind.RESERVED) {
            throw new BusinessException(
                    "A vehicle is held for a request when the customer accepts its quotation, not booked by hand");
        }
        if (request.kind() == BookingKind.JOB && request.jobId() == null) {
            throw new BusinessException("A JOB booking requires a valid jobId");
        }
        if (request.kind() != BookingKind.JOB && request.jobId() != null) {
            throw new BusinessException("A " + request.kind() + " booking cannot have a jobId");
        }

        // BR-F3-04: No double booking. Check overlapping bookings for this vehicle.
        List<VehicleBooking> overlaps = vehicleBookingRepository.findOverlappingBookings(
                vehicle.getId(), request.startsAt(), request.endsAt(), null);
        if (!overlaps.isEmpty()) {
            throw new ConflictException(
                    "DOUBLE_BOOKING",
                    "Vehicle " + vehicle.getCode() + " is already booked between " + request.startsAt() + " and "
                            + request.endsAt());
        }

        // A job's booking is its trip's: the vehicle is booked once for the trip, whichever jobs it carries.
        Trip trip = null;
        if (request.jobId() != null) {
            TransportJob job = transportJobRepository
                    .findById(request.jobId())
                    .orElseThrow(() -> new ResourceNotFoundException("Job not found: " + request.jobId()));
            trip = jobTrips.tripOf(job.getId());
            // The vehicle has to be able to run the job's trip: its corridor, from where the trip starts (US-F7-01).
            availability.require(vehicle, trip);
        }

        VehicleBooking booking = new VehicleBooking();
        booking.setVehicle(vehicle);
        booking.setTrip(trip);
        booking.setKind(request.kind());
        booking.setStartsAt(request.startsAt());
        booking.setEndsAt(request.endsAt());

        try {
            // Flushed here, so a booking that loses a race to the no-overlap constraint is caught below.
            VehicleBooking saved = vehicleBookingRepository.saveAndFlush(booking);
            log.info(
                    "Booked vehicle {} for {} from {} to {}",
                    vehicle.getCode(),
                    request.kind(),
                    request.startsAt(),
                    request.endsAt());
            return FleetMapper.toBookingResponse(saved);
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            throw new ConflictException(
                    "DOUBLE_BOOKING",
                    "Vehicle " + vehicle.getCode() + " is already booked between " + request.startsAt() + " and "
                            + request.endsAt());
        }
    }

    @Transactional(readOnly = true)
    public List<VehicleBookingResponse> getFleetCalendar(Instant rangeStart, Instant rangeEnd) {
        return getFleetCalendar(rangeStart, rangeEnd, null);
    }

    @Transactional(readOnly = true)
    public List<VehicleBookingResponse> getFleetCalendar(
            Instant rangeStart, Instant rangeEnd, VehicleKind vehicleKind) {
        return vehicleBookingRepository.findInDateRange(rangeStart, rangeEnd).stream()
                .filter(b -> vehicleKind == null || b.getVehicle().getKind() == vehicleKind)
                .map(FleetMapper::toBookingResponse)
                .toList();
    }
}
