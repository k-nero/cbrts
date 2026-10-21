package com.equifreight.model.quotation;

import java.util.List;
import lombok.Builder;

/**
 * "Ready" when nothing blocks issuing: every line is priced, the class fits, the request hasn't changed since pricing
 * and the pinned catalog has a validity and a deposit. {@code blockers} names each reason, in that order (US-Q-04).
 */
@Builder
public record ReadinessResponse(boolean ready, int pricedLines, int lineCount, List<String> blockers) {}
