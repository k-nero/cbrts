package com.equifreight.exception;

/**
 * The file store failed or is unreachable. Mapped to HTTP 503 by {@code ControllerAdvise}: the
 * request was fine, so the client can retry later.
 */
public class StorageException extends RuntimeException {
    public StorageException(String message, Throwable cause) {
        super(message, cause);
    }
}
