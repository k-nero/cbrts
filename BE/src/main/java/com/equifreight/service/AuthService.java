package com.equifreight.service;

import com.equifreight.entity.RefreshToken;
import com.equifreight.entity.Role;
import com.equifreight.entity.User;
import com.equifreight.exception.UnauthorizedException;
import com.equifreight.model.auth.LoginRequest;
import com.equifreight.model.auth.TokenResponse;
import com.equifreight.repository.RefreshTokenRepository;
import com.equifreight.repository.UserRepository;
import com.equifreight.configuration.JwtConfiguration;
import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@Log4j2
public class AuthService {
    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtEncoder jwtEncoder;

    AuthService(UserRepository userRepository,
            RefreshTokenRepository refreshTokenRepository,
            PasswordEncoder passwordEncoder,
            JwtEncoder jwtEncoder) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtEncoder = jwtEncoder;
    }

    @Value("${jwt.expirationMs}")
    private long jwtExpirationMs;

    @Value("${refreshToken.expirationSeconds}")
    private int refreshTokenExpirationSeconds;

    @Transactional
    public TokenResponse login(LoginRequest request, String ipAddress) {
        User user = userRepository.getByEmail(request.getEmail());
        // One message for an unknown email and a wrong password, so sign-in never reveals
        // whether an address has an account.
        if (user == null || !passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            log.info("Sign-in failed for {} from {}", request.getEmail(), ipAddress);
            throw new UnauthorizedException("Email or password doesn't match.");
        }
        return new TokenResponse(generateAccessToken(user), createRefreshToken(user).getToken());
    }

    @Transactional
    public TokenResponse refreshToken(String token) {
        RefreshToken refreshToken = refreshTokenRepository.findByToken(token)
                .orElseThrow(() -> new UnauthorizedException("Refresh token is not found."));

        if (refreshToken.isRevoked() || refreshToken.getExpiryDate().isBefore(Instant.now())) {
            refreshTokenRepository.delete(refreshToken);
            throw new UnauthorizedException("Refresh token is invalid or expired.");
        }

        // Rotation: a refresh token is good for one use.
        User user = refreshToken.getUser();
        refreshTokenRepository.delete(refreshToken);
        return new TokenResponse(generateAccessToken(user), createRefreshToken(user).getToken());
    }

    /**
     * Server-side sign-out: revokes every refresh token of the presented token's owner, so the
     * session can't be refreshed back to life. Idempotent: an unknown token is a no-op.
     */
    @Transactional
    public void logout(String token) {
        if (token == null || token.isBlank()) {
            return;
        }
        refreshTokenRepository.findByToken(token)
                .ifPresent(refreshToken -> refreshTokenRepository.deleteByUser(refreshToken.getUser()));
    }

    private String generateAccessToken(User user) {
        List<String> roles = user.getRoles().stream().map(Role::getName).toList();
        Instant now = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .subject(user.getEmail())
                .claim("roles", roles)
                .claim("uid", user.getId().toString())
                .issuedAt(now)
                .expiresAt(now.plusMillis(jwtExpirationMs))
                .build();
        JwsHeader header = JwsHeader.with(JwtConfiguration.ALGORITHM).build();
        return jwtEncoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
    }

    private RefreshToken createRefreshToken(User user) {
        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setUser(user);
        refreshToken.setExpiryDate(Instant.now().plusSeconds(refreshTokenExpirationSeconds));
        refreshToken.setToken(UUID.randomUUID().toString());
        refreshToken.setRevoked(false);
        return refreshTokenRepository.save(refreshToken);
    }
}
