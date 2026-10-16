package com.equifreight.configuration;

import com.equifreight.exception.ConflictException;
import com.equifreight.model.common.ApiError;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** A 409 can carry every reason it was refused (spec R-07, SUBMISSION_BLOCKED). */
class ControllerAdviseTest {

    @Test
    void aConflictsDetailsReachTheApiError() {
        ResponseEntity<ApiError> response = new ControllerAdvise().handleConflict(new ConflictException(
                "SUBMISSION_BLOCKED", "This request can't be submitted yet.",
                List.of("Add at least one horse.", "Choose road or air.")));

        assertThat(response.getStatusCode().value()).isEqualTo(409);
        assertThat(response.getBody().getError()).isEqualTo("SUBMISSION_BLOCKED");
        assertThat(response.getBody().getMessage()).isEqualTo("This request can't be submitted yet.");
        assertThat(response.getBody().getDetails()).containsExactly("Add at least one horse.", "Choose road or air.");
    }

    @Test
    void aConflictWithoutDetailsHasNone() {
        ResponseEntity<ApiError> response = new ControllerAdvise()
                .handleConflict(new ConflictException("HORSE_ARCHIVED", "Archived."));

        assertThat(response.getBody().getDetails()).isNull();
    }
}
