package com.equifreight.model.file;

import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FileResponse {
    private UUID id;
    private String fileName;
    /**
     * Detected from the file's bytes on upload, not taken from the browser.
     */
    private String contentType;
    private long sizeBytes;
    private String sha256;
    private UUID uploadedById;
    private Instant uploadedAt;
}
