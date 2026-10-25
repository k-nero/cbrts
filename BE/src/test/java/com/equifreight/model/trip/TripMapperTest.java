package com.equifreight.model.trip;

import static org.assertj.core.api.Assertions.assertThat;

import com.equifreight.entity.TransportJob;
import com.equifreight.entity.enums.TransportMode;
import com.equifreight.entity.enums.TripRecordKind;
import com.equifreight.entity.enums.TripStatus;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/** US-F3-16 (#206): the customer follows a journey of several trips on one timeline. */
class TripMapperTest {

    private static TripStopResponse stop(int seq, String kind, String name) {
        return TripStopResponse.builder()
                .id(UUID.randomUUID())
                .sequence((short) seq)
                .kind(kind)
                .name(name)
                .build();
    }

    private static TripRecordResponse record(TripRecordKind kind, String at) {
        return TripRecordResponse.builder()
                .id(UUID.randomUUID())
                .kind(kind)
                .occurredAt(Instant.parse(at))
                .build();
    }

    private static TripPartResponse part(TransportMode mode, boolean current) {
        return TripPartResponse.builder()
                .tripId(UUID.randomUUID())
                .status(TripStatus.NOT_STARTED)
                .horses(List.of("Nightfall"))
                .leftInCare(List.of())
                .current(current)
                .mode(mode)
                .build();
    }

    private static TripViewResponse leg(
            List<TripStopResponse> stops, List<TripRecordResponse> records, List<TripPartResponse> parts) {
        return TripViewResponse.builder()
                .jobCode("CBRT-2026-041")
                .tripStatus(TripStatus.NOT_STARTED)
                .flights(List.of())
                .stops(stops)
                .horses(List.of())
                .records(records)
                .parts(parts)
                .build();
    }

    @Test
    void aJourneyIsOneTimelineAcrossItsTripsInChainOrder() {
        TransportJob job = new TransportJob();
        job.setCode("CBRT-2026-041");
        job.setTripStatus(TripStatus.DEPARTED);
        job.setPlannedDepartureAt(Instant.parse("2026-11-20T00:00:00Z"));
        job.setPlannedArrivalAt(Instant.parse("2026-11-21T16:00:00Z"));
        List<TripPartResponse> parts = List.of(part(TransportMode.ROAD, false), part(TransportMode.AIR, true));
        TripViewResponse road = leg(
                List.of(stop(1, "PICKUP", "Phú Thọ training centre"), stop(2, "TRANSFER", "PNH airport")),
                List.of(record(TripRecordKind.DEPARTED, "2026-11-20T00:05:00Z")),
                parts);
        TripViewResponse air = leg(
                List.of(stop(1, "PICKUP", "PNH airport"), stop(2, "DELIVERY", "Sha Tin stables")),
                List.of(record(TripRecordKind.FLIGHT_DEPARTED, "2026-11-20T10:00:00Z")),
                parts);

        TripViewResponse journey = TripMapper.toJourneyResponse(job, air, List.of(road, air));

        // The flight's pickup at the airport is where the road trip handed the horses on: listed once.
        assertThat(journey.stops())
                .extracting(s -> s.sequence() + " " + s.kind() + " " + s.name())
                .containsExactly(
                        "1 PICKUP Phú Thọ training centre", "2 TRANSFER PNH airport", "3 DELIVERY Sha Tin stables");
        assertThat(journey.records())
                .extracting(TripRecordResponse::kind)
                .containsExactly(TripRecordKind.DEPARTED, TripRecordKind.FLIGHT_DEPARTED);
        assertThat(journey.tripStatus()).isEqualTo(TripStatus.DEPARTED);
        assertThat(journey.plannedDepartureAt()).isEqualTo(job.getPlannedDepartureAt());
        assertThat(journey.plannedArrivalAt()).isEqualTo(job.getPlannedArrivalAt());
        assertThat(journey.parts()).hasSize(2).noneMatch(TripPartResponse::current);
        assertThat(journey.tripCode()).isNull();
    }
}
