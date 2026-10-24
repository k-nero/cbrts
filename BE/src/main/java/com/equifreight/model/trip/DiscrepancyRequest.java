package com.equifreight.model.trip;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Builder;

/** What went wrong at the handover, in the customer's words (US-F6-02). */
@Builder
public record DiscrepancyRequest(@NotBlank @Size(max = 1000) String description) {}
