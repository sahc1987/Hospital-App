package com.hms.repository;

import com.hms.entity.Employee;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface EmployeeRepository extends JpaRepository<Employee, Long> {
    Page<Employee> findByNameContainingIgnoreCase(String name, Pageable pageable);
    long countByDepartmentId(Long departmentId);
    Optional<Employee> findByUser_Id(Long userId);
    List<Employee> findByUser_IdIn(Collection<Long> userIds);
}
