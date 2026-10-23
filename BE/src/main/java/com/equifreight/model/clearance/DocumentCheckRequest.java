package com.equifreight.model.clearance;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import lombok.Builder;

/**
 * US-F2-03: the dates of a document the customer is about to upload, checked before its file is sent. The same
 * dates go on the version once the file is attached.
 */
@Builder
public record DocumentCheckRequest(
        @NotNull(message = "Issued date is required") LocalDate issuedOn,
        LocalDate sampledOn,
        @NotNull(message = "Valid until date is required") LocalDate validUntil) {}
