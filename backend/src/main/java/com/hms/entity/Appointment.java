package com.hms.entity;

import com.hms.entity.enums.AppointmentStatus;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "appointments")
@EntityListeners(AuditingEntityListener.class)
@Data @Builder @NoArgsConstructor @AllArgsConstructor
@EqualsAndHashCode(of = "id") @ToString(exclude = {"patient", "doctor"})
public class Appointment {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "doctor_id", nullable = false)
    private Doctor doctor;

    @Column(name = "appointment_date", nullable = false)
    private LocalDateTime appointmentDate;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private AppointmentStatus status = AppointmentStatus.SCHEDULED;

    @Column(columnDefinition = "TEXT")
    private String reason;

    @Column(columnDefinition = "TEXT")
    private String notes;

    /** Frozen at booking (doctor's slot length then), so later config changes don't move overlaps. */
    @Builder.Default @Column(name = "duration_minutes", nullable = false)
    private int durationMinutes = 30;

    @Column(name = "cancel_reason", columnDefinition = "TEXT")
    private String cancelReason;

    // Clinical record: hidden from the general appointment JSON (front desk can read that);
    // served by GET /api/appointments/{id}/visit to clinical roles only.
    @JsonIgnore @Column(columnDefinition = "TEXT")
    private String diagnosis;

    @JsonIgnore @Column(name = "visit_note", columnDefinition = "TEXT")
    private String visitNote;

    // Timings (not sensitive; lets the desk see waiting vs. in-room and how long)
    @Column(name = "checked_in_at") private LocalDateTime checkedInAt;
    @Column(name = "started_at")    private LocalDateTime startedAt;
    @Column(name = "completed_at")  private LocalDateTime completedAt;

    public LocalDateTime getEndDate() {
        return appointmentDate.plusMinutes(durationMinutes);
    }

    @CreatedDate @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
