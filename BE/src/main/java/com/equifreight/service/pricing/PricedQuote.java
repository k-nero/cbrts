package com.equifreight.service.pricing;

import java.util.List;

/** The engine's answer: the lines, what is missing, the stall fit (null for road) and the totals. */
public record PricedQuote(List<PricedLine> lines, List<MissingRate> missing, StallFit fit, PricedTotals totals) {}
