package com.hms.repository;

import com.hms.entity.Payroll;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.lang.NonNull;
import java.util.Optional;

public interface PayrollRepository extends JpaRepository<Payroll, Long> {
    // Lazy relations serialize as null unless fetched; list views show the employee
    @EntityGraph(attributePaths = {"employee"})
    Page<Payroll> findAll(@NonNull Pageable pageable);

    @EntityGraph(attributePaths = {"employee"})
    Page<Payroll> findByEmployeeId(Long employeeId, Pageable pageable);
    Optional<Payroll> findByEmployeeIdAndMonth(Long employeeId, String month);
}
