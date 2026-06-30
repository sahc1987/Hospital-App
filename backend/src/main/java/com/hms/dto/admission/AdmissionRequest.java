package com.hms.dto.admission;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;

public record AdmissionRequest(
        @NotNull Long patientId,
        @NotNull Long doctorId,
        Long roomId,
        LocalDateTime admissionDate,
        String diagnosis) {}
