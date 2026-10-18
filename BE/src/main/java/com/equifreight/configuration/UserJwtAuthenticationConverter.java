package com.equifreight.configuration;

import com.equifreight.entity.Role;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.UserStatus;
import com.equifreight.repository.UserRepository;
import java.util.List;
import org.jspecify.annotations.NonNull;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.InvalidBearerTokenException;
import org.springframework.stereotype.Component;

/**
 * Turns a verified access token into the signed-in {@link User}, loaded fresh on every request so a
 * role change or a removed account takes effect at once rather than when the token expires. The
 * principal is the User entity, which controllers read with {@code @AuthenticationPrincipal User}.
 */
@Component
public class UserJwtAuthenticationConverter implements Converter<Jwt, AbstractAuthenticationToken> {

    private final UserRepository userRepository;

    public UserJwtAuthenticationConverter(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public AbstractAuthenticationToken convert(@NonNull Jwt jwt) {
        // An unknown account is an authentication failure (401), so the client returns to sign-in.
        User user = userRepository
                .findByEmailWithRoles(jwt.getSubject())
                .orElseThrow(() -> new InvalidBearerTokenException("The token's account no longer exists."));
        // A removed account is disabled, not deleted; its tokens stop working at once.
        if (user.getStatus() == UserStatus.DISABLED) {
            throw new InvalidBearerTokenException("The token's account was removed.");
        }
        List<SimpleGrantedAuthority> authorities = user.getRoles().stream()
                .map(Role::getName)
                .map(name -> new SimpleGrantedAuthority("ROLE_" + name))
                .toList();
        return UsernamePasswordAuthenticationToken.authenticated(user, jwt, authorities);
    }
}
