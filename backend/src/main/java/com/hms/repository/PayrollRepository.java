package com.hms.repository;

import com.hms.entity.Payroll;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.math.BigDecimal;
import java.util.Optional;

public interface PayrollRepository extends JpaRepository<Payroll, Long> {
    Page<Payroll> findByEmployeeId(Long employeeId, Pageable pageable);
    Optional<Payroll> findByEmployeeIdAndMonth(Long employeeId, String month);

    @Query("SELECT COALESCE(SUM(p.netSalary), 0) FROM Payroll p WHERE p.month = :month")
    BigDecimal sumNetSalaryByMonth(String month);
}
