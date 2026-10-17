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
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@Log4j2
public class AuthService {
    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final ClubRepository clubRepository;
    private final CountryRepository countryRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtEncoder jwtEncoder;

    AuthService(UserRepository userRepository,
            RefreshTokenRepository refreshTokenRepository,
            ClubRepository clubRepository,
            CountryRepository countryRepository,
            RoleRepository roleRepository,
            PasswordEncoder passwordEncoder,
            JwtEncoder jwtEncoder) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.clubRepository = clubRepository;
        this.countryRepository = countryRepository;
        this.roleRepository = roleRepository;
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
        // Checked after the password, so only the account's holder learns it was removed.
        requireNotRemoved(user);
        return new TokenResponse(generateAccessToken(user), createRefreshToken(user).getToken());
    }

    /**
     * Self sign-up for racing clubs and horse owners: creates the club and its one customer
     * account (the email doubles as the club's booking email) and signs it in. Staff accounts
     * only come by invite, so the role is always CUSTOMER whatever the caller sends.
     */
    @Transactional
    public TokenResponse register(RegisterRequest request) {
        String email = request.getEmail().trim();
        if (userRepository.getByEmail(email) != null) {
            throw new ConflictException("EMAIL_IN_USE",
                    "An account already uses this email. Sign in, or reset your password.");
        }
        Country country = countryRepository.findById(request.getCountryCode())
                .orElseThrow(() -> new BusinessException("We don't serve that country yet."));
        Role customer = roleRepository.findByName(RoleName.CUSTOMER)
                .orElseThrow(() -> new IllegalStateException("The CUSTOMER role is not seeded."));

        Club club = new Club();
        club.setName(request.getClubName().trim());
        club.setBookingEmail(email);
        club.setPhone(blankToNull(request.getPhone()));
        club.setCountry(country);
        club = clubRepository.save(club);

        User user = new User();
        user.setEmail(email);
        user.setFirstName(request.getFirstName().trim());
        user.setLastName(request.getLastName().trim());
        user.setPhone(blankToNull(request.getPhone()));
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setClub(club);
        user.setRoles(new HashSet<>(Set.of(customer)));
        user = userRepository.save(user);

        log.info("Club account created for {} ({})", club.getName(), email);
        return new TokenResponse(generateAccessToken(user), createRefreshToken(user).getToken());
    }

    /** A removed staff account is disabled, never deleted; it can't sign in or refresh a session. */
    private static void requireNotRemoved(User user) {
        if (user.getStatus() == UserStatus.DISABLED) {
            log.info("Sign-in refused for removed account {}", user.getEmail());
            throw new UnauthorizedException(REMOVED_MESSAGE);
        }
    }

    static final String REMOVED_MESSAGE =
            "This account was removed. Ask your logistics manager if you need access again.";

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
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
        requireNotRemoved(user);
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
