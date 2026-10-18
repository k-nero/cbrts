package com.equifreight.model.clearance;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.UUID;
import lombok.*;

/**
 * Request payload to upload a new version of a checklist document.
 * Issued date and validity expiry date are strictly required for validity evaluation (US-F2-03, US-F2-09).
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DocumentUploadRequest {

    @NotNull(message = "File ID is required")
    private UUID fileId;

    @NotNull(message = "Issued date is required")
    private LocalDate issuedOn;

    private LocalDate sampledOn;

    @NotNull(message = "Valid until date is required")
    private LocalDate validUntil;

    private String issuer;
}
