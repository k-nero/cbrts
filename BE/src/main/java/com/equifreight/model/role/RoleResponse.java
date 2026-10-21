package com.equifreight.model.role;

import java.time.Instant;
import java.util.UUID;
import lombok.Builder;

@Builder
public record RoleResponse(UUID id, String name, String description, Instant createdAt, Instant updatedAt) {}
