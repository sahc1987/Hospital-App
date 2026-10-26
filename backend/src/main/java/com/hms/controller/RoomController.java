package com.hms.controller;

import com.hms.dto.ApiResponse;
import com.hms.dto.room.RoomRequest;
import com.hms.entity.Room;
import com.hms.entity.enums.RoomStatus;
import com.hms.service.RoomService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/rooms")
@RequiredArgsConstructor
public class RoomController {

    private final RoomService service;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<Room>>> list(
            @PageableDefault(size = 24) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(service.findAll(pageable)));
    }

    @GetMapping("/available")
    public ResponseEntity<ApiResponse<List<Room>>> available() {
        return ResponseEntity.ok(ApiResponse.ok(service.findAvailable()));
    }

    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<Map<String, Long>>> stats() {
        return ResponseEntity.ok(ApiResponse.ok(service.getStats()));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Room>> create(@Valid @RequestBody RoomRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Room created", service.create(request)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Room>> update(
            @PathVariable Long id, @Valid @RequestBody RoomRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Room updated", service.update(id, request)));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<Room>> updateStatus(
            @PathVariable Long id, @RequestParam RoomStatus status) {
        return ResponseEntity.ok(ApiResponse.ok("Status updated", service.updateStatus(id, status)));
    }
}
