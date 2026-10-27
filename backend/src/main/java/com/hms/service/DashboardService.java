package com.hms.service;

import com.hms.dto.dashboard.DashboardStats;
import com.hms.dto.dashboard.DashboardTrends;
import com.hms.entity.enums.*;
import com.hms.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@SuppressWarnings("java:S8688") // now() is hospital wall-clock time: the JVM zone *is* the hospital zone (TZ, see CLAUDE.md)
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
    private final JdbcTemplate jdbc;

    private static final long TREND_DAYS = 7;

    // ponytail: uncached — 3 small GROUP BY queries; cache it (with mutable lists, Redis Jackson can't
    // rebuild List.of/toList) if the dashboard poll ever shows up in DB load
    @Transactional(readOnly = true)
    public DashboardTrends getTrends() {
        LocalDate first = LocalDate.now().minusDays(TREND_DAYS - 1);
        List<LocalDate> days = first.datesUntil(first.plusDays(TREND_DAYS)).toList();
        return new DashboardTrends(days,
                daily("admissions", "admission_date", days),
                daily("appointments", "appointment_date", days),
                daily("lab_tests", "ordered_date", days));
    }

    // table/column are compile-time constants from getTrends(), never user input
    private List<Long> daily(String table, String column, List<LocalDate> days) {
        Map<LocalDate, Long> counts = new HashMap<>();
        jdbc.query("SELECT CAST(" + column + " AS DATE) d, COUNT(*) n FROM " + table
                        + " WHERE " + column + " >= ? GROUP BY d",
                (org.springframework.jdbc.core.RowCallbackHandler) rs -> counts.put(rs.getDate("d").toLocalDate(), rs.getLong("n")),
                days.get(0).atStartOfDay());
        return days.stream().map(d -> counts.getOrDefault(d, 0L)).toList();
    }

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
                roomRepo.countByStatus(RoomStatus.OCCUPIED),
                roomRepo.count(),
                labTestRepo.countByStatus(LabTestStatus.ORDERED) + labTestRepo.countByStatus(LabTestStatus.IN_PROGRESS),
                pharmacyRepo.countLowStock(),
                billRepo.countByStatus(BillStatus.PENDING),
                monthRevenue != null ? monthRevenue : BigDecimal.ZERO,
                doctorRepo.count(),
                employeeRepo.count()
        );
    }
}
