package com.equifreight.model.file;

import java.time.Instant;
import java.util.UUID;
import lombok.Builder;

@Builder
public record FileResponse(
        UUID id,
        String fileName,
        /**
         * Detected from the file's bytes on upload, not taken from the browser.
         */
        String contentType,
        long sizeBytes,
        String sha256,
        UUID uploadedById,
        Instant uploadedAt) {}
