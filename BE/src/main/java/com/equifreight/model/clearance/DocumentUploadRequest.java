package com.equifreight.model.clearance;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.UUID;
import lombok.Builder;

/**
 * Request payload to upload a new version of a checklist document.
 * Issued date and validity expiry date are strictly required for validity evaluation (US-F2-03, US-F2-09).
 */
@Builder
public record DocumentUploadRequest(
        @NotNull(message = "File ID is required") UUID fileId,
        @NotNull(message = "Issued date is required") LocalDate issuedOn,
        LocalDate sampledOn,
        @NotNull(message = "Valid until date is required") LocalDate validUntil,
        String issuer) {}
