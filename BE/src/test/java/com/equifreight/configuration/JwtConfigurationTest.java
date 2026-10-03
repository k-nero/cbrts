package com.equifreight.configuration;

import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwtException;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class JwtConfigurationTest {

    private static final String SECRET = "test-secret-that-is-at-least-32-bytes-long";

    private static String token(String secret, long ttlSeconds) {
        Instant now = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .subject("yen.vu@equifreight.vn")
                .issuedAt(now.minusSeconds(120))
                .expiresAt(now.plusSeconds(ttlSeconds))
                .build();
        JwsHeader header = JwsHeader.with(JwtConfiguration.ALGORITHM).build();
        return new JwtConfiguration(secret).jwtEncoder()
                .encode(JwtEncoderParameters.from(header, claims))
                .getTokenValue();
    }

    @Test
    void acceptsATokenSignedWithTheSameSecret() {
        assertEquals("yen.vu@equifreight.vn",
                new JwtConfiguration(SECRET).jwtDecoder().decode(token(SECRET, 60)).getSubject());
    }

    @Test
    void rejectsATokenSignedWithAnotherSecret() {
        String forged = token("another-secret-that-is-also-32-bytes-long", 60);
        assertThrows(JwtException.class, () -> new JwtConfiguration(SECRET).jwtDecoder().decode(forged));
    }

    @Test
    void rejectsATokenThatExpiredASecondAgo() {
        String expired = token(SECRET, -1);
        assertThrows(JwtException.class, () -> new JwtConfiguration(SECRET).jwtDecoder().decode(expired));
    }

    @Test
    void rejectsATamperedToken() {
        String[] parts = token(SECRET, 60).split("\\.");
        // Swap in a payload claiming another subject, keeping the original signature.
        String payload = java.util.Base64.getUrlEncoder().withoutPadding()
                .encodeToString("{\"sub\":\"khoi.do@equifreight.vn\",\"exp\":9999999999}".getBytes());
        String tampered = parts[0] + "." + payload + "." + parts[2];
        assertThrows(JwtException.class, () -> new JwtConfiguration(SECRET).jwtDecoder().decode(tampered));
    }
}
