package com.equifreight.model.user;

import jakarta.validation.constraints.NotBlank;
import java.util.Set;
import lombok.Builder;

@Builder
public record UpdateUserRequest(
        @NotBlank String firstName, @NotBlank String lastName, String phone, Set<String> roles) {}
