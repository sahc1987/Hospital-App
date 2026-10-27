package com.hms.repository;

import com.hms.entity.Admission;
import com.hms.entity.enums.AdmissionStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.lang.NonNull;
import java.util.List;
import java.util.Optional;

public interface AdmissionRepository extends JpaRepository<Admission, Long> {
    // Lazy relations serialize as null unless fetched; list views show patient, doctor and room
    @EntityGraph(attributePaths = {"patient", "doctor", "room"})
    Page<Admission> findAll(@NonNull Pageable pageable);

    @EntityGraph(attributePaths = {"patient", "doctor", "room"})
    Page<Admission> findByPatientId(Long patientId, Pageable pageable);
    @EntityGraph(attributePaths = {"patient", "doctor", "room"})
    Page<Admission> findAllByStatus(AdmissionStatus status, Pageable pageable);

    // GET /admissions/{id} (ward board opens stays by id) needs the same relations as the lists
    @EntityGraph(attributePaths = {"patient", "doctor", "room"})
    Optional<Admission> findById(@NonNull Long id);

    List<Admission> findByStatus(AdmissionStatus status);
    long countByRoomIdAndStatus(Long roomId, AdmissionStatus status);
    boolean existsByPatientIdAndStatus(Long patientId, AdmissionStatus status);
    long countByStatus(AdmissionStatus status);
}
