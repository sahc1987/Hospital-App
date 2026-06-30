package com.hms.repository;

import com.hms.entity.Appointment;
import com.hms.entity.enums.AppointmentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.List;

public interface AppointmentRepository extends JpaRepository<Appointment, Long> {

    Page<Appointment> findByPatientId(Long patientId, Pageable pageable);
    Page<Appointment> findByDoctorId(Long doctorId, Pageable pageable);
    List<Appointment> findByStatus(AppointmentStatus status);

    @Query("SELECT a FROM Appointment a WHERE a.appointmentDate BETWEEN :start AND :end ORDER BY a.appointmentDate")
    List<Appointment> findByDateRange(LocalDateTime start, LocalDateTime end);

    long countByStatus(AppointmentStatus status);
    long countByAppointmentDateBetween(LocalDateTime start, LocalDateTime end);

    boolean existsByDoctorIdAndAppointmentDateAndStatusNot(Long doctorId, LocalDateTime date, AppointmentStatus status);
}
