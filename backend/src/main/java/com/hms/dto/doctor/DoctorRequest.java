package com.hms.dto.doctor;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record DoctorRequest(
        @NotBlank String name,
        String specialization,
        String phone,
        @Email String email,
        String licenseNumber,
        Long departmentId
) {}
