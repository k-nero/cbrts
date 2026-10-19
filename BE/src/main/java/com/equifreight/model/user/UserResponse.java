package com.equifreight.model.user;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import lombok.Builder;

@Builder(toBuilder = true)
public record UserResponse(
        UUID id,
        String email,
        String firstName,
        String lastName,
        String phone,
        List<String> roles,
        /**
         * The customer's club name on /me; null for staff and on the admin user list.
         */
        String clubName,
        Instant createdAt,
        Instant updatedAt) {}
