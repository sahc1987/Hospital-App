package com.hms.service;

import com.hms.dto.auth.AuthResponse;
import com.hms.dto.auth.LoginRequest;
import com.hms.entity.User;
import com.hms.exception.BadRequestException;
import com.hms.repository.UserRepository;
import com.hms.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authManager;
    private final JwtTokenProvider tokenProvider;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final TokenBlacklistService blacklistService;

    public AuthResponse login(LoginRequest req) {
        Authentication auth = authManager.authenticate(
                new UsernamePasswordAuthenticationToken(req.username(), req.password()));
        User user = (User) auth.getPrincipal();
        String access = tokenProvider.generateToken(auth);
        String refresh = tokenProvider.generateRefreshToken(user.getUsername());
        return AuthResponse.of(access, refresh, user.getId(), user.getUsername(),
                user.getEmail(), user.getFullName(), user.getRole());
    }

    public AuthResponse refresh(String refreshToken) {
        if (!tokenProvider.validateToken(refreshToken)) {
            throw new BadRequestException("Invalid or expired refresh token");
        }
        String oldJti = tokenProvider.extractJti(refreshToken);
        if (blacklistService.isBlacklisted(oldJti)) {
            throw new BadRequestException("Refresh token has already been used");
        }
        blacklistService.blacklist(oldJti, tokenProvider.getRemainingTtlMs(refreshToken));
        String username = tokenProvider.getUsernameFromToken(refreshToken);
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new BadRequestException("User not found"));

        Authentication auth = new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities());
        String access = tokenProvider.generateToken(auth);
        String newRefresh = tokenProvider.generateRefreshToken(username);
        return AuthResponse.of(access, newRefresh, user.getId(), user.getUsername(),
                user.getEmail(), user.getFullName(), user.getRole());
    }
}
