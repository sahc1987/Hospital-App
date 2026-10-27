package com.hms.config;

import com.hms.entity.RolePermissionId;
import com.hms.entity.User;
import com.hms.entity.enums.UserRole;
import com.hms.repository.RolePermissionRepository;
import com.hms.security.JwtAuthFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.authorization.AuthorizationDecision;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.intercept.RequestAuthorizationContext;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.function.Supplier;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;
    private final UserDetailsService userDetailsService;
    private final RolePermissionRepository rolePermissionRepository;

    @Value("${cors.allowed-origins}")
    private String allowedOrigins;

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
                // CSRF off on purpose: auth is SameSite=Strict HttpOnly cookies, which browsers never send cross-site
                .csrf(AbstractHttpConfigurer::disable) // NOSONAR java:S4502
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/auth/login", "/api/auth/refresh", "/api/auth/logout").permitAll()
                        .requestMatchers("/actuator/health").permitAll()
                        // error dispatch skips the JWT filter; without this a 403 is rewritten to 401
                        .requestMatchers("/error").permitAll()
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/api/appointments/today", "/api/dashboard/**").authenticated()
                        .requestMatchers("/api/**").access(this::checkAccessMatrix)
                        .anyRequest().authenticated()
                )
                // 401 (not Spring's default 403) for missing/expired tokens, so the frontend redirects to login
                .exceptionHandling(e -> e.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
                .authenticationProvider(authenticationProvider())
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
                .build();
    }

    /** Prefixes outside the matrix that guard themselves: auth (own endpoints), users (@PreAuthorize ADMIN),
     *  permissions (read by every role to build the menu; writes are @PreAuthorize ADMIN). */
    private static final java.util.Set<String> SELF_GUARDED = java.util.Set.of("auth", "users", "permissions");

    // API prefix -> frontend route in role_permissions. Anything else is denied unless in SELF_GUARDED.
    private static final Map<String, String> API_ROUTES = Map.ofEntries(
            Map.entry("patients", "/patients"), Map.entry("appointments", "/appointments"),
            Map.entry("doctors", "/doctors"), Map.entry("departments", "/departments"),
            Map.entry("admissions", "/admissions"), Map.entry("rooms", "/rooms"),
            Map.entry("lab", "/lab"), Map.entry("pharmacy", "/pharmacy"),
            Map.entry("bills", "/billing"), Map.entry("employees", "/employees"),
            Map.entry("payroll", "/payroll"));

    // ponytail: one PK lookup per request — cache the matrix if it ever shows up in a profile
    AuthorizationDecision checkAccessMatrix(Supplier<Authentication> authSupplier,
                                                    RequestAuthorizationContext ctx) {
        Authentication auth = authSupplier.get();
        if (auth == null || !auth.isAuthenticated() || !(auth.getPrincipal() instanceof User user)) {
            return new AuthorizationDecision(false);
        }
        if (user.getRole() == UserRole.ADMIN) return new AuthorizationDecision(true);
        String[] parts = ctx.getRequest().getRequestURI().split("/");
        String prefix = parts.length > 2 ? parts[2] : "";
        String route = API_ROUTES.get(prefix);
        // Deny by default: a new controller stays closed until it's mapped to a module (or listed as open)
        if (route == null) return new AuthorizationDecision(SELF_GUARDED.contains(prefix));
        return new AuthorizationDecision(
                rolePermissionRepository.existsById(new RolePermissionId(user.getRole().name(), route)));
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOriginPatterns(
                Arrays.stream(allowedOrigins.split(",")).map(String::trim).toList());
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    @Bean
    AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }
}
