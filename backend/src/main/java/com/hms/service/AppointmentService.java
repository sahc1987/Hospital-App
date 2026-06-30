package com.hms.service;

import com.hms.dto.appointment.AppointmentRequest;
import com.hms.entity.Appointment;
import com.hms.entity.Doctor;
import com.hms.entity.Patient;
import com.hms.entity.enums.AppointmentStatus;
import com.hms.exception.BadRequestException;
import com.hms.exception.ResourceNotFoundException;
import com.hms.repository.AppointmentRepository;
import com.hms.repository.DoctorRepository;
import com.hms.repository.PatientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AppointmentService {

    private final AppointmentRepository repo;
    private final PatientRepository patientRepo;
    private final DoctorRepository doctorRepo;

    @Transactional(readOnly = true)
    public Appointment findById(Long id) {
        return repo.findById(id).orElseThrow(() -> new ResourceNotFoundException("Appointment", id));
    }

    @Transactional(readOnly = true)
    public Page<Appointment> findAll(Pageable pageable) {
        return repo.findAll(pageable);
    }

    @Transactional(readOnly = true)
    public Page<Appointment> findByPatient(Long patientId, Pageable pageable) {
        return repo.findByPatientId(patientId, pageable);
    }

    @Transactional(readOnly = true)
    public List<Appointment> findTodayAppointments() {
        LocalDateTime start = LocalDate.now().atStartOfDay();
        return repo.findByDateRange(start, start.plusDays(1));
    }

    @Transactional
    @CacheEvict(value = "dashboard", allEntries = true)
    public Appointment create(AppointmentRequest request) {
        if (repo.existsByDoctorIdAndAppointmentDateAndStatusNot(
                request.doctorId(), request.appointmentDate(), AppointmentStatus.CANCELLED)) {
            throw new BadRequestException("Doctor already has an appointment at this time");
        }
        Patient patient = patientRepo.findById(request.patientId())
                .orElseThrow(() -> new ResourceNotFoundException("Patient", request.patientId()));
        Doctor doctor = doctorRepo.findById(request.doctorId())
                .orElseThrow(() -> new ResourceNotFoundException("Doctor", request.doctorId()));
        return repo.save(Appointment.builder()
                .patient(patient).doctor(doctor)
                .appointmentDate(request.appointmentDate()).reason(request.reason()).build());
    }

    @Transactional
    @CacheEvict(value = "dashboard", allEntries = true)
    public Appointment updateStatus(Long id, AppointmentStatus status, String notes) {
        Appointment apt = repo.findById(id).orElseThrow(() -> new ResourceNotFoundException("Appointment", id));
        apt.setStatus(status);
        if (notes != null) apt.setNotes(notes);
        return repo.save(apt);
    }

    @Transactional
    @CacheEvict(value = "dashboard", allEntries = true)
    public void delete(Long id) {
        if (!repo.existsById(id)) throw new ResourceNotFoundException("Appointment", id);
        repo.deleteById(id);
    }
}
