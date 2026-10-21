package com.equifreight.model.rate;

import lombok.Builder;

/** A rate the catalog cannot supply; group is null when it is not a ledger line. */
@Builder
public record MissingRateResponse(String group, String description, String why) {}
