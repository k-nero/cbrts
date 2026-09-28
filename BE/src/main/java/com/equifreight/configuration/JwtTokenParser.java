package com.equifreight.configuration;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;

/**
 * Verifies and parses access tokens. Kept apart from the HTTP filter so any other
 * entry point (e.g. a websocket handshake) accepts exactly the same tokens.
 */
@Component
public class JwtTokenParser {

    private final SecretKey key;

    public JwtTokenParser(@Value("${jwt.secret}") String jwtSecret) {
        this.key = Keys.hmacShaKeyFor(jwtSecret.getBytes());
    }

    /** @throws JwtException on a bad, tampered or expired token. */
    public Claims parse(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
