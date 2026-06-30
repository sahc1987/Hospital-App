package com.hms.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "lab_results")
@EntityListeners(AuditingEntityListener.class)
@Data @Builder @NoArgsConstructor @AllArgsConstructor
@EqualsAndHashCode(of = "id") @ToString(exclude = {"labTest", "technician"})
public class LabResult {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "lab_test_id", nullable = false)
    private LabTest labTest;

    @Column(name = "result_data", columnDefinition = "TEXT")
    private String resultData;

    @Column(name = "result_file", length = 500)
    private String resultFile;

    @Column(name = "result_date", nullable = false)
    private LocalDateTime resultDate;

    @Column(columnDefinition = "TEXT")
    private String remarks;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "technician_id")
    private User technician;

    @CreatedDate @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
