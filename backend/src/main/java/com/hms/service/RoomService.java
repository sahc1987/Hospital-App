package com.hms.service;

import com.hms.dto.room.RoomRequest;
import com.hms.entity.Room;
import com.hms.entity.enums.AdmissionStatus;
import com.hms.entity.enums.RoomStatus;
import com.hms.exception.BadRequestException;
import com.hms.exception.ResourceNotFoundException;
import com.hms.repository.AdmissionRepository;
import com.hms.repository.RoomRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.util.*;

@Service
@RequiredArgsConstructor
public class RoomService {

    private final RoomRepository repo;
    private final AdmissionRepository admissionRepo;
    private final JdbcTemplate jdbc;

    @Transactional(readOnly = true)
    public Page<Room> findAll(Pageable pageable) {
        return repo.findAll(pageable);
    }

    @Transactional(readOnly = true)
    public List<Room> findAvailable() {
        return repo.findByStatus(RoomStatus.AVAILABLE);
    }

    @Transactional(readOnly = true)
    public Map<String, Long> getStats() {
        return Map.of(
                "total", repo.count(),
                "available", repo.countByStatus(RoomStatus.AVAILABLE),
                "occupied", repo.countByStatus(RoomStatus.OCCUPIED),
                "maintenance", repo.countByStatus(RoomStatus.MAINTENANCE));
    }

    /** Ward board: every room (by floor) with its current patients. */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> board() {
        Map<Long, List<Map<String, Object>>> occupants = new HashMap<>();
        jdbc.queryForList("SELECT a.id AS admission_id, a.room_id, a.admission_date, p.id AS patient_id, p.name AS patient, "
                + "(p.allergies IS NOT NULL AND p.allergies <> '') OR (p.conditions IS NOT NULL AND p.conditions <> '') AS alerts, "
                + "d.name AS doctor FROM admissions a JOIN patients p ON p.id = a.patient_id JOIN doctors d ON d.id = a.doctor_id "
                + "WHERE a.status = 'ADMITTED' AND a.room_id IS NOT NULL ORDER BY a.admission_date").forEach(r -> {
            r.computeIfPresent("admission_date", (k, v) -> ((Timestamp) v).toLocalDateTime());
            occupants.computeIfAbsent(((Number) r.get("room_id")).longValue(), k -> new ArrayList<>()).add(r);
        });
        return repo.findAll(Sort.by("floor", "roomNumber")).stream().map(room -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("room", room);
            m.put("occupants", occupants.getOrDefault(room.getId(), List.of()));
            return m;
        }).toList();
    }

    @Transactional
    @CacheEvict(value = "dashboard", allEntries = true)
    public Room create(RoomRequest request) {
        Room room = Room.builder()
                .roomNumber(request.roomNumber())
                .roomType(request.roomType())
                .floor(request.floor())
                .capacity(request.capacity())
                .dailyRate(request.dailyRate() != null ? request.dailyRate() : BigDecimal.ZERO)
                .build();
        return repo.save(room);
    }

    @Transactional
    @CacheEvict(value = "dashboard", allEntries = true)
    public Room update(Long id, RoomRequest request) {
        Room room = find(id);
        long active = activeIn(id);
        if (request.capacity() < active) {
            throw new BadRequestException("Room " + room.getRoomNumber() + " has " + active + " patients; capacity can't be lower");
        }
        room.setRoomNumber(request.roomNumber());
        room.setRoomType(request.roomType());
        room.setFloor(request.floor());
        room.setCapacity(request.capacity());
        if (request.dailyRate() != null) room.setDailyRate(request.dailyRate());
        if (room.getStatus() != RoomStatus.MAINTENANCE) room.setStatus(derived(room, active));
        return repo.save(room);
    }

    /** Only MAINTENANCE is set by hand (and only on an empty room); OCCUPIED/AVAILABLE follow the admissions. */
    @Transactional
    @CacheEvict(value = "dashboard", allEntries = true)
    public Room updateStatus(Long id, RoomStatus status) {
        Room room = find(id);
        long active = activeIn(id);
        if (status == RoomStatus.MAINTENANCE) {
            if (active > 0) throw new BadRequestException("Move the " + active + " patient(s) out of " + room.getRoomNumber() + " first");
            room.setStatus(RoomStatus.MAINTENANCE);
        } else if (status == RoomStatus.AVAILABLE) {
            room.setStatus(derived(room, active)); // leaving maintenance
        } else {
            throw new BadRequestException("Occupancy is set by admissions, not by hand");
        }
        return repo.save(room);
    }

    private static RoomStatus derived(Room room, long active) {
        return active >= room.getCapacity() ? RoomStatus.OCCUPIED : RoomStatus.AVAILABLE; // same rule as fn_refresh_room_status
    }

    private long activeIn(Long roomId) {
        return admissionRepo.countByRoomIdAndStatus(roomId, AdmissionStatus.ADMITTED);
    }

    private Room find(Long id) {
        return repo.findById(id).orElseThrow(() -> new ResourceNotFoundException("Room", id));
    }
}
