package com.equifreight.exception;

import lombok.Getter;

/**
 * Maps to HTTP 409. Used for state conflicts: a duplicate code, or an action the record's
 * current state forbids. The {@code code} is a stable machine-readable token
 * (e.g. {@code REQUEST_ALREADY_QUOTED}) the FE can branch on.
 */
@Getter
public class ConflictException extends RuntimeException {
    private final String code;

    public ConflictException(String code, String message) {
        super(message);
        this.code = code;
    }
}
