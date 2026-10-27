package com.hms.repository;

import com.hms.entity.Employee;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.lang.NonNull;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface EmployeeRepository extends JpaRepository<Employee, Long> {
    // Lazy relations serialize as null unless fetched; list views show the department.
    // `user` stays unfetched on purpose: it's an account, not employee data.
    @EntityGraph(attributePaths = {"department"})
    Page<Employee> findAll(@NonNull Pageable pageable);

    @EntityGraph(attributePaths = {"department"})
    Page<Employee> findByNameContainingIgnoreCase(String name, Pageable pageable);
    Optional<Employee> findByUser_Id(Long userId);
    List<Employee> findByUser_IdIn(Collection<Long> userIds);
}
