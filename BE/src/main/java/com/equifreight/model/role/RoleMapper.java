package com.equifreight.model.role;

import com.equifreight.entity.Role;

public final class RoleMapper {
    private RoleMapper() {
    }

    public static RoleResponse toResponse(Role role) {
        return RoleResponse.builder()
                .id(role.getId())
                .name(role.getName())
                .description(role.getDescription())
                .createdAt(role.getCreatedAt())
                .updatedAt(role.getUpdatedAt())
                .build();
    }
}
