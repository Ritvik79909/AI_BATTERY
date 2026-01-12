package com.ev.AI_battery.security;

import com.ev.AI_battery.model.Role;
import com.ev.AI_battery.model.User;
import com.ev.AI_battery.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class OAuth2LoginSuccessHandler implements AuthenticationSuccessHandler {

    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;

    @Override
    public void onAuthenticationSuccess(
            HttpServletRequest request,
            HttpServletResponse response,
            org.springframework.security.core.Authentication authentication
    ) throws IOException {

        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();

        String email = oAuth2User.getAttribute("email");
        String name = oAuth2User.getAttribute("name");
        String providerId = oAuth2User.getAttribute("sub");

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

        // Redirect to frontend with token
        response.sendRedirect(
                "http://localhost:5173/oauth-success?token=" + token
        );
    }
}
