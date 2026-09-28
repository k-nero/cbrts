package com.equifreight.configuration;

import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.Test;

import java.util.Date;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class JwtTokenParserTest {

    private static final String SECRET = "test-secret-that-is-at-least-32-bytes-long";

    private static String token(String secret, long ttlMs) {
        return Jwts.builder()
                .subject("yen.vu@equifreight.vn")
                .expiration(new Date(System.currentTimeMillis() + ttlMs))
                .signWith(Keys.hmacShaKeyFor(secret.getBytes()))
                .compact();
    }

    @Test
    void parsesATokenSignedWithTheSameSecret() {
        assertEquals("yen.vu@equifreight.vn", new JwtTokenParser(SECRET).parse(token(SECRET, 60_000)).getSubject());
    }

    @Test
    void rejectsATokenSignedWithAnotherSecret() {
        String forged = token("another-secret-that-is-also-32-bytes-long", 60_000);
        assertThrows(JwtException.class, () -> new JwtTokenParser(SECRET).parse(forged));
    }

    @Test
    void rejectsAnExpiredToken() {
        assertThrows(JwtException.class, () -> new JwtTokenParser(SECRET).parse(token(SECRET, -1_000)));
    }
}
