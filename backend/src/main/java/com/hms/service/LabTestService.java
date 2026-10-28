package com.hms.service;

import com.hms.dto.lab.LabResultRequest;
import com.hms.dto.lab.LabTestRequest;
import com.hms.entity.Doctor;
import com.hms.entity.LabResult;
import com.hms.entity.LabTest;
import com.hms.entity.Patient;
import com.hms.entity.enums.LabTestStatus;
import com.hms.exception.BadRequestException;
import com.hms.exception.ResourceNotFoundException;
import com.hms.repository.DoctorRepository;
import com.hms.repository.LabResultRepository;
import com.hms.repository.LabTestRepository;
import com.hms.repository.PatientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@SuppressWarnings("java:S8688") // now() is hospital wall-clock time: the JVM zone *is* the hospital zone (TZ, see CLAUDE.md)
public class LabTestService {

    private final LabTestRepository labTestRepo;
    private final LabResultRepository labResultRepo;
    private final PatientRepository patientRepo;
    private final DoctorRepository doctorRepo;

    @Transactional(readOnly = true)
    public Page<LabTest> findAll(List<LabTestStatus> status, Pageable pageable) {
        return status == null || status.isEmpty() ? labTestRepo.findAll(pageable) : labTestRepo.findByStatusIn(status, pageable);
    }

    @Transactional(readOnly = true)
    public LabTest findById(Long id) {
        return labTestRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("LabTest", id));
    }

    @Transactional(readOnly = true)
    public Page<LabTest> findByPatient(Long patientId, Pageable pageable) {
        return labTestRepo.findByPatientId(patientId, pageable);
    }

    @Transactional
    public LabTest create(LabTestRequest request) {
        Patient patient = patientRepo.findById(request.patientId())
                .orElseThrow(() -> new ResourceNotFoundException("Patient", request.patientId()));

        Doctor doctor = null;
        if (request.doctorId() != null) {
            doctor = doctorRepo.findById(request.doctorId())
                    .orElseThrow(() -> new ResourceNotFoundException("Doctor", request.doctorId()));
        }

        LabTest test = LabTest.builder()
                .patient(patient)
                .doctor(doctor)
                .testName(request.testName())
                .orderedDate(LocalDateTime.now())
                .notes(request.notes())
                .appointmentId(request.appointmentId())
                .build();
        return labTestRepo.save(test);
    }

    @Transactional
    public LabTest updateStatus(Long id, LabTestStatus status) {
        LabTest test = findById(id);
        test.setStatus(status);
        return labTestRepo.save(test);
    }

    @Transactional
    public LabTest submitResult(Long id, LabResultRequest request) {
        LabTest test = findById(id);
        if (test.getResult() != null) {
            throw new BadRequestException("Lab test already has a result");
        }
        LabResult result = LabResult.builder()
                .labTest(test)
                .resultData(request.resultData())
                .remarks(request.remarks())
                .resultDate(LocalDateTime.now())
                .build();
        labResultRepo.save(result);
        test.setStatus(LabTestStatus.COMPLETED);
        return labTestRepo.save(test);
    }
}
