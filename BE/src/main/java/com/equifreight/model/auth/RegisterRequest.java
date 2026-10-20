package com.equifreight.model.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Builder;

/**
 * Create a club account: the club, the person who signs in for it, and their password.
 */
@Builder(toBuilder = true)
public record RegisterRequest(
        @NotBlank @Size(max = 160) String clubName,
        /*
         * ISO 3166-1 alpha-2, one of the countries EquiFreight serves.
         */
        @NotBlank @Pattern(regexp = "[A-Z]{2}") String countryCode,
        @NotBlank @Size(max = 255) String firstName,
        @NotBlank @Size(max = 255) String lastName,
        @NotBlank @Email @Size(max = 255) String email,
        @Size(max = 20) String phone,

        @NotBlank @Size(min = 12, max = 128, message = "At least 12 characters.")
        String password) {}
