package com.hms.repository;

import com.hms.entity.InsuranceClaim;
import com.hms.entity.enums.ClaimStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InsuranceClaimRepository extends JpaRepository<InsuranceClaim, Long> {
    Page<InsuranceClaim> findByPatientId(Long patientId, Pageable pageable);
    Page<InsuranceClaim> findByStatus(ClaimStatus status, Pageable pageable);
    long countByStatus(ClaimStatus status);
}
