package com.hms.dto.doctor;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

import java.math.BigDecimal;
import java.time.LocalTime;

public record DoctorRequest(
        @NotBlank String name,
        String specialization,
        String phone,
        @Email String email,
        String licenseNumber,
        Long departmentId,
        LocalTime workStart,
        LocalTime workEnd,
        @Min(5) @Max(240) Integer slotMinutes,
        @Pattern(regexp = "^(MON|TUE|WED|THU|FRI|SAT|SUN)(,(MON|TUE|WED|THU|FRI|SAT|SUN))*$",
                message = "use comma-separated MON..SUN")
        String workDays,
        @DecimalMin("0") BigDecimal consultationFee
) {
    // Defaults so older clients (and MapStruct, which copies nulls) never write NULL hours
    public DoctorRequest {
        if (workStart == null) workStart = LocalTime.of(9, 0);
        if (workEnd == null) workEnd = LocalTime.of(17, 0);
        if (slotMinutes == null) slotMinutes = 30;
        if (workDays == null || workDays.isBlank()) workDays = "MON,TUE,WED,THU,FRI";
        if (consultationFee == null) consultationFee = BigDecimal.ZERO;
    }
}
