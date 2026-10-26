package com.hms.service;

import com.hms.dto.billing.BillRequest;
import com.hms.entity.Bill;
import com.hms.entity.enums.BillStatus;
import com.hms.exception.BadRequestException;
import com.hms.exception.ResourceNotFoundException;
import com.hms.repository.AdmissionRepository;
import com.hms.repository.AppointmentRepository;
import com.hms.repository.BillRepository;
import com.hms.repository.PatientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class BillingService {

    private final BillRepository billRepo;
    private final PatientRepository patientRepo;
    private final AdmissionRepository admissionRepo;
    private final AppointmentRepository appointmentRepo;

    @Transactional(readOnly = true)
    public Page<Bill> findAll(Pageable pageable) {
        return billRepo.findAll(pageable);
    }

    @Transactional(readOnly = true)
    public Bill findById(Long id) {
        return billRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Bill", id));
    }

    @Transactional(readOnly = true)
    public Page<Bill> findByPatient(Long patientId, Pageable pageable) {
        return billRepo.findByPatientId(patientId, pageable);
    }

    @Transactional
    @CacheEvict(value = "dashboard", allEntries = true)
    public Bill create(BillRequest request) {
        var patient = patientRepo.findById(request.patientId())
                .orElseThrow(() -> new ResourceNotFoundException("Patient", request.patientId()));

        var builder = Bill.builder()
                .patient(patient)
                .billDate(LocalDateTime.now())
                .totalAmount(request.totalAmount() != null ? request.totalAmount() : BigDecimal.ZERO)
                .discount(request.discount() != null ? request.discount() : BigDecimal.ZERO)
                .dueDate(request.dueDate())
                .notes(request.notes());

        if (request.admissionId() != null) {
            var admission = admissionRepo.findById(request.admissionId())
                    .orElseThrow(() -> new ResourceNotFoundException("Admission", request.admissionId()));
            builder.admission(admission);
        }

        if (request.appointmentId() != null) {
            var appointment = appointmentRepo.findById(request.appointmentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Appointment", request.appointmentId()));
            builder.appointment(appointment);
        }

        return billRepo.save(builder.build());
    }

    @Transactional
    @CacheEvict(value = "dashboard", allEntries = true)
    public Bill recordPayment(Long id, BigDecimal amount) {
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BadRequestException("Payment amount must be positive");
        }
        Bill bill = billRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Bill", id));
        if (bill.getStatus() == BillStatus.PAID || bill.getStatus() == BillStatus.CANCELLED) {
            throw new BadRequestException("Cannot record payment for a " + bill.getStatus() + " bill");
        }

        BigDecimal outstanding = bill.getTotalAmount()
                .subtract(bill.getDiscount())
                .subtract(bill.getPaidAmount());
        if (amount.compareTo(outstanding) > 0) {
            throw new BadRequestException("Payment exceeds outstanding balance of " + outstanding);
        }

        bill.setPaidAmount(bill.getPaidAmount().add(amount));
        outstanding = outstanding.subtract(amount);

        bill.setStatus(outstanding.compareTo(BigDecimal.ZERO) <= 0 ? BillStatus.PAID : BillStatus.PARTIAL);

        return billRepo.save(bill);
    }
}
