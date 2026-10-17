package com.equifreight.service;

import com.equifreight.entity.RequestRevision;
import com.equifreight.entity.TransportRequest;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static com.equifreight.service.RequestServiceTest.revision;
import static org.assertj.core.api.Assertions.assertThat;

/** Which version each return for information belongs to (US-F1-04). */
class RevisionDatesTest {

    static final Instant R1 = Instant.parse("2026-09-28T02:41:00Z");
    static final Instant R2 = Instant.parse("2026-10-02T03:00:00Z");
    final TransportRequest request = new TransportRequest();

    @Test
    void theKthReturnBelongsToTheKthVersionWithANote() {
        List<RequestRevision> versions = List.of(revision(request, 1, "Which stable?"),
                revision(request, 2, "Which date?"), revision(request, 3, null));

        assertThat(RevisionDates.returnedAt(versions, List.of(R1, R2)))
                .isEqualTo(Map.of((short) 1, R1, (short) 2, R2));
    }

    @Test
    void aNoteWithoutItsReturnRowHasNoDate() {
        assertThat(RevisionDates.returnedAt(List.of(revision(request, 1, "Which stable?")), List.of())).isEmpty();
    }

    @Test
    void aVersionNeverReturnedHasNoDate() {
        assertThat(RevisionDates.returnedAt(List.of(revision(request, 1, null)), List.of(R1))).isEmpty();
    }
}
