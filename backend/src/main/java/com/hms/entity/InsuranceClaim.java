package com.hms.entity;

import com.hms.entity.enums.ClaimStatus;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "insurance_claims")
@EntityListeners(AuditingEntityListener.class)
@Data @Builder @NoArgsConstructor @AllArgsConstructor
@EqualsAndHashCode(of = "id") @ToString(exclude = {"patient", "insuranceProvider", "bill"})
public class InsuranceClaim {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "insurance_provider_id", nullable = false)
    private InsuranceProvider insuranceProvider;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bill_id")
    private Bill bill;

    @Column(name = "claim_number", unique = true, length = 100)
    private String claimNumber;

    @Column(name = "claim_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal claimAmount;

    @Column(name = "approved_amount", precision = 12, scale = 2)
    private BigDecimal approvedAmount;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private ClaimStatus status = ClaimStatus.SUBMITTED;

    @Column(name = "claim_date", nullable = false)
    private LocalDateTime claimDate;

    @Column(name = "settled_date")
    private LocalDateTime settledDate;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @CreatedDate @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
