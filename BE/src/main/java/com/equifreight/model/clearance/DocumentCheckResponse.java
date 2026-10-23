package com.equifreight.model.clearance;

import com.equifreight.entity.enums.Validity;
import java.time.LocalDate;

/**
 * US-F2-03: what the automatic check says about a document's dates. RED is refused and its file is never uploaded;
 * AMBER is kept but won't clear; GREEN goes to the transport specialist.
 *
 * <p>US-F2-09: {@code rule}, {@code found} and {@code required} name the rule, the value on the document and the value
 * that passes; {@code renewBy} is the date an AMBER document's replacement is needed by. They are null when no date
 * rule applies.
 */
public record DocumentCheckResponse(
        Validity validity, String note, String rule, String found, String required, LocalDate renewBy) {}
