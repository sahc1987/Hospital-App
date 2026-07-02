package com.hms.controller;

import com.hms.dto.ApiResponse;
import com.hms.dto.auth.AuthResponse;
import com.hms.dto.auth.ChangePasswordRequest;
import com.hms.dto.auth.LoginRequest;
import com.hms.dto.auth.ProfileUpdateRequest;
import com.hms.dto.user.UserResponse;
import com.hms.entity.User;
import com.hms.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(authService.login(req)));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AuthResponse>> refresh(@RequestParam String token) {
        return ResponseEntity.ok(ApiResponse.ok(authService.refresh(token)));
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
