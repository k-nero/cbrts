package com.equifreight.configuration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

import com.equifreight.entity.Horse;
import com.equifreight.exception.ConflictException;
import com.equifreight.model.common.ApiError;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.core.PropertyPath;
import org.springframework.data.core.PropertyReferenceException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.web.context.request.async.AsyncRequestTimeoutException;

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
        assertThat(response.getBody().error()).isEqualTo("INVALID_SORT");
        assertThat(response.getBody().message()).isEqualTo("These results can't be sorted by foo.");
    }

    @Test
    void theMessageDoesNotNameTheEntity() {
        ResponseEntity<ApiError> response = advice.handleUnknownSort(unknownSort("foo"));

        assertThat(response.getBody().message()).doesNotContain("Horse").doesNotContain("No property");
    }

    /** A 409 can carry every reason it was refused (spec R-07, SUBMISSION_BLOCKED). */
    @Test
    void aConflictsDetailsReachTheApiError() {
        ResponseEntity<ApiError> response = advice.handleConflict(new ConflictException(
                "SUBMISSION_BLOCKED",
                "This request can't be submitted yet.",
                List.of("Add at least one horse.", "Choose road or air.")));

        assertThat(response.getStatusCode().value()).isEqualTo(409);
        assertThat(response.getBody().error()).isEqualTo("SUBMISSION_BLOCKED");
        assertThat(response.getBody().message()).isEqualTo("This request can't be submitted yet.");
        assertThat(response.getBody().details()).containsExactly("Add at least one horse.", "Choose road or air.");
    }

    @Test
    void aConflictWithoutDetailsHasNone() {
        ResponseEntity<ApiError> response = advice.handleConflict(new ConflictException("HORSE_ARCHIVED", "Archived."));

        assertThat(response.getBody().details()).isNull();
    }

    /** What Hibernate puts in the message of a refused update: the statement, the constraint and the row. */
    private static final String SQL_LEAK = "could not execute statement [ERROR: new row for relation"
            + " \"transport_requests\" violates check constraint \"transport_requests_route_check\""
            + " Detail: Failing row contains (3f2c..., club-7, place-1, place-1, Please hurry).]"
            + " [update transport_requests set note=? where id=?]";

    @Test
    void anUnexpectedErrorAnswersWithAFixedMessage() {
        ResponseEntity<ApiError> response =
                advice.handleGeneric(new IllegalStateException(SQL_LEAK), new MockHttpServletResponse());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(response.getBody().error()).isEqualTo("Internal Server Error");
        assertThat(response.getBody().message())
                .isEqualTo("Something went wrong on our side. Try again, and tell us if it keeps happening.");
        assertThat(response.getBody().details()).isNull();
    }

    @Test
    void aRefusedWriteIsAConflictWithoutTheSql() {
        ResponseEntity<ApiError> response = advice.handleDataIntegrity(new DataIntegrityViolationException(SQL_LEAK));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody().error()).isEqualTo("DATA_CONFLICT");
        assertThat(response.getBody().message())
                .isEqualTo("This change conflicts with existing data. Reload and try again.")
                .doesNotContain("transport_requests")
                .doesNotContain("Failing row");
        assertThat(response.getBody().details()).isNull();
    }

    /** The bell's notification stream: once it is open, a JSON error can't be written onto it. */
    @Test
    void anEventStreamGetsNoErrorBody() {
        MockHttpServletResponse stream = new MockHttpServletResponse();
        stream.setContentType("text/event-stream;charset=UTF-8");

        assertThat(advice.handleGeneric(new IllegalStateException("boom"), stream))
                .isNull();
    }

    @Test
    void aStreamThatTimedOutBeforeItsHeadersIsUnavailable() {
        MockHttpServletResponse response = new MockHttpServletResponse();

        advice.handleAsyncTimeout(new AsyncRequestTimeoutException(), response);

        assertThat(response.getStatus()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE.value());
    }
}
