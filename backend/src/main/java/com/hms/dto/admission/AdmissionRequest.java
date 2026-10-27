package com.hms.dto.admission;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record AdmissionRequest(
        @NotNull Long patientId,
        @NotNull Long doctorId,
        Long roomId,
        @PastOrPresent LocalDateTime admissionDate, // back-dating allowed (late entry), future is not
        String diagnosis,
        Long appointmentId                          // set when admitting from a consultation
) {
    public record Transfer(@NotNull Long roomId, String note) {}

    public record Discharge(@NotBlank String finalDiagnosis, @NotBlank String summary, String instructions) {}

    public record Note(@NotBlank String note) {}

    public record Vitals(
            @DecimalMin("25") @DecimalMax("45") BigDecimal tempC,
            @Min(40) @Max(300) Integer systolic, @Min(20) @Max(200) Integer diastolic,
            @Min(20) @Max(250) Integer pulse, @Min(4) @Max(80) Integer respRate,
            @Min(50) @Max(100) Integer spo2, @Min(0) @Max(10) Integer pain) {}

    public record MedOrder(@NotBlank String medication, String dosage, String route, String frequency, String instructions) {}

    public record Administration(@NotNull @Pattern(regexp = "GIVEN|HELD|REFUSED") String status, String note) {}
}
