package com.ev.AI_battery.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
public class CorsConfig {

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {

        CorsConfiguration config = new CorsConfiguration();

        // Frontend origin
        config.setAllowedOrigins(List.of("http://localhost:5173"));

        // VERY IMPORTANT: allow OPTIONS for preflight
        config.setAllowedMethods(List.of(
                "GET",
                "POST",
                "PUT",
                "DELETE",
                "OPTIONS"
        ));

        // Allow all headers (Authorization, Content-Type, etc.)
        config.setAllowedHeaders(List.of("*"));

        // Allow credentials for OAuth2 redirect flow
        config.setAllowCredentials(true);

        // Cache preflight result (optional but good)
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source =
                new UrlBasedCorsConfigurationSource();

        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
