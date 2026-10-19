package com.equifreight.model.quotation;

import lombok.Builder;

/** The draft quotation, and whether this call started it (201) or found it (200). */
@Builder
public record StartResult(QuotationDraftResponse quotation, boolean created) {}
