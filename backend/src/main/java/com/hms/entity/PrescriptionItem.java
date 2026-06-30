package com.hms.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "prescription_items")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
@EqualsAndHashCode(of = "id") @ToString(exclude = "prescription")
public class PrescriptionItem {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "prescription_id", nullable = false)
    private Prescription prescription;

    @Column(nullable = false, length = 200)
    private String medication;

    @Column(length = 100)
    private String dosage;

    @Column(length = 100)
    private String frequency;

    @Column(length = 100)
    private String duration;

    @Column(columnDefinition = "TEXT")
    private String instructions;
}
