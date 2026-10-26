package com.hms.dto.auth;

import com.hms.entity.enums.UserRole;

public record AuthResponse(
        String accessToken,
        String refreshToken,
        String tokenType,
        Long userId,
        String username,
        String email,
        String fullName,
        UserRole role
) {
    public static AuthResponse of(String access, String refresh,
                                  Long userId, String username, String email,
                                  String fullName, UserRole role) {
        return new AuthResponse(access, refresh, "Bearer", userId, username, email, fullName, role);
    }

    // Tokens travel only in HttpOnly cookies; never hand them to page JS
    public AuthResponse withoutTokens() {
        return new AuthResponse(null, null, null, userId, username, email, fullName, role);
    }
}
