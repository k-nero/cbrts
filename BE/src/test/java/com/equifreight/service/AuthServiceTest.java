package com.equifreight.service;

import com.equifreight.entity.Club;
import com.equifreight.entity.Country;
import com.equifreight.entity.RefreshToken;
import com.equifreight.entity.Role;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.RoleName;
import com.equifreight.entity.enums.UserStatus;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ConflictException;
import com.equifreight.exception.UnauthorizedException;
import com.equifreight.model.auth.LoginRequest;
import com.equifreight.model.auth.RegisterRequest;
import com.equifreight.model.auth.TokenResponse;
import com.equifreight.repository.ClubRepository;
import com.equifreight.repository.CountryRepository;
import com.equifreight.repository.RefreshTokenRepository;
import com.equifreight.repository.RoleRepository;
import com.equifreight.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class AuthServiceTest {

    @Mock private UserRepository users;
    @Mock private RefreshTokenRepository refreshTokens;
    @Mock private ClubRepository clubs;
    @Mock private CountryRepository countries;
    @Mock private RoleRepository roles;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtEncoder jwtEncoder;

    @InjectMocks
    private AuthService service;

    private Country vietnam;
    private Role customer;

    @BeforeEach
    void setUp() {
        vietnam = new Country();
        vietnam.setCode("VN");
        vietnam.setName("Vietnam");
        customer = new Role();
        customer.setName(RoleName.CUSTOMER);

        when(countries.findById("VN")).thenReturn(Optional.of(vietnam));
        when(roles.findByName(RoleName.CUSTOMER)).thenReturn(Optional.of(customer));
        when(passwordEncoder.encode(any())).thenReturn("hashed");
        when(clubs.save(any(Club.class))).thenAnswer(inv -> inv.getArgument(0));
        when(users.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(UUID.randomUUID());
            return u;
        });
        when(refreshTokens.save(any(RefreshToken.class))).thenAnswer(inv -> inv.getArgument(0));
        Jwt jwt = Jwt.withTokenValue("access").header("alg", "HS256").subject("x")
                .issuedAt(Instant.now()).expiresAt(Instant.now().plusSeconds(60)).build();
        when(jwtEncoder.encode(any(JwtEncoderParameters.class))).thenReturn(jwt);
    }

    private static RegisterRequest request() {
        RegisterRequest r = new RegisterRequest();
        r.setClubName("  Đà Lạt Highland Stables ");
        r.setCountryCode("VN");
        r.setFirstName("Minh Đức");
        r.setLastName("Phạm");
        r.setEmail(" duc@dalathighland.vn ");
        r.setPhone("");
        r.setPassword("correct-horse-battery");
        return r;
    }

    @Test
    @DisplayName("register creates the club and its one customer account, then signs it in")
    void registerCreatesClubAndCustomer() {
        TokenResponse tokens = service.register(request());

        ArgumentCaptor<User> user = ArgumentCaptor.forClass(User.class);
        verify(users).save(user.capture());
        User saved = user.getValue();
        assertEquals("duc@dalathighland.vn", saved.getEmail());
        assertEquals("hashed", saved.getPassword());
        assertNull(saved.getPhone());
        assertEquals(java.util.Set.of(customer), saved.getRoles());
        assertNull(saved.getStaffCode());

        Club club = saved.getClub();
        assertNotNull(club);
        assertEquals("Đà Lạt Highland Stables", club.getName());
        assertEquals("duc@dalathighland.vn", club.getBookingEmail());
        assertSame(vietnam, club.getCountry());

        assertEquals("access", tokens.getAccessToken());
        assertNotNull(tokens.getRefreshToken());
    }

    @Test
    @DisplayName("register refuses an email that already has an account, creating nothing")
    void registerRefusesTakenEmail() {
        when(users.getByEmail("duc@dalathighland.vn")).thenReturn(new User());

        ConflictException ex = assertThrows(ConflictException.class, () -> service.register(request()));
        assertEquals("EMAIL_IN_USE", ex.getCode());
        verify(clubs, never()).save(any());
        verify(users, never()).save(any());
    }

    @Test
    @DisplayName("register refuses a country EquiFreight doesn't serve")
    void registerRefusesUnknownCountry() {
        RegisterRequest r = request();
        r.setCountryCode("FR");
        when(countries.findById("FR")).thenReturn(Optional.empty());

        assertThrows(BusinessException.class, () -> service.register(r));
        verify(clubs, never()).save(any());
    }

    private User staff(UserStatus status) {
        User u = new User();
        u.setId(UUID.randomUUID());
        u.setEmail("minh.tran@equifreight.vn");
        u.setPassword("hashed");
        u.setStatus(status);
        Role escort = new Role();
        escort.setName(RoleName.ESCORT);
        u.getRoles().add(escort);
        when(users.getByEmail("minh.tran@equifreight.vn")).thenReturn(u);
        when(passwordEncoder.matches("right", "hashed")).thenReturn(true);
        return u;
    }

    private static LoginRequest login(String password) {
        LoginRequest r = new LoginRequest();
        r.setEmail("minh.tran@equifreight.vn");
        r.setPassword(password);
        return r;
    }

    @Test
    @DisplayName("A removed (disabled) account can't sign in, and is told so once the password matches")
    void removedAccountCannotSignIn() {
        staff(UserStatus.DISABLED);

        var e = assertThrows(UnauthorizedException.class, () -> service.login(login("right"), "127.0.0.1"));

        assertEquals(AuthService.REMOVED_MESSAGE, e.getMessage());
        verify(refreshTokens, never()).save(any());
    }

    @Test
    @DisplayName("A wrong password on a removed account gets the usual answer, revealing nothing")
    void removedAccountWithWrongPasswordRevealsNothing() {
        staff(UserStatus.DISABLED);

        var e = assertThrows(UnauthorizedException.class, () -> service.login(login("wrong"), "127.0.0.1"));

        assertEquals("Email or password doesn't match.", e.getMessage());
    }

    @Test
    @DisplayName("An active account signs in")
    void activeAccountSignsIn() {
        staff(UserStatus.ACTIVE);

        TokenResponse tokens = service.login(login("right"), "127.0.0.1");

        assertEquals("access", tokens.getAccessToken());
    }

    @Test
    @DisplayName("A removed account can't refresh its session")
    void removedAccountCannotRefresh() {
        RefreshToken token = new RefreshToken();
        token.setToken("t");
        token.setUser(staff(UserStatus.DISABLED));
        token.setExpiryDate(Instant.now().plusSeconds(3600));
        when(refreshTokens.findByToken("t")).thenReturn(Optional.of(token));

        var e = assertThrows(UnauthorizedException.class, () -> service.refreshToken("t"));

        assertEquals(AuthService.REMOVED_MESSAGE, e.getMessage());
        verify(refreshTokens, never()).save(any());
    }
}
