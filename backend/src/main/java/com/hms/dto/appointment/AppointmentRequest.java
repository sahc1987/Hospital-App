package com.hms.dto.appointment;

import com.hms.entity.enums.AppointmentStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;

// Future/working-hours/slot checks live in AppointmentService (they need the doctor and "now" in hospital time)
public record AppointmentRequest(
        @NotNull Long patientId,
        @NotNull Long doctorId,
        @NotNull LocalDateTime appointmentDate,
        String reason
) {
    /** PATCH /{id}: any null field is left unchanged. A new date is a reschedule. */
    public record Update(LocalDateTime appointmentDate, String reason, String notes) {}

    /** PATCH /{id}/status. `note` is required when cancelling (stored as the cancel reason). */
    public record StatusChange(@NotNull AppointmentStatus status, String note) {}

    /** PUT /{id}/visit — the doctor's documentation, editable until the visit is completed. */
    public record Visit(String diagnosis, String visitNote) {}

    /** One medication line of the visit's prescription. */
    public record RxItem(@NotBlank String medication, String dosage, String frequency, String duration, String instructions) {}

    /** POST /{id}/addendum — correction/extra info added after completion (the original stays). */
    public record Addendum(@NotBlank String note) {}
}
