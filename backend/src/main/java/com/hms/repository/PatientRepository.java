package com.hms.repository;

import com.hms.entity.Patient;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PatientRepository extends JpaRepository<Patient, Long> {

    @Query("SELECT p FROM Patient p WHERE " +
           "LOWER(p.name) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "LOWER(p.phone) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "LOWER(p.email) LIKE LOWER(CONCAT('%', :q, '%'))")
    Page<Patient> search(@Param("q") String q, Pageable pageable);
}
