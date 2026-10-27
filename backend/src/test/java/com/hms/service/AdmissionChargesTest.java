package com.hms.service;

import com.hms.entity.Admission;
import com.hms.repository.*;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class AdmissionChargesTest {

    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final AdmissionService service = new AdmissionService(mock(AdmissionRepository.class), mock(PatientRepository.class),
            mock(DoctorRepository.class), mock(RoomRepository.class), mock(AppointmentRepository.class), mock(BillingService.class), jdbc);
    private final Admission stay = Admission.builder().id(1L).build();

    private static Map<String, Object> seg(String room, String rate, LocalDateTime at) {
        return Map.of("room_number", room, "room_type", "GENERAL", "daily_rate", new BigDecimal(rate), "created_at", Timestamp.valueOf(at));
    }

    private void timeline(Map<String, Object>... segs) {
        when(jdbc.queryForList(anyString(), eq(1L))).thenReturn(List.of(segs));
    }

    @Test
    void transferSplitsNightsPerRoom() {
        LocalDateTime admit = LocalDateTime.of(2026, 10, 1, 22, 0);
        timeline(seg("G101", "250", admit), seg("ICU1", "900", admit.plusDays(2).withHour(3))); // 2 nights ward, then ICU
        var lines = service.charges(stay, LocalDateTime.of(2026, 10, 6, 11, 0));                 // 3 nights ICU
        assertEquals(2, lines.size());
        assertEquals(2L, lines.get(0).get("nights"));
        assertEquals(new BigDecimal("500"), lines.get(0).get("amount"));
        assertEquals(3L, lines.get(1).get("nights"));
        assertEquals(new BigDecimal("2700"), lines.get(1).get("amount"));
    }

    @Test
    void sameDayStayBillsOneNightAndFreeRoomsAreSkipped() {
        LocalDateTime admit = LocalDateTime.of(2026, 10, 1, 8, 0);
        timeline(seg("E1", "300", admit));
        var lines = service.charges(stay, admit.plusHours(6));
        assertEquals(1L, lines.get(0).get("nights"));           // minimum one night
        timeline(seg("OT1", "0", admit));
        assertTrue(service.charges(stay, admit.plusDays(2)).isEmpty()); // rate 0 = no line
    }
}
