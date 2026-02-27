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
        config.setAllowedOrigins(List.of("http://localhost:5174"));

        // VERY IMPORTANT: allow OPTIONS for preflight
        config.setAllowedMethods(List.of(
                "GET",
                "POST",
                "PUT",
                "DELETE",
                "OPTIONS",
                "PATCH"
        ));

        // Allow all headers
        config.setAllowedHeaders(List.of("*"));

        // Allow credentials for OAuth2 redirect flow
        config.setAllowCredentials(true);

        // Expose headers for OAuth2
        config.setExposedHeaders(List.of(
                "Authorization",
                "Set-Cookie"
        ));

        // Cache preflight result
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}