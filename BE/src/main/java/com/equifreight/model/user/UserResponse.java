package com.equifreight.model.user;

import com.equifreight.entity.enums.UserStatus;
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
        // "EF-001": the staff code shown under the name; null for customers.
        String staffCode,
        UserStatus status,
        // The last sign-in or token refresh; null until the account has signed in.
        Instant lastActiveAt,
        Instant createdAt,
        Instant updatedAt) {}
