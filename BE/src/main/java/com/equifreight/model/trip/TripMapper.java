package com.equifreight.model.trip;

import com.equifreight.entity.ChecklistItem;
import com.equifreight.entity.ConditionLog;
import com.equifreight.entity.CrewAssignment;
import com.equifreight.entity.Horse;
import com.equifreight.entity.LoadPlanStall;
import com.equifreight.entity.RouteStop;
import com.equifreight.entity.StoredFile;
import com.equifreight.entity.TransportJob;
import com.equifreight.entity.TripRecord;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.DossierStatus;
import java.util.List;
import java.util.Locale;

public final class TripMapper {

    private TripMapper() {}

    /** The trip screen of a job; {@code vehicleCode} is the confirmed load plan's vehicle, or null. */
    public static TripViewResponse toViewResponse(
            TransportJob job,
            String vehicleCode,
            List<CrewAssignment> crew,
            List<ChecklistItem> documents,
            List<TripStopResponse> stops,
            List<TripHorseResponse> horses,
            List<TripRecordResponse> records) {
        return new TripViewResponse(
                job.getCode(),
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
                crew.stream()
                        .map(assignment -> "%s · %s"
                                .formatted(fullName(assignment.getUser()), assignment.getCrewRole()))
                        .toList(),
                documents.stream().map(TripMapper::toDocumentResponse).toList(),
                stops,
                horses,
                records);
    }

    public static TripDocumentResponse toDocumentResponse(ChecklistItem item) {
        return new TripDocumentResponse(
                item.getId(),
                item.getDocumentType().getName(),
                item.getHorse() == null ? null : item.getHorse().getName(),
                item.getCurrentVersion() == null || item.getCurrentVersion().getFile() == null
                        ? null
                        : item.getCurrentVersion().getFile().getFileName(),
                item.getStatus(),
                item.getValidity());
    }

    /** A stop of the confirmed route plan with the latest record made there, or null. */
    public static TripStopResponse toStopResponse(RouteStop s, TripRecord latest) {
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
                latest == null ? null : fullName(latest.getRecordedBy()));
    }

    /** A horse on the trip; {@code stall} is its place on the confirmed load plan, or null. */
    public static TripHorseResponse toHorseResponse(Horse horse, LoadPlanStall stall) {
        return new TripHorseResponse(
                horse.getId(),
                horse.getName(),
                stall == null
                        ? null
                        : "Stall %d · %s"
                                .formatted(
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
                record.getReceiverName(),
                record.getReceiverSignature(),
                record.getDocumentsShown().stream().map(TripMapper::toDocumentResponse).toList(),
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

    private static String fullName(User user) {
        return user == null ? null : (user.getFirstName() + " " + user.getLastName()).strip();
    }
}
