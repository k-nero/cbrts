package com.equifreight.model.user;

import com.equifreight.entity.Role;
import com.equifreight.entity.User;

import java.util.List;

public final class UserMapper {
    private UserMapper() {}

    public static UserResponse toResponse(User user) {
        List<String> roles = user.getRoles() == null
                ? List.of()
                : user.getRoles().stream().map(Role::getName).sorted().toList();
        return UserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .phone(user.getPhone())
                .roles(roles)
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }
}
