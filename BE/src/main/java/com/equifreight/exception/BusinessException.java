package com.equifreight.exception;

import lombok.Getter;

@Getter
public class BusinessException extends RuntimeException {
    private final String code;

    public BusinessException(String message) {
        this(null, message);
    }

    /**
     * When {@code code} is set, {@link com.equifreight.configuration.ControllerAdvise} maps it to ApiError.error.
     */
    public BusinessException(String code, String message) {
        super(message);
        this.code = code;
    }
}
