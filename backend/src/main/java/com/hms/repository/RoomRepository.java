package com.hms.repository;

import com.hms.entity.Room;
import com.hms.entity.enums.RoomStatus;
import com.hms.entity.enums.RoomType;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RoomRepository extends JpaRepository<Room, Long> {
    List<Room> findByStatus(RoomStatus status);
    List<Room> findByRoomType(RoomType roomType);
    List<Room> findByStatusAndRoomType(RoomStatus status, RoomType roomType);
    long countByStatus(RoomStatus status);
}
