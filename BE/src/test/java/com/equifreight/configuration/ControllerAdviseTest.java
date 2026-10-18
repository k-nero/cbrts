package com.equifreight.configuration;

import com.equifreight.entity.Horse;
import com.equifreight.model.common.ApiError;
import org.junit.jupiter.api.Test;
import org.springframework.data.core.PropertyPath;
import org.springframework.data.core.PropertyReferenceException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

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
}
