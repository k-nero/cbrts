package com.equifreight.service;

import com.equifreight.entity.CrewAssignment;
import com.equifreight.entity.Horse;
import com.equifreight.entity.IncidentOption;
import com.equifreight.entity.LoadPlan;
import com.equifreight.entity.LoadPlanStall;
import com.equifreight.entity.TransportJob;
import com.equifreight.entity.Trip;
import com.equifreight.entity.TripHorse;
import com.equifreight.entity.TripJob;
import com.equifreight.entity.TripVehicle;
import com.equifreight.entity.User;
import com.equifreight.entity.Vehicle;
import com.equifreight.entity.enums.LeavingKind;
import com.equifreight.entity.enums.TripStatus;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.model.incident.AddIncidentOptionRequest;
import com.equifreight.repository.CrewAssignmentRepository;
import com.equifreight.repository.LoadPlanRepository;
import com.equifreight.repository.VehicleBookingRepository;
import com.equifreight.repository.VehicleRepository;
import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Leaving a moving trip (US-F5-06, docs/shared-trips-design.md "Leaving a moving trip"): once a trip has departed, a
 * job or some of its horses leave it only through an incident decision. The leaving horses go to a new trip of their
 * own (unloaded to continue later, collected by a second vehicle, or taken back to their pickup), or are left in
 * care; the trip carries on with the others. Records made so far stay on the trip where they happened.
 */
@Service
public class TripLeavingService {

    private final JobTripService jobTrips;
    private final LoadPlanService loadPlans;
    private final LoadPlanRepository loadPlanRows;
    private final CrewAssignmentRepository crew;
    private final VehicleBookingRepository bookings;
    private final VehicleRepository vehicles;

    public TripLeavingService(
            JobTripService jobTrips,
            LoadPlanService loadPlans,
            LoadPlanRepository loadPlanRows,
            CrewAssignmentRepository crew,
            VehicleBookingRepository bookings,
            VehicleRepository vehicles) {
        this.jobTrips = jobTrips;
        this.loadPlans = loadPlans;
        this.loadPlanRows = loadPlanRows;
        this.crew = crew;
        this.bookings = bookings;
        this.vehicles = vehicles;
    }

    /** What deciding a leaving option did: the horses' new trip (null when left in care), and whether the job left. */
    public record Departure(Trip newTrip, boolean jobLeftTrip, List<String> horses) {}

    /**
     * The trip the job is moving on: its part that has departed and isn't delivered; else its current trip. An
     * incident on a job split by an earlier one is about the part on the road.
     */
    @Transactional(readOnly = true)
    public Trip movingTrip(TransportJob job) {
        return jobTrips.activePartsOf(job).stream()
                .filter(p -> p.departed() && p.getStatus() != TripStatus.DELIVERED)
                .map(TripJob::getTrip)
                .findFirst()
                .orElseGet(() -> jobTrips.tripOf(job.getId()));
    }

    /**
     * Fills in the leaving facts of an option from {@code request}: the horses (the job's horses on its moving trip;
     * all of them when none is named), the place they are unloaded or left in care, the second vehicle. Only a trip
     * that has departed is left this way; before departure, a job comes off a trip on the Load plan tab.
     */
    @Transactional(readOnly = true)
    public void prepare(TransportJob job, IncidentOption option, AddIncidentOptionRequest request) {
        option.setCustomerPays(request.customerPays());
        if (request.leavingKind() == null) return;
        Trip trip = movingTrip(job);
        if (!jobTrips.partDeparted(trip, job)) {
            throw new BusinessException("Trip " + trip.getCode() + " hasn't departed: before departure, take "
                    + job.getCode() + " off it on the Load plan tab");
        }
        List<Horse> riding = jobTrips.horsesOn(trip).stream()
                .filter(th -> th.getJob().getId().equals(job.getId()))
                .map(TripHorse::getHorse)
                .toList();
        Set<Horse> leaving = new HashSet<>();
        if (request.horseIds().isEmpty()) {
            leaving.addAll(riding);
        } else {
            for (UUID horseId : request.horseIds()) {
                leaving.add(riding.stream()
                        .filter(h -> h.getId().equals(horseId))
                        .findFirst()
                        .orElseThrow(() -> new BusinessException(
                                "Only " + job.getCode() + "'s horses on trip " + trip.getCode() + " can leave it")));
            }
        }
        if (leaving.isEmpty()) {
            throw new BusinessException(job.getCode() + " has no horse left on trip " + trip.getCode());
        }
        String place = request.leavingPlace() == null || request.leavingPlace().isBlank()
                ? null
                : request.leavingPlace().strip();
        switch (request.leavingKind()) {
            case UNLOAD, LEAVE_IN_CARE -> {
                if (place == null) throw new BusinessException("Say where the horses are unloaded or left in care");
            }
            case SECOND_VEHICLE -> {
                if (request.vehicleId() == null) throw new BusinessException("Choose the second vehicle");
                Vehicle vehicle = vehicles.findById(request.vehicleId())
                        .orElseThrow(() -> ResourceNotFoundException.of("Vehicle", request.vehicleId()));
                option.setVehicle(vehicle);
            }
            case RETURN_TO_ORIGIN -> {}
        }
        option.setLeavingKind(request.leavingKind());
        option.setLeavingPlace(place);
        option.setHorses(leaving);
        option.setChangesRoute(true);
    }

    /**
     * Takes the option's horses off {@code trip} (US-F5-06). Left in care, they stay on it as LEFT_IN_CARE: delivered
     * as far as this move goes. Otherwise they move to a new trip of their own: a trailer carrying only them goes
     * along with its load plan, crew and booking, a second vehicle joins it, and the trip waits to be planned and
     * signed off before it departs. Their placements on the trailers that stay are taken off.
     */
    @Transactional
    public Departure leave(Trip trip, TransportJob job, IncidentOption option, User by, Instant at) {
        Set<UUID> ids = option.getHorses().stream().map(Horse::getId).collect(Collectors.toSet());
        List<String> names =
                option.getHorses().stream().map(Horse::getName).sorted().toList();
        if (option.getLeavingKind() == LeavingKind.LEAVE_IN_CARE) {
            jobTrips.leaveInCare(trip, job, ids);
            loadPlans.unload(trip, ids);
            jobTrips.summarize(job);
            return new Departure(null, noneLeftOn(trip, job), names);
        }
        Trip newTrip = jobTrips.newTripFor(job, by, at);
        for (LoadPlan plan : loadPlanRows.findByTripVehicle_Trip_IdOrderByTripVehicle_Seq(trip.getId())) {
            Set<UUID> aboard = plan.getStalls().stream()
                    .map(LoadPlanStall::getHorse)
                    .map(Horse::getId)
                    .collect(Collectors.toSet());
            if (!aboard.isEmpty() && ids.containsAll(aboard)) {
                TripVehicle trailer = plan.getTripVehicle();
                for (CrewAssignment member : crew.findByTripVehicle_Id(trailer.getId())) member.setTrip(newTrip);
                bookings.findByTrip_IdAndVehicle_Id(
                                trip.getId(), trailer.getVehicle().getId())
                        .ifPresent(b -> b.setTrip(newTrip));
                jobTrips.moveVehicle(trailer, newTrip);
            }
        }
        loadPlans.unload(trip, ids);
        jobTrips.moveHorses(job, ids, trip, newTrip);
        if (option.getLeavingKind() == LeavingKind.SECOND_VEHICLE
                && jobTrips.vehiclesOf(newTrip).stream()
                        .noneMatch(tv -> tv.getVehicle()
                                .getId()
                                .equals(option.getVehicle().getId()))) {
            jobTrips.addVehicle(newTrip, option.getVehicle());
        }
        jobTrips.summarize(job);
        return new Departure(newTrip, noneLeftOn(trip, job), names);
    }

    private boolean noneLeftOn(Trip trip, TransportJob job) {
        return jobTrips.horsesOn(trip).stream()
                .noneMatch(th -> th.getJob().getId().equals(job.getId()));
    }
}
