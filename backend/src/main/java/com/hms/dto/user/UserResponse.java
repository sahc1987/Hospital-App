package com.hms.dto.user;

import com.hms.entity.Doctor;
import com.hms.entity.Employee;
import com.hms.entity.User;
import com.hms.entity.enums.UserRole;

import java.time.LocalDateTime;

public record UserResponse(
        Long id,
        String username,
        String email,
        String fullName,
        UserRole role,
        boolean active,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        LinkedStaff linkedStaff
) {
    public record LinkedStaff(String type, Long id, String name) {}

    public static UserResponse from(User user) {
        return new UserResponse(user.getId(), user.getUsername(), user.getEmail(),
                user.getFullName(), user.getRole(), user.isActive(),
                user.getCreatedAt(), user.getUpdatedAt(), null);
    }

    public static UserResponse withDoctor(User user, Doctor doctor) {
        return new UserResponse(user.getId(), user.getUsername(), user.getEmail(),
                user.getFullName(), user.getRole(), user.isActive(),
                user.getCreatedAt(), user.getUpdatedAt(),
                new LinkedStaff("DOCTOR", doctor.getId(), doctor.getName()));
    }

    public static UserResponse withEmployee(User user, Employee employee) {
        return new UserResponse(user.getId(), user.getUsername(), user.getEmail(),
                user.getFullName(), user.getRole(), user.isActive(),
                user.getCreatedAt(), user.getUpdatedAt(),
                new LinkedStaff("EMPLOYEE", employee.getId(), employee.getName()));
    }
}
