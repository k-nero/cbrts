package com.equifreight.model.fleet;

import com.equifreight.entity.TransportJob;
import com.equifreight.entity.Trip;
import com.equifreight.entity.Vehicle;
import com.equifreight.entity.VehicleBooking;
import com.equifreight.entity.VehicleStall;
import java.util.List;

public final class FleetMapper {

    private FleetMapper() {}

    public static VehicleResponse toResponse(Vehicle vehicle) {
        List<VehicleStallResponse> stalls =
                vehicle.getStalls().stream().map(FleetMapper::toStallResponse).toList();
        return VehicleResponse.builder()
                .id(vehicle.getId())
                .code(vehicle.getCode())
                .kind(vehicle.getKind())
                .payloadKg(vehicle.getPayloadKg())
                .status(vehicle.getStatus())
                .stallCount(stalls.size())
                .stalls(stalls)
                .build();
    }

    public static VehicleStallResponse toStallResponse(VehicleStall stall) {
        short widthIn = (short) stall.getStallType().getWidthIn();
        return VehicleStallResponse.builder()
                .id(stall.getId())
                .positionNo(stall.getPositionNo())
                .stallType(stall.getStallType())
                .rowNo(stall.getRowNo())
                .side(stall.getSide())
                .nearRamp(stall.isNearRamp())
                .widthIn(widthIn)
                .build();
    }

    /** A booking; a trip's booking names the trip and its jobs, with the job's id when it carries one. */
    public static VehicleBookingResponse toBookingResponse(VehicleBooking booking) {
        Trip trip = booking.getTrip();
        List<TransportJob> jobs = trip != null ? trip.getJobs() : List.of();
        return VehicleBookingResponse.builder()
                .id(booking.getId())
                .vehicleId(booking.getVehicle().getId())
                .vehicleCode(booking.getVehicle().getCode())
                .vehicleKind(booking.getVehicle().getKind())
                .tripCode(trip != null ? trip.getCode() : null)
                .jobId(jobs.size() == 1 ? jobs.getFirst().getId() : null)
                .jobCode(
                        jobs.isEmpty()
                                ? null
                                : String.join(
                                        ", ",
                                        jobs.stream().map(TransportJob::getCode).toList()))
                .kind(booking.getKind() != null ? booking.getKind().name() : "JOB")
                .startsAt(booking.getStartsAt())
                .endsAt(booking.getEndsAt())
                .build();
    }
}
