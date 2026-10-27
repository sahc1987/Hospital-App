package com.hms.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
public class TokenBlacklistService {

    private final RedisTemplate<String, Object> redisTemplate;
    private static final String PREFIX = "token:blacklist:";

    public void blacklist(String jti, long ttlMs) {
        if (ttlMs > 0) {
            redisTemplate.opsForValue().set(PREFIX + jti, "1", ttlMs, TimeUnit.MILLISECONDS);
        }
    }

    /**
     * Atomically blacklists the token; false if it was already blacklisted. One SET NX instead of
     * check-then-set, so two concurrent refreshes with the same token can't both win.
     */
    public boolean claim(String jti, long ttlMs) {
        return Boolean.TRUE.equals(redisTemplate.opsForValue()
                .setIfAbsent(PREFIX + jti, "1", Math.max(ttlMs, 1), TimeUnit.MILLISECONDS));
    }

    public boolean isBlacklisted(String jti) {
        return Boolean.TRUE.equals(redisTemplate.hasKey(PREFIX + jti));
    }
}
