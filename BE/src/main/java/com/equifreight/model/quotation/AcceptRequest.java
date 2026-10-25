package com.equifreight.model.quotation;

import lombok.Builder;

/**
 * The customer accepts the quotation (US-F1-06). The body is optional.
 *
 * @param versionNo the version the customer read; when given and no longer the latest issued one, the answer is
 *     refused, so acceptance binds the version the customer saw (US-Q-07)
 */
@Builder
public record AcceptRequest(Integer versionNo) {}
