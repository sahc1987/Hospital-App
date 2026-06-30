package com.hms.dto.room;

import com.hms.entity.enums.RoomType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record RoomRequest(
        @NotBlank String roomNumber,
        @NotNull RoomType roomType,
        Integer floor,
        BigDecimal dailyRate
) {}
