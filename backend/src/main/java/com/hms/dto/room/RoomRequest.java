package com.hms.dto.room;

import com.hms.entity.enums.RoomType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record RoomRequest(
        @NotBlank String roomNumber,
        @NotNull RoomType roomType,
        Integer floor,
        @DecimalMin("0") BigDecimal dailyRate,
        @Min(1) @Max(50) Integer capacity   // beds; defaults to 1 (single-patient room)
) {
    public RoomRequest {
        if (capacity == null) capacity = 1;
    }
}
