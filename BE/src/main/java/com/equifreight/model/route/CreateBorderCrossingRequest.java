package com.equifreight.model.route;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.UUID;
import lombok.Builder;

/** A new border crossing between two countries we serve; a road corridor can then take it. */
@Builder
public record CreateBorderCrossingRequest(
        @NotBlank @Size(max = 120) String name,
        @NotNull UUID fromCountryId,
        @NotNull UUID toCountryId,
        Boolean roadOnly) {

    public CreateBorderCrossingRequest {
        roadOnly = roadOnly != null && roadOnly;
    }
}
