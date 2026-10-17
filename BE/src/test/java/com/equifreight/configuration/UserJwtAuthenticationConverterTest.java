package com.equifreight.configuration;

import com.equifreight.entity.Role;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.RoleName;
import com.equifreight.entity.enums.UserStatus;
import com.equifreight.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.InvalidBearerTokenException;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** The access token is checked against the account on every request, so a removal works at once. */
class UserJwtAuthenticationConverterTest {

    private final UserRepository users = mock(UserRepository.class);
    private final UserJwtAuthenticationConverter converter = new UserJwtAuthenticationConverter(users);

    @Test
    @DisplayName("A removed account's still-valid access token is refused")
    void removedAccountTokenIsRefused() {
        when(users.findByEmailWithRoles("minh.tran@equifreight.vn")).thenReturn(Optional.of(user(UserStatus.DISABLED)));

        assertThrows(InvalidBearerTokenException.class, () -> converter.convert(jwt()));
    }

    @Test
    @DisplayName("An active account's token signs in with its roles")
    void activeAccountTokenIsAccepted() {
        User minh = user(UserStatus.ACTIVE);
        when(users.findByEmailWithRoles("minh.tran@equifreight.vn")).thenReturn(Optional.of(minh));

        var auth = converter.convert(jwt());

        assertEquals(minh, auth.getPrincipal());
        assertEquals("ROLE_ESCORT", auth.getAuthorities().iterator().next().getAuthority());
    }

    private static Jwt jwt() {
        return Jwt.withTokenValue("access").header("alg", "HS256").subject("minh.tran@equifreight.vn")
                .issuedAt(Instant.now()).expiresAt(Instant.now().plusSeconds(60)).build();
    }

    private static User user(UserStatus status) {
        User u = new User();
        u.setId(UUID.randomUUID());
        u.setEmail("minh.tran@equifreight.vn");
        u.setStatus(status);
        Role escort = new Role();
        escort.setName(RoleName.ESCORT);
        u.getRoles().add(escort);
        return u;
    }
}
