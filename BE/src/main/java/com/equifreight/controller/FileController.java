package com.equifreight.controller;

import com.equifreight.entity.StoredFile;
import com.equifreight.entity.User;
import com.equifreight.model.file.FileResponse;
import com.equifreight.service.FileService;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.UUID;

/**
 * Upload a file, then attach it by id to the record it belongs to. Any signed-in user may upload;
 * who may read a file is decided in {@link FileService}. The bucket is never exposed: downloads
 * stream through here after the access check.
 */
@RestController
@RequestMapping("/api/v1/files")
public class FileController {

    private final FileService fileService;

    public FileController(FileService fileService) {
        this.fileService = fileService;
    }

    /**
     * PDF, JPEG, PNG or HEIC, at most 25 MB, sent as the multipart part {@code file}.
     */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public FileResponse upload(@RequestPart("file") MultipartFile file, @AuthenticationPrincipal User user) {
        return fileService.upload(file, user);
    }

    @GetMapping("/{id}")
    public FileResponse get(@PathVariable UUID id, @AuthenticationPrincipal User user) {
        return fileService.get(id, user);
    }

    /**
     * The file's bytes. {@code inline=true} lets the browser show a PDF or photo instead of saving it.
     */
    @GetMapping("/{id}/content")
    public ResponseEntity<InputStreamResource> content(
            @PathVariable UUID id,
            @RequestParam(value = "inline", defaultValue = "false") boolean inline,
            @AuthenticationPrincipal User user) {
        FileService.FileContent content = fileService.open(id, user);
        StoredFile file = content.file();
        ContentDisposition disposition = (inline ? ContentDisposition.inline() : ContentDisposition.attachment())
                .filename(file.getFileName(), StandardCharsets.UTF_8)
                .build();
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(file.getContentType()))
                .contentLength(file.getSizeBytes())
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                // Only the detected type counts; never let the browser guess a different one.
                .header("X-Content-Type-Options", "nosniff")
                .header(HttpHeaders.CACHE_CONTROL, "private, no-store")
                .body(new InputStreamResource(content.content()));
    }
}
