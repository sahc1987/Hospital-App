package com.hms.service;

import com.hms.dto.dashboard.DashboardStats;
import com.hms.entity.enums.*;
import com.hms.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final PatientRepository patientRepo;
    private final AppointmentRepository appointmentRepo;
    private final AdmissionRepository admissionRepo;
    private final RoomRepository roomRepo;
    private final LabTestRepository labTestRepo;
    private final PharmacyItemRepository pharmacyRepo;
    private final BillRepository billRepo;
    private final DoctorRepository doctorRepo;
    private final EmployeeRepository employeeRepo;
    private final PayrollRepository payrollRepo;

    @Transactional(readOnly = true)
    @Cacheable(value = "dashboard", key = "'stats'")
    public DashboardStats getStats() {
        LocalDateTime todayStart = LocalDate.now().atStartOfDay();
        LocalDateTime todayEnd = todayStart.plusDays(1);
        BigDecimal monthRevenue = billRepo.sumRevenueByDateRange(
                LocalDate.now().withDayOfMonth(1).atStartOfDay(),
                LocalDate.now().atTime(23, 59, 59));

        return new DashboardStats(
                patientRepo.count(),
                appointmentRepo.countByAppointmentDateBetween(todayStart, todayEnd),
                admissionRepo.countByStatus(AdmissionStatus.ADMITTED),
                roomRepo.countByStatus(RoomStatus.AVAILABLE),
                labTestRepo.countByStatus(LabTestStatus.ORDERED) + labTestRepo.countByStatus(LabTestStatus.IN_PROGRESS),
                pharmacyRepo.countLowStock(),
                billRepo.countByStatus(BillStatus.PENDING),
                monthRevenue != null ? monthRevenue : BigDecimal.ZERO,
                doctorRepo.count(),
                employeeRepo.count()
        );
    }
}
