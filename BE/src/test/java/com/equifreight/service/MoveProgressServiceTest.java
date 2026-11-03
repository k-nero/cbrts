package com.equifreight.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.equifreight.entity.Handover;
import com.equifreight.entity.TransportJob;
import com.equifreight.entity.enums.DossierStatus;
import com.equifreight.entity.enums.HandoverOutcome;
import com.equifreight.entity.enums.JobStage;
import com.equifreight.entity.enums.TripStatus;
import java.time.Instant;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** An approved request's move, as the club's requests list says it: the request itself stays Approved. */
class MoveProgressServiceTest {

    private static TransportJob job(JobStage stage, TripStatus trip) {
        TransportJob j = new TransportJob();
        j.setStage(stage);
        j.setTripStatus(trip);
        return j;
    }

    private static Handover handover(Instant handedOverAt, HandoverOutcome answer) {
        Handover h = new Handover();
        h.setHandedOverAt(handedOverAt);
        h.setCustomerOutcome(answer);
        return h;
    }

    @Test
    @DisplayName("documents, then cleared, then on the road")
    void beforeDelivery() {
        assertThat(MoveProgressService.of(job(JobStage.DOCUMENTS, TripStatus.NOT_STARTED), null)
                        .label())
                .isEqualTo("Documents");
        TransportJob cleared = job(JobStage.CLEARANCE, TripStatus.NOT_STARTED);
        cleared.setDossierStatus(DossierStatus.CLEARANCE_READY);
        assertThat(MoveProgressService.of(cleared, null).label()).isEqualTo("Cleared to depart");
        assertThat(MoveProgressService.of(job(JobStage.TRIP, TripStatus.DEPARTED), null))
                .satisfies(m -> {
                    assertThat(m.label()).isEqualTo("In transit");
                    assertThat(m.tracking()).isTrue();
                });
    }

    @Test
    @DisplayName("a recorded handover waits on the club; an accepted one completes the move")
    void handover() {
        TransportJob j = job(JobStage.HANDOVER, TripStatus.DELIVERED);
        assertThat(MoveProgressService.of(j, handover(Instant.EPOCH, null)).label())
                .isEqualTo("Confirm handover");
        assertThat(MoveProgressService.of(j, handover(Instant.EPOCH, HandoverOutcome.CONFIRMED_SOUND))
                        .label())
                .isEqualTo("Completed");
        assertThat(MoveProgressService.of(j, handover(Instant.EPOCH, HandoverOutcome.PROBLEM_REPORTED))
                        .tone())
                .isEqualTo("warn");
    }
}
