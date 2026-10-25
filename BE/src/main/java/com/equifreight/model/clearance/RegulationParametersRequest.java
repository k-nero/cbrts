package com.equifreight.model.clearance;

import jakarta.validation.constraints.NotNull;
import lombok.Builder;

/**
 * A draft version's parameters, in days: the cross-border and domestic lead times into the country (BR-F1-01), the
 * quarantine minimum and the arrival buffer. A new catalog's first draft starts from them too.
 */
@Builder
public record RegulationParametersRequest(
        @NotNull Short leadTimeDays,
        @NotNull Short domesticLeadTimeDays,
        @NotNull Short quarantineMinDays,
        @NotNull Short arrivalBufferDays) {}
