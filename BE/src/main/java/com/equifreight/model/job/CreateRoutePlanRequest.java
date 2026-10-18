package com.equifreight.model.job;

import com.equifreight.entity.enums.RouteStopKind;
import com.equifreight.entity.enums.ServiceClass;
import com.equifreight.entity.enums.TransportMode;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateRoutePlanRequest {

    private Integer distanceKm;
    private Integer durationMin;
    private String changeReason;

    @Valid
    private List<StopItem> stops = new ArrayList<>();

    @Valid
    private List<LegItem> legs = new ArrayList<>();

    @Getter
    @Setter
    public static class StopItem {
        private short seq;

        @NotNull
        private RouteStopKind kind;

        private UUID placeId;
        private UUID borderCrossingId;
        private Instant plannedAt;
        private Short plannedStayMin;
        private String details;
    }

    @Getter
    @Setter
    public static class LegItem {
        private short seq;
        private short fromStopSeq;
        private short toStopSeq;

        @NotNull
        private TransportMode mode;

        private UUID vehicleId;
        private Integer distanceKm;
        private Integer plannedMin;
        private FlightItem flight;
    }

    @Getter
    @Setter
    public static class FlightItem {
        private String airline;
        private String flightNo;
        private String airWaybill;
        private String aircraftType;
        private Short stallPositions;
        private ServiceClass serviceClass;
        private Instant scheduledDepartureAt;
        private Instant scheduledArrivalAt;
    }
}
