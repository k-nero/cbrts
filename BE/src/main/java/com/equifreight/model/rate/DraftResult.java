package com.equifreight.model.rate;

import lombok.Builder;

/** The draft version, and whether this call created it (201) or found it (200). */
@Builder
public record DraftResult(RateVersionResponse version, boolean created) {}
