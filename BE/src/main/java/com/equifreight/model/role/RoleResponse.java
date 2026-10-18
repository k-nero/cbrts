package com.equifreight.model.role;

import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoleResponse {
    private UUID id;
    private String name;
    private String description;
    private Instant createdAt;
    private Instant updatedAt;
}
