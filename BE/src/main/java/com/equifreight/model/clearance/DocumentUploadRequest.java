package com.equifreight.model.clearance;

import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DocumentUploadRequest {

    @NotNull(message = "File ID is required")
    private UUID fileId;

    private LocalDate issuedOn;

    private LocalDate sampledOn;

    private LocalDate validUntil;

    private String issuer;
}
