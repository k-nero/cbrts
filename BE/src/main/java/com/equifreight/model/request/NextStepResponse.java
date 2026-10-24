package com.equifreight.model.request;

import java.time.LocalDate;
import lombok.Builder;

/**
 * What happens next on a request, and who does it (US-F1-08): "Accept or decline quotation Q-2026-0004 v1", owned by
 * the customer, by 24 Oct 2026; or "Prepare your itemised quotation", owned by the logistics manager.
 */
@Builder
public record NextStepResponse(
        String action,
        /** "You", "Vũ Hải Yến, logistics manager", or "A logistics manager" before one has picked it up. */
        String owner,
        /** True when the customer owes this step. */
        boolean yours,
        /** The day it is due by, in the business time zone; null when the step has no deadline. */
        LocalDate due) {}
