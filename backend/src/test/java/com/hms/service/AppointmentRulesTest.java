package com.hms.service;

import com.hms.dto.appointment.AppointmentRequest;
import com.hms.entity.Doctor;
import com.hms.entity.Patient;
import com.hms.entity.User;
import com.hms.entity.enums.UserRole;
import com.hms.exception.BadRequestException;
import com.hms.repository.AppointmentRepository;
import com.hms.repository.DoctorRepository;
import com.hms.repository.PatientRepository;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.TemporalAdjusters;
import java.util.Optional;

import static com.hms.entity.enums.AppointmentStatus.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class AppointmentRulesTest {

    private final AppointmentRepository repo = mock(AppointmentRepository.class);
    private final DoctorRepository doctors = mock(DoctorRepository.class);
    private final PatientRepository patients = mock(PatientRepository.class);
    private final AppointmentService service = new AppointmentService(repo, patients, doctors, mock(JdbcTemplate.class), mock(BillingService.class));

    private final Doctor doc = Doctor.builder().id(1L).name("Dr. Test")
            .workStart(LocalTime.of(9, 0)).workEnd(LocalTime.of(17, 0)).slotMinutes(30).build(); // Mon–Fri
    private final User desk = User.builder().id(9L).username("desk").role(UserRole.RECEPTIONIST).build();
    private final LocalDate nextMonday = LocalDate.now().with(TemporalAdjusters.next(DayOfWeek.MONDAY));

    private void book(User who, LocalDateTime at) {
        service.create(who, new AppointmentRequest(5L, 1L, at, null));
    }

    @Test
    void lifecycleIsStrict() {
        assertTrue(SCHEDULED.next().containsAll(java.util.Set.of(CONFIRMED, CHECKED_IN, CANCELLED, NO_SHOW)));
        assertFalse(SCHEDULED.next().contains(COMPLETED));          // must check in first
        assertEquals(java.util.Set.of(IN_CONSULTATION, CANCELLED), CHECKED_IN.next());
        assertEquals(java.util.Set.of(COMPLETED), IN_CONSULTATION.next());          // seen = must be documented, not cancelled
        assertTrue(COMPLETED.next().isEmpty() && CANCELLED.next().isEmpty() && NO_SHOW.next().isEmpty());
    }

    @Test
    void bookingRespectsHoursGridAndConflicts() {
        when(doctors.findById(1L)).thenReturn(Optional.of(doc));
        when(patients.findById(5L)).thenReturn(Optional.of(Patient.builder().id(5L).build()));
        when(repo.saveAndFlush(any())).thenAnswer(i -> i.getArgument(0));

        assertDoesNotThrow(() -> book(desk, nextMonday.atTime(9, 30)));
        assertThrows(BadRequestException.class, () -> book(desk, nextMonday.atTime(9, 15)));   // off the 30-min grid
        assertThrows(BadRequestException.class, () -> book(desk, nextMonday.atTime(16, 45)));  // runs past 17:00
        assertThrows(BadRequestException.class, () -> book(desk, nextMonday.atTime(3, 0)));    // before opening
        assertThrows(BadRequestException.class, () -> book(desk, nextMonday.plusDays(5).atTime(10, 0))); // Saturday
        assertThrows(BadRequestException.class, () -> book(desk, LocalDateTime.now().minusHours(1)));    // past

        when(repo.doctorBusy(eq(1L), any(), any(), anyLong())).thenReturn(true);
        assertThrows(BadRequestException.class, () -> book(desk, nextMonday.atTime(10, 0)));   // overlap

        User otherDoctor = User.builder().id(7L).username("dr_x").role(UserRole.DOCTOR).build();
        when(doctors.findByUser_Id(7L)).thenReturn(Optional.of(Doctor.builder().id(2L).build()));
        assertThrows(AccessDeniedException.class, () -> book(otherDoctor, nextMonday.atTime(11, 0))); // not their diary
    }
}
