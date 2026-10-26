package com.hms.service;

import com.hms.dto.auth.AuthResponse;
import com.hms.dto.auth.ChangePasswordRequest;
import com.hms.dto.auth.LoginRequest;
import com.hms.dto.auth.ProfileUpdateRequest;
import com.hms.dto.user.UserResponse;
import com.hms.entity.User;
import com.hms.exception.BadRequestException;
import com.hms.repository.UserRepository;
import com.hms.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authManager;
    private final JwtTokenProvider tokenProvider;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final TokenBlacklistService blacklistService;
    private final RedisTemplate<String, Object> redisTemplate;
    private final UserService userService;

    // ponytail: per-username lockout — lets an attacker lock a known account for 15 min; add per-IP limits if that bites
    private static final int MAX_FAILED_LOGINS = 5;
    private static final Duration LOCKOUT = Duration.ofMinutes(15);

    public AuthResponse login(LoginRequest req) {
        String failKey = "login:fail:" + req.username().toLowerCase();
        Object fails = redisTemplate.opsForValue().get(failKey);
        if (fails != null && Long.parseLong(fails.toString()) >= MAX_FAILED_LOGINS) {
            throw new BadRequestException("Too many failed attempts. Try again in 15 minutes.");
        }
        Authentication auth;
        try {
            auth = authManager.authenticate(
                    new UsernamePasswordAuthenticationToken(req.username(), req.password()));
        } catch (BadCredentialsException e) {
            redisTemplate.opsForValue().increment(failKey);
            redisTemplate.expire(failKey, LOCKOUT);
            throw e;
        }
        redisTemplate.delete(failKey);
        User user = (User) auth.getPrincipal();
        String access = tokenProvider.generateToken(auth);
        String refresh = tokenProvider.generateRefreshToken(user.getUsername());
        return AuthResponse.of(access, refresh, user.getId(), user.getUsername(),
                user.getEmail(), user.getFullName(), user.getRole());
    }

    public UserResponse getMe(User user) {
        return userService.get(user.getId()); // includes the linked doctor/employee record
    }

    @Transactional
    public UserResponse updateProfile(User user, ProfileUpdateRequest req) {
        if (!user.getEmail().equals(req.email()) && userRepository.existsByEmail(req.email())) {
            throw new BadRequestException("Email is already in use by another account");
        }
        user.setFullName(req.fullName());
        user.setEmail(req.email());
        return UserResponse.from(userRepository.save(user));
    }

    @Transactional
    public void changePassword(User user, ChangePasswordRequest req) {
        if (!passwordEncoder.matches(req.currentPassword(), user.getPassword())) {
            throw new BadRequestException("Current password is incorrect");
        }
        user.setPassword(passwordEncoder.encode(req.newPassword()));
        userRepository.save(user);
    }

    public void logout(String... tokens) {
        for (String t : tokens) {
            if (t != null && tokenProvider.validateToken(t)) {
                blacklistService.blacklist(tokenProvider.extractJti(t), tokenProvider.getRemainingTtlMs(t));
            }
        }
    }

    public AuthResponse refresh(String refreshToken) {
        if (!tokenProvider.validateToken(refreshToken) || !tokenProvider.isType(refreshToken, JwtTokenProvider.REFRESH)) {
            throw new BadRequestException("Invalid or expired refresh token");
        }
        String oldJti = tokenProvider.extractJti(refreshToken);
        if (blacklistService.isBlacklisted(oldJti)) {
            throw new BadRequestException("Refresh token has already been used");
        }
        blacklistService.blacklist(oldJti, tokenProvider.getRemainingTtlMs(refreshToken));
        String username = tokenProvider.getUsernameFromToken(refreshToken);
        User user = userRepository.findByUsername(username)
                .filter(User::isActive)
                .orElseThrow(() -> new BadRequestException("User not found"));

        Authentication auth = new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities());
        String access = tokenProvider.generateToken(auth);
        String newRefresh = tokenProvider.generateRefreshToken(username);
        return AuthResponse.of(access, newRefresh, user.getId(), user.getUsername(),
                user.getEmail(), user.getFullName(), user.getRole());
    }
}
