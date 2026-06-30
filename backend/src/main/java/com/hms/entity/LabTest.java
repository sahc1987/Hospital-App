package com.hms.entity;

import com.hms.entity.enums.LabTestStatus;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "lab_tests")
@EntityListeners(AuditingEntityListener.class)
@Data @Builder @NoArgsConstructor @AllArgsConstructor
@EqualsAndHashCode(of = "id") @ToString(exclude = {"patient", "doctor", "result"})
public class LabTest {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "doctor_id")
    private Doctor doctor;

    @Column(name = "test_name", nullable = false, length = 200)
    private String testName;

    @Column(name = "ordered_date", nullable = false)
    private LocalDateTime orderedDate;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private LabTestStatus status = LabTestStatus.ORDERED;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @OneToOne(mappedBy = "labTest", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private LabResult result;

    @CreatedDate @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
