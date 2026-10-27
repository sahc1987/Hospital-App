package com.hms.repository;

import com.hms.entity.Room;
import com.hms.entity.enums.RoomStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RoomRepository extends JpaRepository<Room, Long> {
    List<Room> findByStatus(RoomStatus status);
    long countByStatus(RoomStatus status);
}
