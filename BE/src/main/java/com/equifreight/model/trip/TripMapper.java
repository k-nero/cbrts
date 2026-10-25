package com.equifreight.model.trip;

import com.equifreight.entity.ConditionLog;
import com.equifreight.entity.Horse;
import com.equifreight.entity.LoadPlanStall;
import com.equifreight.entity.RouteStop;
import com.equifreight.entity.StoredFile;
import com.equifreight.entity.TransportJob;
import com.equifreight.entity.TripRecord;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.DossierStatus;
import com.equifreight.entity.enums.TripRecordKind;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

public final class TripMapper {

    /** The kind of a stop only another job on the trip needs, as the customer sees it. */
    public static final String ON_THE_WAY = "ON_THE_WAY";

    private TripMapper() {}

    /** The trip screen of a job; {@code vehicleCode} is the confirmed load plans' vehicles, or null. */
    public static TripViewResponse toViewResponse(
            TransportJob job,
            String tripCode,
            String vehicleCode,
            boolean shared,
            List<TripFlightResponse> flights,
            List<TripStopResponse> stops,
            List<TripHorseResponse> horses,
            List<TripRecordResponse> records,
            Part part,
            HandoverResponse handover) {
        return new TripViewResponse(
                job.getCode(),
                tripCode,
                part.status(),
                job.getDossierStatus() == DossierStatus.CLEARANCE_READY,
                part.plannedDepartureAt(),
                part.plannedArrivalAt(),
                job.getWindowStart(),
                job.getWindowEnd(),
                job.getRequest().getOriginPlace() == null
                        ? null
                        : job.getRequest().getOriginPlace().getName(),
                job.getRequest().getDestinationPlace() == null
                        ? null
                        : job.getRequest().getDestinationPlace().getName(),
                vehicleCode,
                shared,
                flights,
                stops,
                horses,
                records,
                part.parts(),
                handover);
    }

    /**
     * A job planned as a chain of trips (US-F3-16), as its customer follows it: one timeline across {@code legs}, each
     * trip's own customer view in chain order. The stops follow each other, numbered across the journey, without a
     * later trip's pickup at the place the trip before handed the horses on; the records are in the order they
     * happened, and every trip's flights are listed. The job's own status and times stand for the journey, no part is
     * the one shown, and {@code current} (the view of the trip the horses are on) gives the rest.
     */
    public static TripViewResponse toJourneyResponse(
            TransportJob job, TripViewResponse current, List<TripViewResponse> legs) {
        List<TripStopResponse> stops = new ArrayList<>();
        List<TripRecordResponse> records = new ArrayList<>();
        List<TripFlightResponse> flights = new ArrayList<>();
        for (int i = 0; i < legs.size(); i++) {
            TripViewResponse leg = legs.get(i);
            for (TripStopResponse stop : leg.stops()) {
                if (i > 0 && "PICKUP".equals(stop.kind())) continue;
                stops.add(stop.toBuilder().sequence((short) (stops.size() + 1)).build());
            }
            records.addAll(leg.records());
            flights.addAll(leg.flights());
        }
        records.sort(Comparator.comparing(TripRecordResponse::occurredAt));
        return current.toBuilder()
                .tripStatus(job.getTripStatus())
                .plannedDepartureAt(job.getPlannedDepartureAt())
                .plannedArrivalAt(job.getPlannedArrivalAt())
                .shared(legs.stream().anyMatch(TripViewResponse::shared))
                .flights(flights)
                .stops(stops)
                .records(records)
                .parts(current.parts().stream()
                        .map(p -> p.toBuilder().current(false).build())
                        .toList())
                .build();
    }

    /**
     * The part of the job a view shows: its status and planned times on that trip, and every part of a job split
     * across trips (US-F5-06). A job on one trip is its own part.
     */
    public record Part(
            com.equifreight.entity.enums.TripStatus status,
            java.time.Instant plannedDepartureAt,
            java.time.Instant plannedArrivalAt,
            List<TripPartResponse> parts) {

        public static Part of(TransportJob job) {
            return new Part(job.getTripStatus(), job.getPlannedDepartureAt(), job.getPlannedArrivalAt(), List.of());
        }
    }

    /**
     * A stop of the confirmed route plan with the latest record made there, or null; {@code jobCode} names whose
     * pickup or delivery it is on a shared trip.
     */
    public static TripStopResponse toStopResponse(RouteStop s, TripRecord latest, String jobCode) {
        return new TripStopResponse(
                s.getId(),
                s.getSeq(),
                s.getKind().name(),
                jobCode,
                stopName(s),
                s.getPlannedAt(),
                s.getPlannedStayMin(),
                s.getDetails(),
                latest == null ? null : latest.getKind(),
                latest == null ? null : latest.getOccurredAt(),
                latest == null ? null : latest.getText(),
                latest == null ? null : fullName(latest.getRecordedBy()));
    }

    /**
     * Another job's pickup or delivery as that job's customer sees it (US-F3-14): "A stop on the way", with its time
     * and whether the trailer has reached or left it, but not the place, the notes or who handed over what there.
     */
    public static TripStopResponse toStopOnTheWay(RouteStop s, TripRecord latest) {
        TripRecordKind status = latest == null
                ? null
                : switch (latest.getKind()) {
                    case DELIVERED -> TripRecordKind.ARRIVED_AT_STOP;
                    case HANDED_OVER, LOADED -> TripRecordKind.LEFT_STOP;
                    case ARRIVED_AT_STOP, LEFT_STOP, HELD, DEPARTED -> latest.getKind();
                    default -> null;
                };
        return new TripStopResponse(
                s.getId(),
                s.getSeq(),
                ON_THE_WAY,
                null,
                "A stop on the way",
                s.getPlannedAt(),
                s.getPlannedStayMin(),
                null,
                status,
                status == null ? null : latest.getOccurredAt(),
                null,
                null);
    }

    /** A horse on the trip and where it stands; in a convoy the place names the trailer. */
    public static TripHorseResponse toHorseResponse(Horse horse, LoadPlanStall stall, boolean convoy, String jobCode) {
        return new TripHorseResponse(
                horse.getId(),
                horse.getName(),
                stall == null
                        ? null
                        : "%sStall %d · %s"
                                .formatted(
                                        convoy
                                                ? stall.getLoadPlan()
                                                                .getVehicle()
                                                                .getCode() + " · "
                                                : "",
                                        stall.getVehicleStall().getPositionNo(),
                                        stall.getVehicleStall()
                                                .getStallType()
                                                .name()
                                                .toLowerCase(Locale.ROOT)),
                jobCode);
    }

    /** The job's handover as its trip view shows it (US-F6-01); null until the horses are delivered. */
    public static HandoverResponse toHandoverResponse(com.equifreight.entity.Handover h) {
        if (h == null) return null;
        return HandoverResponse.builder()
                .deliveredAt(h.getDeliveredAt())
                .handedOverAt(h.getHandedOverAt())
                .receiverName(h.getReceivingName())
                .receiverConfirmed(h.isReceiverConfirmed())
                .recordId(
                        h.getHandoverRecord() == null
                                ? null
                                : h.getHandoverRecord().getId())
                .confirmDueAt(h.getConfirmDueAt())
                .customerOutcome(h.getCustomerOutcome())
                .confirmedAt(h.getConfirmedAt())
                .confirmedByName(
                        h.getConfirmedBy() == null ? null : h.getConfirmedBy().recordName())
                .lateMinutes(h.getLateMinutes())
                .discrepancy(h.getDiscrepancy())
                .discrepancyIncidentId(
                        h.getDiscrepancyIncident() == null
                                ? null
                                : h.getDiscrepancyIncident().getId())
                .acceptedByDefault(h.isAcceptedByDefault())
                .build();
    }

    public static TripRecordResponse toRecordResponse(TripRecord record) {
        return new TripRecordResponse(
                record.getId(),
                record.getRouteStop() == null ? null : record.getRouteStop().getId(),
                record.getRouteStop() == null ? null : stopName(record.getRouteStop()),
                record.getKind(),
                record.getOccurredAt(),
                record.getReceivedAt(),
                record.getClientRef(),
                fullName(record.getRecordedBy()),
                record.getChannel(),
                record.getText(),
                record.getConditionLogs().stream()
                        .map(TripMapper::toConditionResponse)
                        .toList());
    }

    public static TripConditionResponse toConditionResponse(ConditionLog log) {
        return new TripConditionResponse(
                log.getHorse().getId(),
                log.getHorse().getName(),
                log.getCondition(),
                log.getDrinking(),
                log.getEating(),
                log.getNote(),
                log.getFiles().stream().map(TripMapper::toPhotoResponse).toList());
    }

    public static TripPhotoResponse toPhotoResponse(StoredFile file) {
        return new TripPhotoResponse(
                file.getId(),
                file.getFileName(),
                file.getContentType(),
                "/api/v1/files/" + file.getId() + "/content?inline=true");
    }

    /** A stop's name: its border crossing, else its place, else its kind. */
    public static String stopName(RouteStop stop) {
        return stop.getBorderCrossing() != null
                ? stop.getBorderCrossing().getName()
                : stop.getPlace() == null
                        ? stop.getKind().name()
                        : stop.getPlace().getName();
    }

    /** The record kind in words, as the cab and the tracking page say it (audit lines and notifications). */
    public static String label(TripRecordKind kind) {
        return switch (kind) {
            case LOADED -> "Loaded";
            case DEPARTED -> "Departed";
            case ARRIVED_AT_STOP -> "Arrived at checkpoint";
            case CLEARED_BORDER -> "Customs cleared";
            case HELD -> "On hold";
            case LEFT_STOP -> "Left checkpoint";
            case CONDITION_CHECK -> "Condition check";
            case ACCEPTED_BY_AIRLINE -> "Accepted by airline";
            case FLIGHT_DEPARTED -> "Flight departed";
            case FLIGHT_LANDED -> "Flight landed";
            case RELEASED_BY_AIRLINE -> "Released by airline";
            case DELIVERED -> "Delivered";
            case HANDED_OVER -> "Handed over";
            case NOTE -> "Update";
        };
    }

    private static String fullName(User user) {
        return user == null ? null : (user.getFirstName() + " " + user.getLastName()).strip();
    }
}
