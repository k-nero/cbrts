package com.equifreight.configuration;

import com.equifreight.entity.enums.RoleName;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class ApplicationConfiguration {

    private final UserJwtAuthenticationConverter userJwtAuthenticationConverter;

    public ApplicationConfiguration(UserJwtAuthenticationConverter userJwtAuthenticationConverter) {
        this.userJwtAuthenticationConverter = userJwtAuthenticationConverter;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http.csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(sess -> sess.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                // Unauthenticated requests answer 401, not the Http403ForbiddenEntryPoint default:
                // the frontend only attempts a token refresh on 401. A role-denied authenticated
                // user still gets 403 from the AccessDeniedHandler (see the /error note below).
                .exceptionHandling(ex ->
                        ex.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/v1/auth/**").permitAll()
                        .requestMatchers("/api/v1/public/**").permitAll()
                        // The AccessDeniedHandler's 403 is re-dispatched to /error with an anonymous
                        // context; without permitAll it would hit the 401 entry point and clobber the 403.
                        .requestMatchers("/error").permitAll()
                        .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
                        // Users & roles and the audit log belong to the logistics manager (DESIGN.md).
                        .requestMatchers("/api/v1/admin/**").hasRole(RoleName.LOGISTICS_MANAGER)
                        .requestMatchers("/api/v1/customer/**").hasRole(RoleName.CUSTOMER)
                        .requestMatchers("/api/v1/escort/**").hasRole(RoleName.ESCORT)
                        .requestMatchers("/api/v1/staff/**").hasAnyRole(
                                RoleName.LOGISTICS_MANAGER, RoleName.TRANSPORT_SPECIALIST, RoleName.FLEET_COORDINATOR)
                        .anyRequest().authenticated()
                )
                // Bearer access tokens, verified by JwtConfiguration's decoder. A bad or expired token
                // answers 401 so the client refreshes, or returns to sign-in once refreshing fails too.
                .oauth2ResourceServer(oauth -> oauth
                        .jwt(jwt -> jwt.jwtAuthenticationConverter(userJwtAuthenticationConverter)));
        return http.build();
    }
}
