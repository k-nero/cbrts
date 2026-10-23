package com.equifreight.model.quotation;

import jakarta.validation.constraints.Size;
import lombok.Builder;

/**
 * The customer declines the quotation (US-F1-06).
 *
 * @param reason why, for the logistics manager; optional
 */
@Builder
public record DeclineRequest(@Size(max = 500) String reason) {}
