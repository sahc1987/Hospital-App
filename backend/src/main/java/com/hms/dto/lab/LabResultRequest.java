package com.hms.dto.lab;

import jakarta.validation.constraints.NotBlank;

public record LabResultRequest(@NotBlank String resultData, String remarks) {}
