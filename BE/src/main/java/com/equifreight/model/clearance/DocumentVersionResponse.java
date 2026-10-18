package com.equifreight.model.clearance;

import com.equifreight.entity.enums.DocumentReview;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentVersionResponse {
    private UUID id;
    private UUID checklistItemId;
    private short versionNo;

    // File info
    private UUID fileId;
    private String fileName;
    private String contentType;
    private long sizeBytes;

    // Document validity fields
    private LocalDate issuedOn;
    private LocalDate sampledOn;
    private LocalDate validUntil;
    private String issuer;

    // Uploader info
    private UUID uploadedById;
    private String uploadedByName;
    private Instant uploadedAt;

    // Review info
    private DocumentReview review;
    private UUID reviewedById;
    private String reviewedByName;
    private Instant reviewedAt;
    private String rejectReason;
}
