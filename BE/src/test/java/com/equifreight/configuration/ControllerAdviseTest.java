package com.equifreight.configuration;

import com.equifreight.entity.Horse;
import com.equifreight.exception.ConflictException;
import com.equifreight.model.common.ApiError;
import org.junit.jupiter.api.Test;
import org.springframework.data.core.PropertyPath;
import org.springframework.data.core.PropertyReferenceException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

class ControllerAdviseTest {

    private final ControllerAdvise advice = new ControllerAdvise();

    /** ?sort=foo on a page of horses: Spring Data resolves the sort against the entity and fails. */
    private static PropertyReferenceException unknownSort(String property) {
        return catchThrowableOfType(PropertyReferenceException.class, () -> PropertyPath.from(property, Horse.class));
    }

    @Test
    void anUnknownSortFieldIsTheClientsMistake() {
        ResponseEntity<ApiError> response = advice.handleUnknownSort(unknownSort("foo"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().getError()).isEqualTo("INVALID_SORT");
        assertThat(response.getBody().getMessage()).isEqualTo("These results can't be sorted by foo.");
    }

    @Test
    void theMessageDoesNotNameTheEntity() {
        ResponseEntity<ApiError> response = advice.handleUnknownSort(unknownSort("foo"));

        assertThat(response.getBody().getMessage()).doesNotContain("Horse").doesNotContain("No property");
    }

    /** A 409 can carry every reason it was refused (spec R-07, SUBMISSION_BLOCKED). */
    @Test
    void aConflictsDetailsReachTheApiError() {
        ResponseEntity<ApiError> response = advice.handleConflict(new ConflictException(
                "SUBMISSION_BLOCKED", "This request can't be submitted yet.",
                List.of("Add at least one horse.", "Choose road or air.")));

        assertThat(response.getStatusCode().value()).isEqualTo(409);
        assertThat(response.getBody().getError()).isEqualTo("SUBMISSION_BLOCKED");
        assertThat(response.getBody().getMessage()).isEqualTo("This request can't be submitted yet.");
        assertThat(response.getBody().getDetails()).containsExactly("Add at least one horse.", "Choose road or air.");
    }

    @Test
    void aConflictWithoutDetailsHasNone() {
        ResponseEntity<ApiError> response = advice.handleConflict(new ConflictException("HORSE_ARCHIVED", "Archived."));

        assertThat(response.getBody().getDetails()).isNull();
    }
}
