package com.equifreight.service.storage;

import org.springframework.core.io.InputStreamSource;

import java.io.InputStream;

/**
 * Holds the bytes of uploaded files, addressed by {@code files.storage_key}. The metadata (name, type,
 * size, checksum, uploader) stays in Postgres. Keys are written once and never overwritten, so a
 * document version always points at the exact bytes that were reviewed (BR-F2-05).
 *
 * <p>Every method throws {@link com.equifreight.exception.StorageException} when the store fails.
 */
public interface FileStorage extends AutoCloseable {

    /**
     * Stores {@code size} bytes under {@code key}. {@code content} may be opened more than once, so a
     * failed attempt can be retried from the start (a {@code MultipartFile} is an InputStreamSource).
     */
    void put(String key, InputStreamSource content, long size, String contentType);

    /**
     * Opens the bytes stored under {@code key}. The caller closes the stream.
     */
    InputStream open(String key);

    /**
     * Removes {@code key}. Removing a key that doesn't exist is not an error.
     */
    void delete(String key);

    /**
     * Releases connections, if the store holds any. Called when the application shuts down.
     */
    @Override
    default void close() {
    }
}
