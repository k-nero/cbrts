package com.equifreight.configuration;

import com.equifreight.entity.Role;
import com.equifreight.entity.User;
import com.equifreight.repository.UserRepository;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.log4j.Log4j2;
import org.jspecify.annotations.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
@Log4j2
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String BEARER_PREFIX = "Bearer ";

    private final UserRepository userRepository;
    private final JwtTokenParser jwtTokenParser;

    public JwtAuthenticationFilter(UserRepository userRepository, JwtTokenParser jwtTokenParser) {
        this.userRepository = userRepository;
        this.jwtTokenParser = jwtTokenParser;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain chain) throws ServletException, IOException {

        String header = request.getHeader("Authorization");
        if (!StringUtils.hasText(header) || !header.startsWith(BEARER_PREFIX)) {
            chain.doFilter(request, response);
            return;
        }

        try {
            Claims claims = jwtTokenParser.parse(header.substring(BEARER_PREFIX.length()));
            String email = claims.getSubject();
            if (StringUtils.hasText(email) && SecurityContextHolder.getContext().getAuthentication() == null) {
                userRepository.findByEmailWithRoles(email).ifPresent(user -> authenticate(user, request));
            }
        } catch (JwtException | IllegalArgumentException ex) {
            // A bad or expired bearer token is an authentication failure: answer 401 so the client
            // refreshes, or returns to sign-in when the refresh token has expired too.
            log.debug("JWT validation failed: {}", ex.getMessage());
            SecurityContextHolder.clearContext();
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }

        chain.doFilter(request, response);
    }

    private static void authenticate(User user, HttpServletRequest request) {
        List<SimpleGrantedAuthority> authorities = user.getRoles().stream()
                .map(Role::getName)
                .map(name -> new SimpleGrantedAuthority("ROLE_" + name))
                .toList();
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(user, null, authorities);
        auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
        SecurityContextHolder.getContext().setAuthentication(auth);
    }
}
