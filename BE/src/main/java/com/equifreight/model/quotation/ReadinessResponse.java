package com.equifreight.model.quotation;

import lombok.Builder;

/** "Ready" when every line is priced, the class fits and the request hasn't changed since pricing. */
@Builder
public record ReadinessResponse(boolean ready, int pricedLines, int lineCount) {}
