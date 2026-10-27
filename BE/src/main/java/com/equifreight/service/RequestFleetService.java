package com.equifreight.service;

import com.equifreight.configuration.BusinessTime;
import com.equifreight.entity.Corridor;
import com.equifreight.entity.TransportJob;
import com.equifreight.entity.TransportRequest;
import com.equifreight.entity.Trip;
import com.equifreight.entity.Vehicle;
import com.equifreight.entity.VehicleBooking;
import com.equifreight.entity.enums.BookingKind;
import com.equifreight.entity.enums.RequestStatus;
import com.equifreight.entity.enums.VehicleStatus;
import com.equifreight.model.review.FleetCheckResponse;
import com.equifreight.repository.VehicleBookingRepository;
import com.equifreight.repository.VehicleRepository;
import java.time.Clock;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.extern.log4j.Log4j2;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * A request and the fleet (US-F7-02): whether a vehicle can run it, for the Request review page, and the vehicle held
 * for it from the customer's acceptance until its trip's load plan is confirmed. Nothing here blocks the manager: the
 * check informs quoting, approving and rejecting, and a request no vehicle can run still moves on, unheld.
 */
@Service
@Log4j2
public class RequestFleetService {

    /** How far past the requested date the check looks for the earliest date a vehicle can start. */
    static final int HORIZON_DAYS = 60;

    static final String ENTITY_TYPE = "TRANSPORT_REQUEST";

    /** From acceptance on, a request has, or lacks, its hold. */
    private static final Set<RequestStatus> HOLDING = Set.of(RequestStatus.CUSTOMER_ACCEPTED, RequestStatus.APPROVED);

    private final VehicleRepository vehicles;
    private final VehicleBookingRepository bookings;
    private final VehicleAvailability availability;
    private final JobTripService jobTrips;
    private final AuditService audit;
    private final Clock clock;

    public RequestFleetService(
            VehicleRepository vehicles,
            VehicleBookingRepository bookings,
            VehicleAvailability availability,
            JobTripService jobTrips,
            AuditService audit,
            Clock clock) {
        this.vehicles = vehicles;
        this.bookings = bookings;
        this.availability = availability;
        this.jobTrips = jobTrips;
        this.audit = audit;
        this.clock = clock;
    }

    /**
     * Whether a vehicle can run {@code request} on its date or within its flexible days, and the earliest date one can
     * when none can; null while the request has no route or date.
     */
    @Transactional(readOnly = true)
    public FleetCheckResponse check(TransportRequest request) {
        LocalDate date = request.getDepartureDate();
        if (request.getCorridor() == null || date == null) return null;
        FleetCheckResponse.FleetCheckResponseBuilder out =
                FleetCheckResponse.builder().date(date);
        heldFor(request, out);
        Optional<Corridor> driven = availability.heldCorridor(request);
        if (driven.isEmpty()) {
            return out.outcome("FLOWN")
                    .message("Flown from the airport: no vehicle takes the horses to it.")
                    .held(null)
                    .build();
        }
        Corridor corridor = driven.get();
        List<Vehicle> runners = runners(corridor);
        if (runners.isEmpty()) {
            return out.outcome("NO_VEHICLE")
                    .message("No vehicle runs " + corridor.getCode() + " yet. Assign one on the Vehicles page.")
                    .build();
        }
        Optional<Vehicle> onDate = runners.stream()
                .filter(v -> availability.refusalFor(v, request, date).isEmpty())
                .findFirst();
        if (onDate.isPresent()) {
            return out.outcome("FREE")
                    .vehicleCode(onDate.get().getCode())
                    .message(onDate.get().getCode() + " can start on " + day(date) + ".")
                    .build();
        }

        int flex = Math.max(0, request.getDateFlexDays());
        LocalDate today = LocalDate.now(clock.withZone(BusinessTime.ZONE));
        LocalDate from = date.minusDays(flex).isBefore(today) ? today : date.minusDays(flex);
        LocalDate lastFlex = date.plusDays(flex);
        Earliest best = null;
        for (Vehicle v : runners) {
            Optional<LocalDate> earliest = availability.earliestStart(v, request, from, date.plusDays(HORIZON_DAYS));
            if (earliest.isPresent() && (best == null || earliest.get().isBefore(best.day()))) {
                best = new Earliest(v, earliest.get());
            }
        }
        if (best != null && !best.day().isAfter(lastFlex)) {
            return out.outcome("WITHIN_FLEX")
                    .vehicleCode(best.vehicle().getCode())
                    .earliest(best.day())
                    .message("No vehicle can start on " + day(date) + "; "
                            + best.vehicle().getCode() + " can start on " + day(best.day())
                            + ", within the flexible dates.")
                    .build();
        }
        String by = flex == 0 ? "on " + day(date) : "by " + day(lastFlex);
        if (best != null) {
            return out.outcome("NONE")
                    .vehicleCode(best.vehicle().getCode())
                    .earliest(best.day())
                    .message("No vehicle can run " + corridor.getCode() + " " + by + "; the earliest is "
                            + day(best.day()) + " (" + best.vehicle().getCode() + ").")
                    .build();
        }
        return out.outcome("NONE")
                .message("No vehicle can run " + corridor.getCode() + " " + by + ", nor in the " + HORIZON_DAYS
                        + " days after it.")
                .build();
    }

    private record Earliest(Vehicle vehicle, LocalDate day) {}

    private void heldFor(TransportRequest request, FleetCheckResponse.FleetCheckResponseBuilder out) {
        if (request.getId() == null) return;
        Optional<VehicleBooking> hold = bookings.findFirstByRequest_Id(request.getId());
        if (hold.isPresent()) {
            out.held(true)
                    .heldVehicle(hold.get().getVehicle().getCode())
                    .heldFrom(hold.get().getStartsAt().atZone(BusinessTime.ZONE).toLocalDate());
        } else if (HOLDING.contains(request.getStatus())) {
            out.held(false);
        }
    }

    /**
     * Holds the first vehicle that can run {@code request} on its departure date (US-F7-02): a RESERVED booking from
     * the start of that day for the corridor's driving days. A flight's request holds the vehicle that takes the
     * horses to the airport, on the leg to the hub or the local run to the cargo terminal. Nothing is held when no
     * road comes before the flight, when the request already has a hold, or when no vehicle can; the request moves on
     * either way.
     */
    @Transactional
    public Optional<VehicleBooking> hold(TransportRequest request) {
        Corridor corridor = availability.heldCorridor(request).orElse(null);
        if (corridor == null || request.getDepartureDate() == null) return Optional.empty();
        Optional<VehicleBooking> existing = bookings.findFirstByRequest_Id(request.getId());
        if (existing.isPresent()) return existing;
        LocalDate date = request.getDepartureDate();
        for (Vehicle v : runners(corridor)) {
            if (availability.refusalFor(v, request, date).isPresent()) continue;
            VehicleBooking hold = new VehicleBooking();
            hold.setVehicle(v);
            hold.setRequest(request);
            hold.setKind(BookingKind.RESERVED);
            hold.setStartsAt(VehicleAvailability.startOf(date));
            hold.setEndsAt(VehicleAvailability.afterDriving(hold.getStartsAt(), corridor));
            try {
                // Flushed here, so a hold that loses a race to the no-overlap constraint moves on to the next vehicle.
                VehicleBooking saved = bookings.saveAndFlush(hold);
                audit.recordSystem(
                        "VEHICLE_HELD",
                        v.getCode() + " held for " + request.getCode() + " from " + day(date) + " ("
                                + corridor.getCode() + ").",
                        ENTITY_TYPE,
                        request.getId(),
                        request.getCode(),
                        null,
                        null);
                return Optional.of(saved);
            } catch (DataIntegrityViolationException e) {
                log.info("Vehicle {} was booked meanwhile; trying the next for {}", v.getCode(), request.getCode());
            }
        }
        audit.recordSystem(
                "NO_VEHICLE_HELD",
                "No vehicle could be held for " + request.getCode() + " on " + day(date) + " (" + corridor.getCode()
                        + ").",
                ENTITY_TYPE,
                request.getId(),
                request.getCode(),
                null,
                null);
        return Optional.empty();
    }

    /**
     * At approval: keeps the hold while its vehicle can still run the request, else releases it and holds again, or
     * holds one now when there was none.
     */
    @Transactional
    public Optional<VehicleBooking> recheck(TransportRequest request) {
        Optional<VehicleBooking> existing = bookings.findFirstByRequest_Id(request.getId());
        if (existing.isPresent()) {
            Optional<String> refusal =
                    availability.refusalFor(existing.get().getVehicle(), request, request.getDepartureDate());
            if (refusal.isEmpty()) return existing;
            release(request, refusal.get());
        }
        return hold(request);
    }

    /** Releases the request's hold, if any, with why (rejected, cancelled, no longer able to run it). */
    @Transactional
    public void release(TransportRequest request, String why) {
        List<VehicleBooking> holds = bookings.findByRequest_IdIn(Set.of(request.getId()));
        if (holds.isEmpty()) return;
        String codes = holds.stream().map(b -> b.getVehicle().getCode()).collect(Collectors.joining(", "));
        bookings.deleteAll(holds);
        bookings.flush();
        audit.recordSystem(
                "VEHICLE_RELEASED",
                codes + " released from " + request.getCode() + ": " + why,
                ENTITY_TYPE,
                request.getId(),
                request.getCode(),
                null,
                null);
    }

    /**
     * Releases the holds of the requests whose jobs ride {@code trip}, as its load plan is confirmed: the trip's own
     * bookings take their place, on the held vehicle or another.
     */
    @Transactional
    public void releaseForTrip(Trip trip) {
        Set<UUID> requestIds = jobTrips.jobsOn(trip).stream()
                .map(TransportJob::getRequest)
                .filter(Objects::nonNull)
                .map(TransportRequest::getId)
                .collect(Collectors.toSet());
        if (requestIds.isEmpty()) return;
        List<VehicleBooking> holds = bookings.findByRequest_IdIn(requestIds);
        if (holds.isEmpty()) return;
        bookings.deleteAll(holds);
        bookings.flush();
    }

    /** The active vehicles that work {@code corridor}, by code. */
    private List<Vehicle> runners(Corridor corridor) {
        return vehicles.findAllByStatus(VehicleStatus.ACTIVE).stream()
                .filter(v -> v.runs(corridor))
                .sorted(Comparator.comparing(Vehicle::getCode))
                .toList();
    }

    private static String day(LocalDate date) {
        return BusinessTime.SHORT_DAY.format(date);
    }
}
