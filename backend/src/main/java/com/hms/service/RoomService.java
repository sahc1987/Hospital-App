package com.hms.service;

import com.hms.dto.room.RoomRequest;
import com.hms.entity.Room;
import com.hms.entity.enums.RoomStatus;
import com.hms.exception.ResourceNotFoundException;
import com.hms.repository.RoomRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class RoomService {

    private final RoomRepository repo;

    @Transactional(readOnly = true)
    public List<Room> findAll() {
        return repo.findAll();
    }

    @Transactional(readOnly = true)
    public List<Room> findAvailable() {
        return repo.findByStatus(RoomStatus.AVAILABLE);
    }

    @Transactional
    @CacheEvict(value = "dashboard", allEntries = true)
    public Room create(RoomRequest request) {
        Room room = Room.builder()
                .roomNumber(request.roomNumber())
                .roomType(request.roomType())
                .floor(request.floor())
                .dailyRate(request.dailyRate() != null ? request.dailyRate() : BigDecimal.ZERO)
                .build();
        return repo.save(room);
    }

    @Transactional
    public Room update(Long id, RoomRequest request) {
        Room room = repo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Room", id));
        room.setRoomNumber(request.roomNumber());
        room.setRoomType(request.roomType());
        room.setFloor(request.floor());
        if (request.dailyRate() != null) room.setDailyRate(request.dailyRate());
        return repo.save(room);
    }

    @Transactional
    @CacheEvict(value = "dashboard", allEntries = true)
    public Room updateStatus(Long id, RoomStatus status) {
        Room room = repo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Room", id));
        room.setStatus(status);
        return repo.save(room);
    }
}
