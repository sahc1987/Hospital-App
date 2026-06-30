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

    public boolean isBlacklisted(String jti) {
        return Boolean.TRUE.equals(redisTemplate.hasKey(PREFIX + jti));
    }
}
