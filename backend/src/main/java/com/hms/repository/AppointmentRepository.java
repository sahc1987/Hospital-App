package com.hms.repository;

import com.hms.entity.Appointment;
import com.hms.entity.enums.AppointmentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.lang.NonNull;

import java.time.LocalDateTime;
import java.util.List;

public interface AppointmentRepository extends JpaRepository<Appointment, Long>, JpaSpecificationExecutor<Appointment> {

    // Lazy relations serialize as null unless fetched; every view shows patient + doctor
    @EntityGraph(attributePaths = {"patient", "doctor"})
    Page<Appointment> findAll(@NonNull Pageable pageable);

    @EntityGraph(attributePaths = {"patient", "doctor"})
    Page<Appointment> findAll(Specification<Appointment> spec, @NonNull Pageable pageable);

    @EntityGraph(attributePaths = {"patient", "doctor"})
    Page<Appointment> findByPatientId(Long patientId, Pageable pageable);

    Page<Appointment> findByDoctorId(Long doctorId, Pageable pageable);
    List<Appointment> findByStatus(AppointmentStatus status);

    @EntityGraph(attributePaths = {"patient", "doctor"})
    @Query("SELECT a FROM Appointment a WHERE a.appointmentDate BETWEEN :start AND :end ORDER BY a.appointmentDate")
    List<Appointment> findByDateRange(LocalDateTime start, LocalDateTime end);

    long countByStatus(AppointmentStatus status);
    long countByAppointmentDateBetween(LocalDateTime start, LocalDateTime end);

    /** Active bookings of one doctor starting in [from, to) — used to compute free slots. */
    @Query("SELECT a FROM Appointment a WHERE a.doctor.id = :doctorId AND a.appointmentDate >= :from "
            + "AND a.appointmentDate < :to AND a.status NOT IN :inactive")
    List<Appointment> findActiveForDoctor(Long doctorId, LocalDateTime from, LocalDateTime to,
                                          List<AppointmentStatus> inactive);

    // Interval overlap [start, end) against each active booking's own frozen duration.
    @Query(value = "SELECT EXISTS (SELECT 1 FROM appointments WHERE doctor_id = :doctorId AND id <> :excludeId "
            + "AND status NOT IN ('CANCELLED','NO_SHOW') AND appointment_date < :end "
            + "AND appointment_date + duration_minutes * INTERVAL '1 minute' > :start)", nativeQuery = true)
    boolean doctorBusy(Long doctorId, LocalDateTime start, LocalDateTime end, long excludeId);

    @Query(value = "SELECT EXISTS (SELECT 1 FROM appointments WHERE patient_id = :patientId AND id <> :excludeId "
            + "AND status NOT IN ('CANCELLED','NO_SHOW') AND appointment_date < :end "
            + "AND appointment_date + duration_minutes * INTERVAL '1 minute' > :start)", nativeQuery = true)
    boolean patientBusy(Long patientId, LocalDateTime start, LocalDateTime end, long excludeId);
}
