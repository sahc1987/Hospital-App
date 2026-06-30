package com.hms.service;

import com.hms.dto.admission.AdmissionRequest;
import com.hms.entity.Admission;
import com.hms.entity.enums.AdmissionStatus;
import com.hms.entity.enums.RoomStatus;
import com.hms.exception.BadRequestException;
import com.hms.exception.ResourceNotFoundException;
import com.hms.repository.AdmissionRepository;
import com.hms.repository.DoctorRepository;
import com.hms.repository.PatientRepository;
import com.hms.repository.RoomRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AdmissionService {

    private final AdmissionRepository admissionRepo;
    private final PatientRepository patientRepo;
    private final DoctorRepository doctorRepo;
    private final RoomRepository roomRepo;

    @Transactional(readOnly = true)
    public Page<Admission> findAll(Pageable pageable) {
        return admissionRepo.findAll(pageable);
    }

    @Transactional(readOnly = true)
    public Admission findById(Long id) {
        return admissionRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Admission", id));
    }

    @Transactional(readOnly = true)
    public Page<Admission> findByPatient(Long patientId, Pageable pageable) {
        return admissionRepo.findByPatientId(patientId, pageable);
    }

    @Transactional
    @CacheEvict(value = "dashboard", allEntries = true)
    public Admission admit(AdmissionRequest request) {
        var patient = patientRepo.findById(request.patientId())
                .orElseThrow(() -> new ResourceNotFoundException("Patient", request.patientId()));
        var doctor = doctorRepo.findById(request.doctorId())
                .orElseThrow(() -> new ResourceNotFoundException("Doctor", request.doctorId()));

        var builder = Admission.builder()
                .patient(patient)
                .doctor(doctor)
                .admissionDate(request.admissionDate() != null ? request.admissionDate() : LocalDateTime.now())
                .diagnosis(request.diagnosis());

        if (request.roomId() != null) {
            var room = roomRepo.findById(request.roomId())
                    .orElseThrow(() -> new ResourceNotFoundException("Room", request.roomId()));
            if (room.getStatus() != RoomStatus.AVAILABLE) {
                throw new BadRequestException("Room " + room.getRoomNumber() + " is not available");
            }
            room.setStatus(RoomStatus.OCCUPIED);
            roomRepo.save(room);
            builder.room(room);
        }

        return admissionRepo.save(builder.build());
    }

    @Transactional
    @CacheEvict(value = "dashboard", allEntries = true)
    public Admission discharge(Long id) {
        Admission admission = admissionRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Admission", id));
        if (admission.getStatus() == AdmissionStatus.DISCHARGED) {
            throw new BadRequestException("Patient is already discharged");
        }
        admission.setStatus(AdmissionStatus.DISCHARGED);
        admission.setDischargeDate(LocalDateTime.now());

        if (admission.getRoom() != null) {
            var room = admission.getRoom();
            room.setStatus(RoomStatus.AVAILABLE);
            roomRepo.save(room);
        }

        return admissionRepo.save(admission);
    }
}
