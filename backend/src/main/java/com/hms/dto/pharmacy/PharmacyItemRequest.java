package com.hms.dto.pharmacy;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record PharmacyItemRequest(
        @NotBlank String name,
        String category,
        @NotNull BigDecimal unitPrice,
        Integer stockQuantity,
        Integer reorderLevel
) {}
