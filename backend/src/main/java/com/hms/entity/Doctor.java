package com.hms.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "doctors")
@EntityListeners(AuditingEntityListener.class)
@Data @Builder @NoArgsConstructor @AllArgsConstructor
@EqualsAndHashCode(of = "id") @ToString(exclude = {"department", "user"})
public class Doctor {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id")
    private Department department;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @NotBlank
    @Column(nullable = false, length = 150)
    private String name;

    @Column(length = 100)
    private String specialization;

    @Column(length = 20)
    private String phone;

    @Column(unique = true, length = 100)
    private String email;

    @Column(name = "license_number", length = 50)
    private String licenseNumber;

    // Working hours: bookable slots are [workStart, workEnd) every slotMinutes on workDays
    @Builder.Default @Column(name = "work_start", nullable = false)
    private LocalTime workStart = LocalTime.of(9, 0);

    @Builder.Default @Column(name = "work_end", nullable = false)
    private LocalTime workEnd = LocalTime.of(17, 0);

    @Builder.Default @Column(name = "slot_minutes", nullable = false)
    private int slotMinutes = 30;

    /** Comma-separated DayOfWeek prefixes, e.g. "MON,TUE,WED,THU,FRI". */
    @Builder.Default @Column(name = "work_days", nullable = false, length = 30)
    private String workDays = "MON,TUE,WED,THU,FRI";

    /** Billed automatically when a visit is completed; 0 = no bill. */
    @Builder.Default @Column(name = "consultation_fee", nullable = false, precision = 10, scale = 2)
    private BigDecimal consultationFee = BigDecimal.ZERO;

    public boolean worksOn(DayOfWeek day) {
        return workDays.contains(day.name().substring(0, 3));
    }

    @CreatedDate @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
