package com.hms.repository;

import com.hms.entity.Admission;
import com.hms.entity.enums.AdmissionStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.lang.NonNull;
import java.util.List;

public interface AdmissionRepository extends JpaRepository<Admission, Long> {
    // Lazy relations serialize as null unless fetched; list views show patient, doctor and room
    @EntityGraph(attributePaths = {"patient", "doctor", "room"})
    Page<Admission> findAll(@NonNull Pageable pageable);

    @EntityGraph(attributePaths = {"patient", "doctor", "room"})
    Page<Admission> findByPatientId(Long patientId, Pageable pageable);
    List<Admission> findByStatus(AdmissionStatus status);
    long countByStatus(AdmissionStatus status);
    boolean existsByRoomIdAndStatus(Long roomId, AdmissionStatus status);
}
