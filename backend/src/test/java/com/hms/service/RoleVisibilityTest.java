package com.hms.service;

import com.hms.entity.Admission;
import com.hms.entity.Appointment;
import com.hms.entity.User;
import com.hms.entity.enums.AdmissionStatus;
import com.hms.entity.enums.UserRole;
import com.hms.repository.*;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Front-desk roles must never receive clinical text; clinical roles must. (Caught the review's two leaks.) */
class RoleVisibilityTest {

    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final User desk = User.builder().id(1L).username("desk").role(UserRole.RECEPTIONIST).build();
    private final User nurse = User.builder().id(2L).username("nurse").role(UserRole.NURSE).build();
    private static final Timestamp T = Timestamp.valueOf(LocalDateTime.of(2026, 10, 1, 9, 0));

    private static Map<String, Object> row(Object... kv) {
        Map<String, Object> m = new HashMap<>();
        for (int i = 0; i < kv.length; i += 2) m.put((String) kv[i], kv[i + 1]);
        return m;
    }

    @Test
    void stayTimelineHidesClinicalNotesFromFrontDesk() {
        AdmissionRepository repo = mock(AdmissionRepository.class);
        Admission a = Admission.builder().id(1L).status(AdmissionStatus.DISCHARGED)
                .admissionDate(LocalDateTime.of(2026, 10, 1, 9, 0)).dischargeDate(LocalDateTime.of(2026, 10, 3, 9, 0))
                .finalDiagnosis("SECRET-DX").build();
        when(repo.findById(1L)).thenReturn(Optional.of(a));
        AdmissionService service = new AdmissionService(repo, mock(PatientRepository.class), mock(DoctorRepository.class),
                mock(RoomRepository.class), mock(AppointmentRepository.class), mock(BillingService.class), jdbc);
        // fresh rows per call: the service mutates them
        when(jdbc.queryForList(contains("LEFT JOIN rooms fr"), eq(1L))).thenAnswer(i -> new ArrayList<>(List.of(
                row("type", "ADMITTED", "note", "admit dx", "created_at", T),
                row("type", "TRANSFER", "note", "SECRET-REASON", "created_at", T),
                row("type", "NOTE", "note", "SECRET-PROGRESS", "created_at", T),
                row("type", "DISCHARGED", "note", "SECRET-DX", "created_at", T))));

        String forDesk = service.stayRecord(desk, 1L).toString();
        assertFalse(forDesk.contains("SECRET"), forDesk);
        assertTrue(forDesk.contains("TRANSFER"), "movements stay visible");

        String forNurse = service.stayRecord(nurse, 1L).toString();
        assertTrue(forNurse.contains("SECRET-DX") && forNurse.contains("SECRET-PROGRESS"));
    }

    @Test
    void appointmentHistoryHidesAddendaFromFrontDesk() {
        AppointmentRepository repo = mock(AppointmentRepository.class);
        when(repo.findById(5L)).thenReturn(Optional.of(new Appointment()));
        AppointmentService service = new AppointmentService(repo, mock(PatientRepository.class), mock(DoctorRepository.class),
                jdbc, mock(BillingService.class));
        when(jdbc.queryForList(contains("appointment_history"), eq(5L))).thenAnswer(i -> new ArrayList<>(List.of(
                row("action", "STATUS", "note", "confirmed", "changed_at", T),
                row("action", "ADDENDUM", "note", "SECRET-ADDENDUM", "changed_at", T))));

        assertFalse(service.history(desk, 5L).toString().contains("SECRET"));
        assertTrue(service.history(nurse, 5L).toString().contains("SECRET-ADDENDUM"));
    }
}
