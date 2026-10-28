package com.hms.repository;

import com.hms.entity.LabTest;
import com.hms.entity.enums.LabTestStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.lang.NonNull;

import java.util.Collection;

public interface LabTestRepository extends JpaRepository<LabTest, Long> {
    // Lazy relations serialize as null unless fetched; list views show patient + doctor
    @EntityGraph(attributePaths = {"patient", "doctor"})
    Page<LabTest> findAll(@NonNull Pageable pageable);

    @EntityGraph(attributePaths = {"patient", "doctor"})
    Page<LabTest> findByPatientId(Long patientId, Pageable pageable);
    @EntityGraph(attributePaths = {"patient", "doctor"})
    Page<LabTest> findByStatusIn(Collection<LabTestStatus> statuses, Pageable pageable);
    long countByStatus(LabTestStatus status);
}
