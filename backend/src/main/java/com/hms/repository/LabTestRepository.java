package com.hms.repository;

import com.hms.entity.LabTest;
import com.hms.entity.enums.LabTestStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LabTestRepository extends JpaRepository<LabTest, Long> {
    Page<LabTest> findByPatientId(Long patientId, Pageable pageable);
    Page<LabTest> findByStatus(LabTestStatus status, Pageable pageable);
    long countByStatus(LabTestStatus status);
}
