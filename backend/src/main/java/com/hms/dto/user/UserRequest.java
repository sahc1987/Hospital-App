package com.hms.dto.user;

import com.hms.entity.enums.UserRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

public record UserRequest(
        @NotBlank(message = "Username is required")
        @Size(min = 3, max = 50, message = "Username must be 3–50 characters")
        String username,

        @Size(min = 8, message = "Password must be at least 8 characters")
        String password,

        @NotBlank(message = "Email is required")
        @Email(message = "Invalid email address")
        String email,

        @NotBlank(message = "Full name is required")
        String fullName,

        @NotNull(message = "Role is required")
        UserRole role,

        // Optional — used only during creation to auto-create the linked staff record
        String specialization,
        String licenseNumber,
        String phone,
        Long departmentId,
        LocalDate hireDate
) {}
