package com.equifreight.model.job;

import com.equifreight.entity.enums.RouteStopKind;
import com.equifreight.entity.enums.ServiceClass;
import com.equifreight.entity.enums.TransportMode;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import lombok.Builder;

/** A new route plan version; missing stop and leg lists are empty, missing sequence numbers 0. */
@Builder
public record CreateRoutePlanRequest(
        Integer distanceKm,
        Integer durationMin,
        String changeReason,
        @Valid List<StopItem> stops,
        @Valid List<LegItem> legs) {

    public CreateRoutePlanRequest {
        stops = stops == null ? List.of() : stops;
        legs = legs == null ? List.of() : legs;
    }

    @Builder
    public record StopItem(
            Short seq,
            @NotNull RouteStopKind kind,
            UUID placeId,
            UUID borderCrossingId,
            Instant plannedAt,
            Short plannedStayMin,
            String details) {

        public StopItem {
            seq = seq == null ? 0 : seq;
        }
    }

    @Builder
    public record LegItem(
            Short seq,
            Short fromStopSeq,
            Short toStopSeq,
            @NotNull TransportMode mode,
            UUID vehicleId,
            Integer distanceKm,
            Integer plannedMin,
            FlightItem flight) {

        public LegItem {
            seq = seq == null ? 0 : seq;
            fromStopSeq = fromStopSeq == null ? 0 : fromStopSeq;
            toStopSeq = toStopSeq == null ? 0 : toStopSeq;
        }
    }

    @Builder
    public record FlightItem(
            String airline,
            String flightNo,
            String airWaybill,
            String aircraftType,
            Short stallPositions,
            ServiceClass serviceClass,
            Instant scheduledDepartureAt,
            Instant scheduledArrivalAt) {}
}
