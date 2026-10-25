package com.equifreight.model.quotation;

import jakarta.validation.constraints.Size;
import lombok.Builder;

/**
 * The customer asks for a re-quote of an expired quotation (core flows A4). The body is optional.
 *
 * @param versionNo the version the customer read; when given and no longer the latest issued one, the ask is refused
 * @param note what should change, for the logistics manager; optional
 */
@Builder
public record RequoteRequest(
        Integer versionNo, @Size(max = 500) String note) {}
