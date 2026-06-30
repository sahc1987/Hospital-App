package com.hms.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.UUID;

@Slf4j
@Component
public class JwtTokenProvider {

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Value("${jwt.expiration-ms}")
    private long jwtExpirationMs;

    @Value("${jwt.refresh-expiration-ms}")
    private long refreshExpirationMs;

    private SecretKey key() {
        return Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
    }

    public String generateToken(Authentication auth) {
        return buildToken(auth.getName(), jwtExpirationMs);
    }

    public String generateRefreshToken(String username) {
        return buildToken(username, refreshExpirationMs);
    }

    private String buildToken(String subject, long expiryMs) {
        return Jwts.builder()
                .id(UUID.randomUUID().toString())
                .subject(subject)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + expiryMs))
                .signWith(key())
                .compact();
    }

    public String getUsernameFromToken(String token) {
        return claims(token).getSubject();
    }

    public String extractJti(String token) {
        return claims(token).getId();
    }

    public long getRemainingTtlMs(String token) {
        long remaining = claims(token).getExpiration().getTime() - System.currentTimeMillis();
        return Math.max(0, remaining);
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parser().verifyWith(key()).build().parseSignedClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            log.debug("Invalid JWT token: {}", e.getMessage());
            return false;
        }
    }

    private io.jsonwebtoken.Claims claims(String token) {
        return Jwts.parser().verifyWith(key()).build()
                .parseSignedClaims(token).getPayload();
    }
}
