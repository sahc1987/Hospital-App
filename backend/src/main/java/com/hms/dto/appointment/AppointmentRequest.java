package com.hms.dto.appointment;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;

public record AppointmentRequest(
        @NotNull Long patientId,
        @NotNull Long doctorId,
        @NotNull @Future LocalDateTime appointmentDate,
        String reason
) {}
