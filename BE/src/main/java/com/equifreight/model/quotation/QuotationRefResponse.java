package com.equifreight.model.quotation;

import com.equifreight.entity.enums.QuotationStatus;
import lombok.Builder;

/** The request review's pointer to its quotation, so the decision panel can open it. */
@Builder
public record QuotationRefResponse(String code, short versionNo, QuotationStatus status) {}
