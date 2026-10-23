package com.equifreight.model.clearance;

import com.equifreight.entity.enums.Validity;

/**
 * US-F2-03: what the automatic check says about a document's dates. RED is refused and its file is never uploaded;
 * AMBER is kept but won't clear; GREEN goes to the transport specialist.
 */
public record DocumentCheckResponse(Validity validity, String note) {}
