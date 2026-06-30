package com.hms.dto.patient;

import com.hms.entity.enums.Gender;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

import java.time.LocalDate;

public record PatientRequest(
        @NotBlank String name,
        LocalDate dob,
        Gender gender,
        String phone,
        @Email String email,
        String address,
        String bloodGroup
) {}
