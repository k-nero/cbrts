package com.equifreight.model.quotation;

import java.math.BigDecimal;
import java.util.Map;

/**
 * The version a revision replaces, for "Changed since": its total, and each line's amount by line key.
 */
public record PreviousVersionResponse(short versionNo, BigDecimal total, Map<String, BigDecimal> amountsByKey) {}
