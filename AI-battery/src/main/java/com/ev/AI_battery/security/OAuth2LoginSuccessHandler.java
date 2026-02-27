package com.ev.AI_battery.security;

import com.ev.AI_battery.model.Role;
import com.ev.AI_battery.model.User;
import com.ev.AI_battery.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Optional;

@Component
@RequiredArgsConstructor
@Slf4j
public class OAuth2LoginSuccessHandler implements AuthenticationSuccessHandler {

    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;

    @Override
    public void onAuthenticationSuccess(
            HttpServletRequest request,
            HttpServletResponse response,
            Authentication authentication
    ) throws IOException {

        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();

        String email = oAuth2User.getAttribute("email");
        String name = oAuth2User.getAttribute("name");
        String providerId = oAuth2User.getAttribute("sub");

        log.info("OAuth2 login success for email: {}", email);

        Optional<User> existingUser = userRepository.findByEmail(email);

        User user = existingUser.orElseGet(() -> {
            User newUser = new User();
            newUser.setEmail(email);
            newUser.setName(name);
            newUser.setRole(Role.USER);
            newUser.setProvider("GOOGLE");
            newUser.setProviderId(providerId);
            newUser.setCreatedAt(LocalDateTime.now());
            return userRepository.save(newUser);
        });

        String token = jwtUtil.generateToken(user.getEmail());
        log.info("Generated JWT token for user: {}", email);

        // Redirect to frontend with token
        String redirectUrl = "http://localhost:5174/oauth-success?token=" + token;
        log.info("Redirecting to: {}", redirectUrl);

        response.setStatus(HttpServletResponse.SC_FOUND);
        response.setHeader("Location", redirectUrl);
        response.setHeader("Access-Control-Allow-Origin", "http://localhost:5174");
        response.setHeader("Access-Control-Allow-Credentials", "true");
    }
}
