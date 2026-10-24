package com.equifreight.model.job;

import com.equifreight.entity.enums.RouteStopKind;
import com.equifreight.entity.enums.ServiceClass;
import com.equifreight.entity.enums.TransportMode;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
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
            /** The job a PICKUP or DELIVERY stop is for; the job in the URL when left out. */
            UUID jobId,
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
            @Valid FlightItem flight) {

        public LegItem {
            seq = seq == null ? 0 : seq;
            fromStopSeq = fromStopSeq == null ? 0 : fromStopSeq;
            toStopSeq = toStopSeq == null ? 0 : toStopSeq;
        }
    }

    /**
     * The flight of an air leg. {@code stallCapacity} is how many stall positions the airline gives the trip; each job
     * on the trip has its own allocation (US-F3-15). Jobs left out keep what they had, else their quoted positions.
     */
    @Builder
    public record FlightItem(
            String airline,
            String flightNo,
            String aircraftType,
            @Min(1) Short stallCapacity,
            Instant scheduledDepartureAt,
            Instant scheduledArrivalAt,
            @Valid List<AllocationItem> allocations) {

        public FlightItem {
            allocations = allocations == null ? List.of() : allocations;
        }
    }

    /** One job's consignment on the flight: the job in the URL when {@code jobId} is left out. */
    @Builder
    public record AllocationItem(
            UUID jobId,
            @Size(max = 20) String airWaybill,
            @Min(1) Short stallPositions,
            ServiceClass serviceClass) {}
}
