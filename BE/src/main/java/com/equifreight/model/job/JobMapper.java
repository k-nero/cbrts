package com.equifreight.model.job;

import com.equifreight.entity.CrewAssignment;
import com.equifreight.entity.Flight;
import com.equifreight.entity.Horse;
import com.equifreight.entity.LoadPlan;
import com.equifreight.entity.RouteLeg;
import com.equifreight.entity.RoutePlan;
import com.equifreight.entity.RouteStop;
import com.equifreight.entity.TransportJob;
import com.equifreight.entity.User;
import com.equifreight.entity.VehicleStall;
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
                .build();
    }

    public static JobDetailResponse toDetailResponse(
            TransportJob job,
            String blockingReason,
            String nextStepOwner,
            String clearanceGateState,
            String clearanceGateSummary,
            List<JobHorseResponse> horses,
            LoadPlanResponse loadPlan,
            RoutePlanResponse routePlan,
            List<CrewMemberResponse> crew) {
        return JobDetailResponse.builder()
                .id(job.getId())
                .code(job.getCode())
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
                .clearanceGateState(clearanceGateState)
                .clearanceGateSummary(clearanceGateSummary)
                .horses(horses)
                .loadPlan(loadPlan)
                .routePlan(routePlan)
                .crew(crew)
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

    public static CrewMemberResponse toCrewMemberResponse(CrewAssignment ca) {
        User u = ca.getUser();
        return CrewMemberResponse.builder()
                .userId(u.getId())
                .name(u.getFirstName() + " " + u.getLastName())
                .staffCode(u.getStaffCode())
                .email(u.getEmail())
                .crewRole(ca.getCrewRole())
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
            int totalWeightKg,
            List<LoadPlanStallResponse> stalls,
            List<JobHorseResponse> unassignedHorses,
            List<LoadPlanConflictResponse> conflicts) {
        return LoadPlanResponse.builder()
                .id(plan.getId())
                .jobId(plan.getJob().getId())
                .vehicleId(plan.getVehicle().getId())
                .vehicleCode(plan.getVehicle().getCode())
                .status(plan.getStatus())
                .confirmedByName(fullName(plan.getConfirmedBy()))
                .confirmedAt(plan.getConfirmedAt())
                .totalWeightKg(totalWeightKg)
                .payloadKg(plan.getVehicle().getPayloadKg())
                .stalls(stalls)
                .unassignedHorses(unassignedHorses)
                .conflicts(conflicts)
                .build();
    }

    /** A route plan with its stops and legs; {@code flightsByLegId} holds the flight of each air leg. */
    public static RoutePlanResponse toRoutePlanResponse(RoutePlan plan, Map<UUID, Flight> flightsByLegId) {
        return RoutePlanResponse.builder()
                .id(plan.getId())
                .jobId(plan.getJob().getId())
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
                .airWaybill(f.getAirWaybill())
                .aircraftType(f.getAircraftType())
                .stallPositions(f.getStallPositions())
                .serviceClass(f.getServiceClass())
                .scheduledDepartureAt(f.getScheduledDepartureAt())
                .scheduledArrivalAt(f.getScheduledArrivalAt())
                .estimatedDepartureAt(f.getEstimatedDepartureAt())
                .estimatedArrivalAt(f.getEstimatedArrivalAt())
                .build();
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

    private static String fullName(User user) {
        return user != null ? user.getFirstName() + " " + user.getLastName() : null;
    }
}
