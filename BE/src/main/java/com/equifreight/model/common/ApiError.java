package com.equifreight.model.common;

import java.time.Instant;
import java.util.List;
import lombok.Builder;

@Builder
public record ApiError(Instant timestamp, int status, String error, String message, List<String> details) {
    public static ApiError of(int status, String error, String message) {
        return new ApiError(Instant.now(), status, error, message, null);
    }

    public static ApiError of(int status, String error, String message, List<String> details) {
        return new ApiError(Instant.now(), status, error, message, details);
    }
}
