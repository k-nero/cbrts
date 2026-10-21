package com.equifreight.model.file;

import com.equifreight.entity.StoredFile;

public final class FileMapper {
    private FileMapper() {}

    public static FileResponse toResponse(StoredFile file) {
        return FileResponse.builder()
                .id(file.getId())
                .fileName(file.getFileName())
                .contentType(file.getContentType())
                .sizeBytes(file.getSizeBytes())
                .sha256(file.getSha256())
                .uploadedById(
                        file.getUploadedBy() != null ? file.getUploadedBy().getId() : null)
                .uploadedAt(file.getCreatedAt())
                .build();
    }
}
