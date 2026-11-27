package com.equifreight.model.quotation;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * The logistics manager's answer to a counter-offer that leaves the version as it is.
 *
 * @param message what the club reads, quoted, beside the version it can still accept or decline
 */
public record BestPriceRequest(@NotBlank @Size(max = 500) String message) {}
