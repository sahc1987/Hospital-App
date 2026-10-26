package com.hms.repository;

import com.hms.entity.Department;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DepartmentRepository extends JpaRepository<Department, Long> {
    Page<Department> findAllByOrderByNameAsc(Pageable pageable);
    boolean existsByNameIgnoreCase(String name);
}
