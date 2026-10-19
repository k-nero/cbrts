package com.equifreight.model.auth;

import lombok.Builder;

@Builder
public record TokenResponse(String accessToken, String refreshToken) {}
