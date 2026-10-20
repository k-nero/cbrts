package com.equifreight.model.auth;

import lombok.Builder;

@Builder
public record RefreshTokenRequest(String refreshToken) {}
