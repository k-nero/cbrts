package com.equifreight.model.quotation;

import jakarta.validation.constraints.Size;
import lombok.Builder;

/**
 * The customer declines the quotation (US-F1-06).
 *
 * @param reason why, for the logistics manager; optional
 * @param versionNo the version the customer read; when given and no longer the latest issued one, the answer is
 *     refused (US-Q-07). Optional, so callers that don't send it yet behave as before
 */
@Builder
public record DeclineRequest(@Size(max = 500) String reason, Integer versionNo) {}
