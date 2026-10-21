package com.equifreight.model.estimate;

import com.equifreight.service.pricing.EstimateStatus;
import java.math.BigDecimal;
import java.util.List;
import lombok.Builder;

/**
 * The customer's indicative range (US-Q-05): {@code low}/{@code high} only when READY, otherwise {@code message}
 * says why. Never a quotation and never acceptable (BR-Q-10).
 */
@Builder
public record EstimateResponse(
        EstimateStatus status,
        BigDecimal low,
        BigDecimal high,
        String message,
        List<String> assumptions,
        Integer versionNo,
        EstimateOptionsResponse options) {}
