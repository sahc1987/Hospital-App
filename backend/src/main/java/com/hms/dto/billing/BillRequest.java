package com.hms.dto.billing;

import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public record BillRequest(
        @NotNull Long patientId,
        Long admissionId,
        Long appointmentId,
        BigDecimal totalAmount,
        BigDecimal discount,
        LocalDateTime dueDate,
        String notes) {}
