package com.hms.repository;

import com.hms.entity.Doctor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.lang.NonNull;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface DoctorRepository extends JpaRepository<Doctor, Long> {

    @NonNull
    @EntityGraph(attributePaths = {"department"})
    Page<Doctor> findAll(@NonNull Pageable pageable);

    @EntityGraph(attributePaths = {"department"})
    Page<Doctor> findByNameContainingIgnoreCase(String name, Pageable pageable);

    @EntityGraph(attributePaths = {"department"})
    List<Doctor> findByDepartmentId(Long departmentId);

    long countByDepartmentId(Long departmentId);

    Optional<Doctor> findByUser_Id(Long userId);

    List<Doctor> findByUser_IdIn(Collection<Long> userIds);
}
