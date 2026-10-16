package com.equifreight.exception;

import lombok.Getter;

import java.util.List;

/**
 * Maps to HTTP 409. Used for state conflicts: a duplicate code, or an action the record's
 * current state forbids. The {@code code} is a stable machine-readable token
 * (e.g. {@code REQUEST_ALREADY_QUOTED}) the FE can branch on. {@code details} lists every reason
 * when there is more than one (e.g. each blocker of {@code SUBMISSION_BLOCKED}); null otherwise.
 */
@Getter
public class ConflictException extends RuntimeException {
    private final String code;
    private final List<String> details;

    public ConflictException(String code, String message) {
        this(code, message, null);
    }

    public ConflictException(String code, String message, List<String> details) {
        super(message);
        this.code = code;
        this.details = details;
    }
}
