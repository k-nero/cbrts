package com.equifreight.model.trip;

import com.equifreight.entity.ChecklistItem;
import com.equifreight.entity.ConditionLog;
import com.equifreight.entity.Horse;
import com.equifreight.entity.LoadPlanStall;
import com.equifreight.entity.RouteStop;
import com.equifreight.entity.StoredFile;
import com.equifreight.entity.TransportJob;
import com.equifreight.entity.TripRecord;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.ChecklistStatus;
import com.equifreight.entity.enums.DossierStatus;
import com.equifreight.entity.enums.TripRecordKind;
import com.equifreight.entity.enums.Validity;
import java.util.List;
import java.util.Locale;

public final class TripMapper {

    private TripMapper() {}

    /** The trip screen of a job; {@code vehicleCode} is the confirmed load plan's vehicle, or null. */
    public static TripViewResponse toViewResponse(
            TransportJob job,
            String tripCode,
            String vehicleCode,
            List<TripStopResponse> stops,
            List<TripHorseResponse> horses,
            List<TripRecordResponse> records) {
        return new TripViewResponse(
                job.getCode(),
                tripCode,
                job.getTripStatus(),
                job.getDossierStatus() == DossierStatus.CLEARANCE_READY,
                job.getPlannedDepartureAt(),
                job.getPlannedArrivalAt(),
                job.getWindowStart(),
                job.getWindowEnd(),
                job.getRequest().getOriginPlace() == null
                        ? null
                        : job.getRequest().getOriginPlace().getName(),
                job.getRequest().getDestinationPlace() == null
                        ? null
                        : job.getRequest().getDestinationPlace().getName(),
                vehicleCode,
                stops,
                horses,
                records);
    }

    /** A stop of the confirmed route plan with the latest record made there, or null. */
    public static TripStopResponse toStopResponse(RouteStop s, TripRecord latest, List<ChecklistItem> borderDocuments) {
        return new TripStopResponse(
                s.getId(),
                s.getSeq(),
                s.getKind().name(),
                stopName(s),
                s.getPlannedAt(),
                s.getPlannedStayMin(),
                s.getDetails(),
                latest == null ? null : latest.getKind(),
                latest == null ? null : latest.getOccurredAt(),
                latest == null ? null : latest.getText(),
                latest == null ? null : fullName(latest.getRecordedBy()),
                borderDocuments.stream()
                        .map(TripMapper::toBorderDocumentResponse)
                        .toList());
    }

    public static TripBorderDocumentResponse toBorderDocumentResponse(ChecklistItem item) {
        String horse = item.getHorse() == null ? null : item.getHorse().getName();
        String label = item.getDocumentType().getName() + (horse == null ? "" : " · " + horse);
        return new TripBorderDocumentResponse(
                item.getId(),
                label,
                item.getStatus(),
                item.getValidity(),
                item.getStatus() == ChecklistStatus.CLEARED && item.getValidity() == Validity.GREEN);
    }

    /** A horse on the trip; {@code stall} is its place on the confirmed load plan, or null. */
    /** A horse on the trip and where it stands; in a convoy the place names the trailer. */
    public static TripHorseResponse toHorseResponse(Horse horse, LoadPlanStall stall, boolean convoy) {
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
                                                .toLowerCase(Locale.ROOT)));
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
                        .toList(),
                record.getDocumentsShown() == null
                        ? List.of()
                        : record.getDocumentsShown().stream()
                                .map(d -> d.getChecklistItem().getId())
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
