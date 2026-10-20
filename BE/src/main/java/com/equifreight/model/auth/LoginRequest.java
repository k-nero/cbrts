package com.equifreight.model.auth;

import lombok.Builder;

@Builder
public record LoginRequest(String email, String password) {}
