package com.equifreight.model.clearance;

import jakarta.validation.constraints.NotNull;
import lombok.Builder;

/** A country to add: its ISO 3166-1 alpha-2 code ("US") and its name ("United States"). */
@Builder
public record CountryRequest(@NotNull String code, @NotNull String name) {}
