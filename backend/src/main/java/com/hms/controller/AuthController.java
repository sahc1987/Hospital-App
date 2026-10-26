package com.hms.controller;

import com.hms.dto.ApiResponse;
import com.hms.dto.auth.AuthResponse;
import com.hms.dto.auth.ChangePasswordRequest;
import com.hms.dto.auth.LoginRequest;
import com.hms.dto.auth.ProfileUpdateRequest;
import com.hms.dto.user.UserResponse;
import com.hms.entity.User;
import com.hms.exception.BadRequestException;
import com.hms.security.JwtTokenProvider;
import com.hms.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final JwtTokenProvider tokenProvider;

    // Tokens live in HttpOnly cookies (unreadable by page JS, so XSS can't steal them).
    // SameSite=Strict keeps them off cross-site requests, which is why CSRF stays disabled.
    public static final String ACCESS_COOKIE = "hms_access";
    public static final String REFRESH_COOKIE = "hms_refresh";

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest req,
                                                           HttpServletRequest http) {
        return withCookies(authService.login(req), http);
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AuthResponse>> refresh(
            @CookieValue(value = REFRESH_COOKIE, required = false) String refreshToken, HttpServletRequest http) {
        if (refreshToken == null || refreshToken.isBlank()) throw new BadRequestException("Refresh token is required");
        return withCookies(authService.refresh(refreshToken), http);
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(
            @CookieValue(value = ACCESS_COOKIE, required = false) String access,
            @CookieValue(value = REFRESH_COOKIE, required = false) String refresh, HttpServletRequest http) {
        authService.logout(access, refresh);
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie(ACCESS_COOKIE, "", "/api", 0, http))
                .header(HttpHeaders.SET_COOKIE, cookie(REFRESH_COOKIE, "", "/api/auth", 0, http))
                .body(ApiResponse.ok("Logged out"));
    }

    private ResponseEntity<ApiResponse<AuthResponse>> withCookies(AuthResponse auth, HttpServletRequest http) {
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie(ACCESS_COOKIE, auth.accessToken(), "/api",
                        tokenProvider.getRemainingTtlMs(auth.accessToken()), http))
                .header(HttpHeaders.SET_COOKIE, cookie(REFRESH_COOKIE, auth.refreshToken(), "/api/auth",
                        tokenProvider.getRemainingTtlMs(auth.refreshToken()), http))
                .body(ApiResponse.ok(auth.withoutTokens()));
    }

    private static String cookie(String name, String value, String path, long maxAgeMs, HttpServletRequest http) {
        return ResponseCookie.from(name, value)
                .httpOnly(true)
                .secure(http.isSecure()) // true behind HTTPS (see server.forward-headers-strategy)
                .sameSite("Strict")
                .path(path)
                .maxAge(Duration.ofMillis(maxAgeMs))
                .build().toString();
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse>> me(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ApiResponse.ok(authService.getMe(user)));
    }

    @PutMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse>> updateProfile(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody ProfileUpdateRequest req) {
        return ResponseEntity.ok(ApiResponse.ok("Profile updated", authService.updateProfile(user, req)));
    }

    @PostMapping("/change-password")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody ChangePasswordRequest req) {
        authService.changePassword(user, req);
        return ResponseEntity.ok(ApiResponse.ok("Password changed successfully"));
    }
}
