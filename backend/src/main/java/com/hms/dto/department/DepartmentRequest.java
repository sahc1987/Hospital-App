package com.hms.dto.department;

import jakarta.validation.constraints.NotBlank;

public record DepartmentRequest(
        @NotBlank String name,
        String description
) {}
