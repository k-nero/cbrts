package com.equifreight.model.incident;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import lombok.Builder;

/**
 * The logistics manager closes an incident (US-F5-05): how it ended, and a closing note for the record. It may
 * compensate the customer (US-F5-07), credited on the job's final invoice.
 */
@Builder
public record ResolveIncidentRequest(
        @NotBlank @Size(max = 300) String resolution,
        @NotBlank @Size(max = 1000) String closingNote,
        /** Null for no compensation. */
        @Valid Compensation compensation) {

    public ResolveIncidentRequest(String resolution, String closingNote) {
        this(resolution, closingNote, null);
    }

    /** What EquiFreight gives back, in the job's quotation currency, and why, as the customer reads it. */
    public record Compensation(
            @NotNull @DecimalMin(value = "0", inclusive = false) @Digits(integer = 12, fraction = 2)
            BigDecimal amount,

            @NotBlank @Size(max = 300) String reason) {}
}
