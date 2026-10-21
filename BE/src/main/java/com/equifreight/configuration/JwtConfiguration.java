package com.equifreight.configuration;

import com.nimbusds.jose.jwk.source.ImmutableSecret;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;

/**
 * Access tokens are HS256 JWTs signed with the shared {@code jwt.secret} (at least 32 bytes).
 * AuthService issues them through the encoder; the resource server verifies them through the
 * decoder, and so can any other entry point (e.g. a websocket handshake), so all accept exactly
 * the same tokens.
 */
@Configuration
public class JwtConfiguration {

    public static final MacAlgorithm ALGORITHM = MacAlgorithm.HS256;

    private final SecretKey key;

    public JwtConfiguration(@Value("${jwt.secret}") String secret) {
        this.key = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
    }

    @Bean
    public JwtEncoder jwtEncoder() {
        return new NimbusJwtEncoder(new ImmutableSecret<>(key));
    }

    @Bean
    public JwtDecoder jwtDecoder() {
        NimbusJwtDecoder decoder =
                NimbusJwtDecoder.withSecretKey(key).macAlgorithm(ALGORITHM).build();
        // One server issues and checks the tokens, so no clock skew: expired means expired.
        decoder.setJwtValidator(new JwtTimestampValidator(Duration.ZERO));
        return decoder;
    }
}
