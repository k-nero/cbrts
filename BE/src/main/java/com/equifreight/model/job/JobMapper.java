package com.equifreight.model.job;

import com.equifreight.entity.CrewAssignment;
import com.equifreight.entity.Flight;
import com.equifreight.entity.FlightAllocation;
import com.equifreight.entity.Horse;
import com.equifreight.entity.LoadPlan;
import com.equifreight.entity.RouteLeg;
import com.equifreight.entity.RoutePlan;
import com.equifreight.entity.RouteStop;
import com.equifreight.entity.TransportJob;
import com.equifreight.entity.TransportRequest;
import com.equifreight.entity.User;
import com.equifreight.entity.VehicleStall;
import com.equifreight.entity.enums.DossierStatus;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public final class JobMapper {

    private JobMapper() {}

    public static JobSummaryResponse toSummaryResponse(
            TransportJob job, List<JobHorseResponse> horses, String blockingReason, String nextStepOwner) {
        return JobSummaryResponse.builder()
                .id(job.getId())
                .code(job.getCode())
                .originCity(originCity(job))
                .destinationCity(destinationCity(job))
                .horseCount(horses.size())
                .horseNames(horses.stream().map(JobHorseResponse::name).toList())
                .stage(job.getStage())
                .dossierStatus(job.getDossierStatus())
                .tripStatus(job.getTripStatus())
                .plannedDepartureAt(job.getPlannedDepartureAt())
                .windowStart(job.getWindowStart())
                .windowEnd(job.getWindowEnd())
                .clearanceReadyAt(job.getClearanceReadyAt())
                .blockingReason(blockingReason)
                .nextStepOwner(nextStepOwner)
                .transportSpecialist(nameOf(job.getTransportSpecialist()))
                .coordinator(nameOf(job.getCoordinator()))
                .build();
    }

    public static JobDetailResponse toDetailResponse(
            TransportJob job,
            String tripCode,
            String blockingReason,
            String nextStepOwner,
            String clearanceGateState,
            String clearanceGateSummary,
            List<JobHorseResponse> horses,
            TripLoadResponse loadPlan,
            RoutePlanResponse routePlan,
            List<CrewMemberResponse> crew,
            List<TripJobResponse> tripJobs) {
        return JobDetailResponse.builder()
                .id(job.getId())
                .code(job.getCode())
                .tripCode(tripCode)
                .originCity(originCity(job))
                .destinationCity(destinationCity(job))
                .stage(job.getStage())
                .dossierStatus(job.getDossierStatus())
                .tripStatus(job.getTripStatus())
                .plannedDepartureAt(job.getPlannedDepartureAt())
                .windowStart(job.getWindowStart())
                .windowEnd(job.getWindowEnd())
                .clearanceReadyAt(job.getClearanceReadyAt())
                .blockingReason(blockingReason)
                .nextStepOwner(nextStepOwner)
                .transportSpecialist(nameOf(job.getTransportSpecialist()))
                .coordinator(nameOf(job.getCoordinator()))
                .clearanceGateState(clearanceGateState)
                .clearanceGateSummary(clearanceGateSummary)
                .horses(horses)
                .loadPlan(loadPlan)
                .routePlan(routePlan)
                .crew(crew)
                .tripJobs(tripJobs)
                .build();
    }

    /** A job on a shared trip, or one that could join it (US-F3-11). */
    public static TripJobResponse toTripJobResponse(TransportJob job) {
        TransportRequest request = job.getRequest();
        return TripJobResponse.builder()
                .jobId(job.getId())
                .code(job.getCode())
                .origin(originCity(job))
                .destination(destinationCity(job))
                .horses(
                        request != null && request.getHorses() != null
                                ? request.getHorses().size()
                                : 0)
                .departureDate(request != null ? request.getDepartureDate() : null)
                .dateFlexDays(request != null ? request.getDateFlexDays() : 0)
                .clearanceReady(job.getDossierStatus() == DossierStatus.CLEARANCE_READY)
                .departed(job.getDepartedAt() != null)
                .build();
    }

    public static JobHorseResponse toHorseResponse(Horse h) {
        return JobHorseResponse.builder()
                .id(h.getId())
                .name(h.getName())
                .sex(h.getSex())
                .breed(h.getBreed())
                .weightKg(h.getWeightKg())
                .sizeClassCode(h.getSizeClass() != null ? h.getSizeClass().getCode() : "M")
                .requiredStall(h.getRequiredStall())
                .temperament(h.getTemperament())
                .handlingNotes(h.getHandlingNotes())
                .build();
    }

    /** A horse on a shared trip's load plan, with the job it travels under. */
    public static JobHorseResponse toHorseResponse(Horse h, String jobCode) {
        JobHorseResponse r = toHorseResponse(h);
        return new JobHorseResponse(
                r.id(),
                r.name(),
                r.sex(),
                r.breed(),
                r.weightKg(),
                r.sizeClassCode(),
                r.requiredStall(),
                r.temperament(),
                r.handlingNotes(),
                jobCode);
    }

    public static CrewMemberResponse toCrewMemberResponse(CrewAssignment ca) {
        User u = ca.getUser();
        return CrewMemberResponse.builder()
                .userId(u.getId())
                .name(u.getFirstName() + " " + u.getLastName())
                .staffCode(u.getStaffCode())
                .email(u.getEmail())
                .crewRole(ca.getCrewRole())
                .tripVehicleId(
                        ca.getTripVehicle() == null ? null : ca.getTripVehicle().getId())
                .vehicleCode(
                        ca.getTripVehicle() == null
                                ? null
                                : ca.getTripVehicle().getVehicle().getCode())
                .onFlight(ca.getTripVehicle() == null)
                .build();
    }

    /** A load-plan rule broken by a horse in a stall; both are null for a rule about the whole vehicle. */
    public static LoadPlanConflictResponse toConflictResponse(
            Horse horse, VehicleStall stall, String rule, String description) {
        return LoadPlanConflictResponse.builder()
                .horseId(horse != null ? horse.getId() : null)
                .horseName(horse != null ? horse.getName() : null)
                .stallId(stall != null ? stall.getId() : null)
                .stallPositionNo(stall != null ? stall.getPositionNo() : null)
                .rule(rule)
                .description(description)
                .build();
    }

    public static LoadPlanStallResponse toLoadPlanStallResponse(
            VehicleStall stall, JobHorseResponse horse, String issue) {
        return LoadPlanStallResponse.builder()
                .stallId(stall.getId())
                .positionNo(stall.getPositionNo())
                .stallType(stall.getStallType())
                .rowNo(stall.getRowNo())
                .side(stall.getSide())
                .nearRamp(stall.isNearRamp())
                .horse(horse)
                .issue(issue)
                .build();
    }

    public static LoadPlanResponse toLoadPlanResponse(
            LoadPlan plan,
            TransportJob job,
            int totalWeightKg,
            List<LoadPlanStallResponse> stalls,
            List<LoadPlanConflictResponse> conflicts) {
        return LoadPlanResponse.builder()
                .id(plan.getId())
                .jobId(job.getId())
                .tripVehicleId(plan.getTripVehicle().getId())
                .seq(plan.getTripVehicle().getSeq())
                .vehicleId(plan.getVehicle().getId())
                .vehicleCode(plan.getVehicle().getCode())
                .status(plan.getStatus())
                .confirmedByName(fullName(plan.getConfirmedBy()))
                .confirmedAt(plan.getConfirmedAt())
                .totalWeightKg(totalWeightKg)
                .payloadKg(plan.getVehicle().getPayloadKg())
                .stalls(stalls)
                .conflicts(conflicts)
                .build();
    }

    /**
     * A route plan of {@code jobId}'s trip with its stops and legs; {@code flightsByLegId} holds the flight of each
     * air leg.
     */
    public static RoutePlanResponse toRoutePlanResponse(RoutePlan plan, UUID jobId, Map<UUID, Flight> flightsByLegId) {
        return RoutePlanResponse.builder()
                .id(plan.getId())
                .jobId(jobId)
                .versionNo(plan.getVersionNo())
                .status(plan.getStatus())
                .distanceKm(plan.getDistanceKm())
                .durationMin(plan.getDurationMin())
                .confirmedByName(fullName(plan.getConfirmedBy()))
                .confirmedAt(plan.getConfirmedAt())
                .supersededAt(plan.getSupersededAt())
                .changeReason(plan.getChangeReason())
                .stops(plan.getStops().stream().map(JobMapper::toStopResponse).toList())
                .legs(plan.getLegs().stream()
                        .map(leg -> toLegResponse(leg, flightsByLegId.get(leg.getId())))
                        .toList())
                .build();
    }

    public static RouteStopResponse toStopResponse(RouteStop s) {
        return RouteStopResponse.builder()
                .id(s.getId())
                .seq(s.getSeq())
                .kind(s.getKind())
                .jobId(s.getJob() != null ? s.getJob().getId() : null)
                .jobCode(s.getJob() != null ? s.getJob().getCode() : null)
                .placeId(s.getPlace() != null ? s.getPlace().getId() : null)
                .placeName(s.getPlace() != null ? s.getPlace().getName() : null)
                .borderCrossingId(
                        s.getBorderCrossing() != null ? s.getBorderCrossing().getId() : null)
                .borderCrossingName(
                        s.getBorderCrossing() != null ? s.getBorderCrossing().getName() : null)
                .plannedAt(s.getPlannedAt())
                .plannedStayMin(s.getPlannedStayMin())
                .details(s.getDetails())
                .build();
    }

    /** A leg of a route plan; {@code flight} is null for a road leg. */
    public static RouteLegResponse toLegResponse(RouteLeg leg, Flight flight) {
        return RouteLegResponse.builder()
                .id(leg.getId())
                .seq(leg.getSeq())
                .fromStopId(leg.getFromStop().getId())
                .toStopId(leg.getToStop().getId())
                .mode(leg.getMode())
                .vehicleId(leg.getVehicle() != null ? leg.getVehicle().getId() : null)
                .vehicleCode(leg.getVehicle() != null ? leg.getVehicle().getCode() : null)
                .distanceKm(leg.getDistanceKm())
                .plannedMin(leg.getPlannedMin())
                .flight(flight != null ? toFlightResponse(flight) : null)
                .build();
    }

    public static FlightResponse toFlightResponse(Flight f) {
        return FlightResponse.builder()
                .id(f.getId())
                .airline(f.getAirline())
                .flightNo(f.getFlightNo())
                .aircraftType(f.getAircraftType())
                .stallCapacity(f.getStallCapacity())
                .scheduledDepartureAt(f.getScheduledDepartureAt())
                .scheduledArrivalAt(f.getScheduledArrivalAt())
                .estimatedDepartureAt(f.getEstimatedDepartureAt())
                .estimatedArrivalAt(f.getEstimatedArrivalAt())
                .allocations(f.getAllocations().stream()
                        .map(JobMapper::toAllocationResponse)
                        .toList())
                .build();
    }

    public static FlightAllocationResponse toAllocationResponse(FlightAllocation a) {
        return new FlightAllocationResponse(
                a.getId(),
                a.getJob().getId(),
                a.getJob().getCode(),
                a.getAirWaybill(),
                a.getStallPositions(),
                a.getServiceClass());
    }

    /** The pickup city: the request's origin place, else the corridor's origin. */
    private static String originCity(TransportJob job) {
        if (job.getRequest() != null) {
            if (job.getRequest().getOriginPlace() != null
                    && job.getRequest().getOriginPlace().getCity() != null) {
                return job.getRequest().getOriginPlace().getCity();
            }
            if (job.getRequest().getCorridor() != null
                    && job.getRequest().getCorridor().getOriginCity() != null) {
                return job.getRequest().getCorridor().getOriginCity();
            }
        }
        return "Not set";
    }

    /** The delivery city: the request's destination place, else the corridor's destination. */
    private static String destinationCity(TransportJob job) {
        if (job.getRequest() != null) {
            if (job.getRequest().getDestinationPlace() != null
                    && job.getRequest().getDestinationPlace().getCity() != null) {
                return job.getRequest().getDestinationPlace().getCity();
            }
            if (job.getRequest().getCorridor() != null
                    && job.getRequest().getCorridor().getDestinationCity() != null) {
                return job.getRequest().getCorridor().getDestinationCity();
            }
        }
        return "Not set";
    }

    public static String fullName(User user) {
        return user != null ? user.getFirstName() + " " + user.getLastName() : null;
    }

    private static String nameOf(User user) {
        return user == null ? null : user.displayName();
    }
}
