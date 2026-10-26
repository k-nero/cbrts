package com.equifreight.service;

import com.equifreight.configuration.BusinessTime;
import com.equifreight.entity.Corridor;
import com.equifreight.entity.Country;
import com.equifreight.entity.TransportJob;
import com.equifreight.entity.Trip;
import com.equifreight.entity.Vehicle;
import com.equifreight.entity.VehicleBooking;
import com.equifreight.entity.enums.VehicleStatus;
import com.equifreight.exception.BusinessException;
import com.equifreight.repository.VehicleBookingRepository;
import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Whether a vehicle may join a road trip (US-F3-19, docs/vehicle-permits-availability-plan.md). In this order: it is
 * active, the trip's corridor is one of its operating corridors, it is in the country the trip starts in when the
 * trip starts, and no other booking overlaps the trip. An air trip carries no vehicle, so only the status is checked
 * there. Every point where a vehicle joins a trip asks here, so each refuses with the same sentence.
 */
@Service
public class VehicleAvailability {

    private static final DateTimeFormatter DAY = BusinessTime.SHORT_DAY.withZone(BusinessTime.ZONE);
    private static final DateTimeFormatter DAY_TIME =
            DateTimeFormatter.ofPattern("d MMM HH:mm", Locale.ENGLISH).withZone(BusinessTime.ZONE);

    private final JobTripService jobTrips;
    private final VehicleBookingRepository bookings;

    public VehicleAvailability(JobTripService jobTrips, VehicleBookingRepository bookings) {
        this.jobTrips = jobTrips;
        this.bookings = bookings;
    }

    /**
     * When the trip runs: from its planned departure (or its jobs' earliest, or their requests' earliest departure
     * date) to its jobs' latest planned arrival. Either end is null while it isn't known yet.
     */
    public record Span(Instant startsAt, Instant endsAt) {}

    @Transactional(readOnly = true)
    public Span spanOf(Trip trip) {
        List<TransportJob> jobs = jobTrips.jobsOn(trip);
        Instant startsAt = trip.getPlannedDepartureAt();
        if (startsAt == null) {
            startsAt = jobs.stream()
                    .map(TransportJob::getPlannedDepartureAt)
                    .filter(Objects::nonNull)
                    .min(Comparator.naturalOrder())
                    .orElse(null);
        }
        if (startsAt == null) {
            startsAt = jobs.stream()
                    .map(j -> j.getRequest() == null ? null : j.getRequest().getDepartureDate())
                    .filter(Objects::nonNull)
                    .min(Comparator.naturalOrder())
                    .map(d -> d.atStartOfDay(BusinessTime.ZONE).toInstant())
                    .orElse(null);
        }
        Instant endsAt = jobs.isEmpty() || jobs.stream().anyMatch(j -> j.getPlannedArrivalAt() == null)
                ? null
                : jobs.stream()
                        .map(TransportJob::getPlannedArrivalAt)
                        .max(Comparator.naturalOrder())
                        .orElse(null);
        return new Span(startsAt, endsAt);
    }

    /**
     * Where the vehicle is at {@code at}: the country its last trip booking ending by then ends in, or its home country
     * when it has none. {@code tripId}'s own booking is left out, so a trip doesn't place the vehicle at its own end.
     */
    @Transactional(readOnly = true)
    public Country locationAt(Vehicle vehicle, Instant at, UUID tripId) {
        return bookings.findTripBookingsEndingBy(vehicle.getId(), at, tripId).stream()
                .findFirst()
                .map(b -> b.getTrip().getCorridor().getDestinationCountry())
                .orElse(vehicle.getHomeCountry());
    }

    /** Why {@code vehicle} can't join {@code trip}, or empty when it can. */
    @Transactional(readOnly = true)
    public Optional<String> refusalFor(Vehicle vehicle, Trip trip) {
        if (vehicle.getStatus() != VehicleStatus.ACTIVE) {
            return Optional.of(
                    vehicle.getCode() + " is " + statusWords(vehicle.getStatus()) + " and can't run a trip.");
        }
        Corridor corridor = trip.getCorridor();
        if (corridor == null || !corridor.isRoad()) return Optional.empty();
        if (!vehicle.runs(corridor)) {
            return Optional.of(vehicle.getCode() + " doesn't run " + corridor.getCode() + ".");
        }

        Span span = spanOf(trip);
        Instant at = span.startsAt() != null ? span.startsAt() : Instant.now();
        Country where = locationAt(vehicle, at, trip.getId());
        Country start = corridor.getOriginCountry();
        if (where != null && start != null && !Objects.equals(where.getId(), start.getId())) {
            String when = span.startsAt() != null
                    ? "will be in " + where.getName() + " on " + DAY.format(at)
                    : "is in " + where.getName();
            return Optional.of(vehicle.getCode() + " " + when + "; this trip starts in " + start.getName() + ".");
        }

        if (span.startsAt() != null && span.endsAt() != null && span.startsAt().isBefore(span.endsAt())) {
            Optional<Instant> busyUntil =
                    bookings.findOverlappingBookings(vehicle.getId(), span.startsAt(), span.endsAt(), null).stream()
                            .filter(b ->
                                    b.getTrip() == null || !b.getTrip().getId().equals(trip.getId()))
                            .map(VehicleBooking::getEndsAt)
                            .max(Comparator.naturalOrder());
            if (busyUntil.isPresent()) {
                return Optional.of(vehicle.getCode() + " is booked until " + DAY_TIME.format(busyUntil.get()) + ".");
            }
        }
        return Optional.empty();
    }

    /** Refuses {@code vehicle} for {@code trip} with the reason, as every planning entry point does. */
    @Transactional(readOnly = true)
    public void require(Vehicle vehicle, Trip trip) {
        refusalFor(vehicle, trip).ifPresent(reason -> {
            throw new BusinessException("VEHICLE_UNAVAILABLE", reason);
        });
    }

    /**
     * The first of {@code candidates} that may join {@code trip}; refused, naming the corridor, when none may. On an
     * air trip the first active one.
     */
    @Transactional(readOnly = true)
    public Vehicle firstAvailable(List<Vehicle> candidates, Trip trip) {
        Optional<Vehicle> found =
                candidates.stream().filter(v -> refusalFor(v, trip).isEmpty()).findFirst();
        if (found.isPresent()) return found.get();
        Corridor corridor = trip.getCorridor();
        if (corridor == null || !corridor.isRoad()) {
            throw new BusinessException("VEHICLE_UNAVAILABLE", "No active vehicle is available for this trip.");
        }
        if (candidates.stream().noneMatch(v -> v.runs(corridor))) {
            throw new BusinessException(
                    "VEHICLE_UNAVAILABLE",
                    "No vehicle runs " + corridor.getCode() + " yet. Assign one on the Vehicles page.");
        }
        Span span = spanOf(trip);
        String on = span.startsAt() == null ? "" : " on " + DAY.format(span.startsAt());
        String in = corridor.getOriginCountry() == null
                ? ""
                : " and in " + corridor.getOriginCountry().getName();
        throw new BusinessException(
                "VEHICLE_UNAVAILABLE", "No vehicle that runs " + corridor.getCode() + " is free" + in + on + ".");
    }

    private static String statusWords(VehicleStatus status) {
        return switch (status) {
            case MAINTENANCE -> "in maintenance";
            case RETIRED -> "retired";
            case ACTIVE -> "active";
        };
    }
}
