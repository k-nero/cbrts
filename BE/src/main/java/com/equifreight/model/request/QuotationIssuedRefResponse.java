package com.equifreight.model.request;

import com.equifreight.entity.enums.QuotationStatus;
import java.time.Instant;

/** The request's latest issued quotation, so the club's pages can link to it; null until one is issued. */
public record QuotationIssuedRefResponse(String code, short versionNo, QuotationStatus status, Instant validUntil) {}
