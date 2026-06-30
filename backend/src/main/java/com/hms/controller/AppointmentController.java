package com.hms.controller;

import com.hms.dto.ApiResponse;
import com.hms.dto.appointment.AppointmentRequest;
import com.hms.entity.Appointment;
import com.hms.entity.enums.AppointmentStatus;
import com.hms.service.AppointmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/appointments")
@RequiredArgsConstructor
public class AppointmentController {

    private final AppointmentService service;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<Appointment>>> list(@PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(service.findAll(pageable)));
    }

    @GetMapping("/today")
    public ResponseEntity<ApiResponse<List<Appointment>>> today() {
        return ResponseEntity.ok(ApiResponse.ok(service.findTodayAppointments()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Appointment>> get(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(service.findById(id)));
    }

    @GetMapping("/patient/{patientId}")
    public ResponseEntity<ApiResponse<Page<Appointment>>> byPatient(
            @PathVariable Long patientId, @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(service.findByPatient(patientId, pageable)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Appointment>> create(@Valid @RequestBody AppointmentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Appointment created", service.create(request)));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<Appointment>> updateStatus(
            @PathVariable Long id,
            @RequestParam AppointmentStatus status,
            @RequestParam(required = false) String notes) {
        return ResponseEntity.ok(ApiResponse.ok("Status updated", service.updateStatus(id, status, notes)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
