package com.equifreight.exception;

/**
 * Raised for authentication failures surfaced from inside the application
 * (bad credentials, missing/expired/revoked refresh token). Mapped to HTTP 401
 * by {@code ControllerAdvise} so the client gets an {@code ApiError} body
 * instead of a bare 400/500.
 */
public class UnauthorizedException extends RuntimeException {
    public UnauthorizedException(String message) {
        super(message);
    }
}
