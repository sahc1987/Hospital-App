package com.hms.repository;

import com.hms.entity.Bill;
import com.hms.entity.enums.BillStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public interface BillRepository extends JpaRepository<Bill, Long> {
    Page<Bill> findByPatientId(Long patientId, Pageable pageable);
    Page<Bill> findByStatus(BillStatus status, Pageable pageable);

    @Query("SELECT COALESCE(SUM(b.totalAmount), 0) FROM Bill b WHERE b.billDate BETWEEN :start AND :end")
    BigDecimal sumRevenueByDateRange(LocalDateTime start, LocalDateTime end);

    long countByStatus(BillStatus status);
}
