package com.hms.dto.employee;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public record EmployeeRequest(
        @NotBlank String name,
        @NotBlank String role,
        String phone,
        String email,
        @NotNull LocalDate hireDate,
        Long departmentId,
        String address) {}
