package com.equifreight.model.fleet;

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
        return VehicleStallResponse.builder()
                .id(stall.getId())
                .positionNo(stall.getPositionNo())
                .stallType(stall.getStallType())
                .rowNo(stall.getRowNo())
                .side(stall.getSide())
                .nearRamp(stall.isNearRamp())
                .build();
    }

    public static VehicleBookingResponse toBookingResponse(VehicleBooking booking) {
        return VehicleBookingResponse.builder()
                .id(booking.getId())
                .vehicleId(booking.getVehicle().getId())
                .vehicleCode(booking.getVehicle().getCode())
                .jobId(booking.getJob() != null ? booking.getJob().getId() : null)
                .jobCode(booking.getJob() != null ? booking.getJob().getCode() : null)
                .kind(booking.getKind() != null ? booking.getKind().name() : "JOB")
                .startsAt(booking.getStartsAt())
                .endsAt(booking.getEndsAt())
                .build();
    }
}
