package com.hms.config;

import com.fasterxml.jackson.annotation.JsonTypeInfo;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.jsontype.BasicPolymorphicTypeValidator;
import com.fasterxml.jackson.databind.jsontype.PolymorphicTypeValidator;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.StringRedisSerializer;

import java.time.Duration;
import java.util.Map;

@Configuration
@EnableCaching
public class RedisConfig {

    @Bean
    RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory factory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(factory);
        template.setKeySerializer(new StringRedisSerializer());
        template.setValueSerializer(new GenericJackson2JsonRedisSerializer(objectMapper()));
        template.setHashKeySerializer(new StringRedisSerializer());
        template.setHashValueSerializer(new GenericJackson2JsonRedisSerializer(objectMapper()));
        template.afterPropertiesSet();
        return template;
    }

    @Bean
    CacheManager cacheManager(RedisConnectionFactory factory) {
        RedisCacheConfiguration defaultConfig = RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofMinutes(5))
                .disableCachingNullValues()
                .serializeKeysWith(RedisSerializationContext.SerializationPair.fromSerializer(new StringRedisSerializer()))
                .serializeValuesWith(RedisSerializationContext.SerializationPair.fromSerializer(
                        new GenericJackson2JsonRedisSerializer(objectMapper())));

        Map<String, RedisCacheConfiguration> cacheConfigs = Map.of(
                "departments",  defaultConfig.entryTtl(Duration.ofHours(1)),
                "doctors",      defaultConfig.entryTtl(Duration.ofMinutes(30)),
                "patients",     defaultConfig.entryTtl(Duration.ofMinutes(10)),
                "rooms",        defaultConfig.entryTtl(Duration.ofMinutes(15)),
                "pharmacy",     defaultConfig.entryTtl(Duration.ofMinutes(10)),
                "dashboard",    defaultConfig.entryTtl(Duration.ofMinutes(2)),
                "insurance",    defaultConfig.entryTtl(Duration.ofHours(2))
        );

        return RedisCacheManager.builder(factory)
                .cacheDefaults(defaultConfig)
                .withInitialCacheConfigurations(cacheConfigs)
                .build();
    }

    private ObjectMapper objectMapper() {
        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(new JavaTimeModule());
        PolymorphicTypeValidator ptv = BasicPolymorphicTypeValidator.builder()
                .allowIfSubType("com.hms")
                .allowIfSubType("java.util")
                .allowIfSubType("java.math")
                .allowIfSubType("java.time")
                .build();
        // NON_FINAL plus records: records (DashboardStats) are final, so plain NON_FINAL wrote no @class and every
        // cache hit failed to deserialize -> 500. (EVERYTHING would work but is deprecated; Jackson 2.x has no
        // built-in "non-final and records" option.)
        var typing = new ObjectMapper.DefaultTypeResolverBuilder(ObjectMapper.DefaultTyping.NON_FINAL, ptv) {
            @Override
            public boolean useForType(com.fasterxml.jackson.databind.JavaType t) {
                return t.isRecordType() || super.useForType(t);
            }
        };
        mapper.setDefaultTyping(typing.init(JsonTypeInfo.Id.CLASS, null).inclusion(JsonTypeInfo.As.PROPERTY));
        return mapper;
    }
}
