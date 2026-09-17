package za.ac.cput.VendorLink.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfigurationSource;
import za.ac.cput.VendorLink.dto.response.ErrorResponse;
import za.ac.cput.VendorLink.security.CustomUserDetailsService;
import za.ac.cput.VendorLink.security.JwtAuthFilter;

import java.time.LocalDateTime;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;
    private final CustomUserDetailsService userDetailsService;
    private final CorsConfigurationSource corsConfigurationSource;
    private final ObjectMapper objectMapper;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource))
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // Public auth and discovery endpoints
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/api/auth/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/events", "/api/events/*").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/categories", "/api/categories/*").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/vendors", "/api/vendors/*").permitAll()
                        .requestMatchers("/error").permitAll()

                        // Role-specific endpoints
                        .requestMatchers("/api/events/organizer/**").hasRole("ORGANIZER")
                        .requestMatchers(HttpMethod.POST, "/api/events").hasRole("ORGANIZER")
                        .requestMatchers(HttpMethod.PUT, "/api/events/**").hasRole("ORGANIZER")
                        .requestMatchers(HttpMethod.DELETE, "/api/events/**").hasRole("ORGANIZER")
                        .requestMatchers(HttpMethod.PATCH, "/api/applications/*/status").hasRole("ORGANIZER")
                        .requestMatchers(HttpMethod.GET, "/api/applications/event/*").hasRole("ORGANIZER")

                        .requestMatchers("/api/vendor/**").hasRole("VENDOR")
                        .requestMatchers(HttpMethod.POST, "/api/applications").hasRole("VENDOR")
                        .requestMatchers(HttpMethod.GET, "/api/applications/my").hasRole("VENDOR")

                        // Authenticated requests
                        .anyRequest().authenticated()
                )
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint((request, response, authException) -> {
                            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                            ErrorResponse errorResponse = ErrorResponse.builder()
                                    .timestamp(LocalDateTime.now())
                                    .status(HttpServletResponse.SC_UNAUTHORIZED)
                                    .error("Unauthorized")
                                    .message(authException.getMessage() != null ? authException.getMessage() : "Authentication token is missing or invalid")
                                    .path(request.getRequestURI())
                                    .build();
                            response.getWriter().write(objectMapper.writeValueAsString(errorResponse));
                        })
                        .accessDeniedHandler((request, response, accessDeniedException) -> {
                            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                            ErrorResponse errorResponse = ErrorResponse.builder()
                                    .timestamp(LocalDateTime.now())
                                    .status(HttpServletResponse.SC_FORBIDDEN)
                                    .error("Forbidden")
                                    .message("You do not have permission to access this resource")
                                    .path(request.getRequestURI())
                                    .build();
                            response.getWriter().write(objectMapper.writeValueAsString(errorResponse));
                        })
                )
                .authenticationProvider(authenticationProvider())
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}
