package com.equifreight.model.incident;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Builder;

/** The logistics manager closes an incident (US-F5-05): how it ended, and a closing note for the record. */
@Builder
public record ResolveIncidentRequest(
        @NotBlank @Size(max = 300) String resolution,
        @NotBlank @Size(max = 1000) String closingNote) {}
