package com.equifreight.model.incident;

import com.equifreight.entity.enums.IncidentKind;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * An emergency reported from the cab (US-F5-01). {@code clientRef} is the tablet's reference, so a resend returns the
 * incident already opened; {@code occurredAt} is the tablet's time, kept beside the server's.
 */
public record RaiseIncidentRequest(
        @NotNull IncidentKind kind,
        @NotBlank @Size(max = 200) String location,
        @NotBlank @Size(max = 500) String description,
        /** The horse it concerns; required for a horse medical incident. */
        UUID horseId,
        @Size(max = 8) List<UUID> photoFileIds,
        @NotNull UUID clientRef,
        Instant occurredAt) {

    public RaiseIncidentRequest {
        photoFileIds = photoFileIds == null ? List.of() : List.copyOf(photoFileIds);
    }
}
