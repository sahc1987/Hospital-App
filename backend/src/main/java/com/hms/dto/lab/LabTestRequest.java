package com.hms.dto.lab;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record LabTestRequest(
        @NotNull Long patientId,
        Long doctorId,
        @NotBlank String testName,
        String notes
) {}
