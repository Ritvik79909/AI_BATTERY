package com.ev.AI_battery.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final CustomUserDetailsService userDetailsService;

    // Public paths that don't need JWT validation
    private final List<String> publicPaths = Arrays.asList(
            "/api/auth/",
            "/oauth2/",
            "/login/",
            "/login/oauth2/code/"
    );

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return publicPaths.stream().anyMatch(path::startsWith);
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        try {
            String authHeader = request.getHeader("Authorization");
            String path = request.getRequestURI();

            log.debug("Processing request: {} {}", request.getMethod(), path);

            if (authHeader != null && authHeader.startsWith("Bearer ")) {

                String token = authHeader.substring(7);
                log.debug("Token extracted, length: {}", token.length());

                // Validate token
                if (jwtUtil.validateToken(token)) {
                    String email = jwtUtil.extractEmail(token);
                    log.debug("Token valid for email: {}", email);

                    if (email != null) {
                        // Load user details
                        UserDetails userDetails = userDetailsService.loadUserByUsername(email);

                        if (userDetails != null) {
                            // Create authentication token
                            UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                                    userDetails,
                                    null,
                                    userDetails.getAuthorities()
                            );

                            authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                            // Set authentication in SecurityContext
                            SecurityContextHolder.getContext().setAuthentication(authToken);

                            log.info("Authentication set in SecurityContext for: {}", email);

                            // Verify it was set
                            if (SecurityContextHolder.getContext().getAuthentication() != null) {
                                log.debug("Authentication verified in SecurityContext");
                            }
                        }
                    }
                } else {
                    log.warn("Invalid token for path: {}", path);
                }
            }
        } catch (Exception e) {
            log.error("JWT Authentication failed: {}", e.getMessage());
        }

        filterChain.doFilter(request, response);
    }
}