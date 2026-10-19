package com.equifreight.model.quotation;

import com.equifreight.entity.enums.QuotationStatus;
import com.equifreight.entity.enums.ServiceClass;
import com.equifreight.model.rate.MissingRateResponse;
import java.util.List;
import java.util.UUID;
import lombok.Builder;

/**
 * The Quotation builder (spec §6.3). Lines and totals are as stored; fit, missing rates and the totals' wording are
 * worked out again from the request as it is now, and repriceNeeded says when the two no longer agree.
 */
@Builder
public record QuotationDraftResponse(
        UUID id,
        String code,
        short versionNo,
        QuotationStatus status,
        PinnedVersionResponse pinnedVersion,
        Integer latestPublishedVersionNo,
        QuotationRequestFacts request,
        ServiceClass airClass,
        StallFitResponse fit,
        List<QuoteGroupResponse> groups,
        QuoteTotalsResponse totals,
        List<MissingRateResponse> missing,
        ReadinessResponse readiness,
        Integer validityDays,
        String currency,
        String catalogOwner,
        boolean repriceNeeded,
        List<String> droppedOverrides) {}
