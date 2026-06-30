package com.hms.repository;

import com.hms.entity.Doctor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface DoctorRepository extends JpaRepository<Doctor, Long> {

    @EntityGraph(attributePaths = {"department"})
    Page<Doctor> findAll(Pageable pageable);

    @EntityGraph(attributePaths = {"department"})
    Page<Doctor> findByNameContainingIgnoreCase(String name, Pageable pageable);

    @EntityGraph(attributePaths = {"department"})
    List<Doctor> findByDepartmentId(Long departmentId);

    long countByDepartmentId(Long departmentId);
}
