package com.hms.controller;

import com.hms.dto.ApiResponse;
import com.hms.dto.appointment.AppointmentRequest;
import com.hms.entity.Appointment;
import com.hms.entity.User;
import com.hms.service.AppointmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

// No DELETE on purpose: appointments are part of the clinical record — cancel instead.
@RestController
@RequestMapping("/api/appointments")
@RequiredArgsConstructor
public class AppointmentController {

    private final AppointmentService service;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<Appointment>>> list(
            @AuthenticationPrincipal User user,
            @ModelAttribute AppointmentRequest.Filter filter,
            @PageableDefault(size = 20, sort = "appointmentDate") Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(service.search(user, filter, pageable)));
    }

    @GetMapping("/today")
    public ResponseEntity<ApiResponse<List<Appointment>>> today() {
        return ResponseEntity.ok(ApiResponse.ok(service.findTodayAppointments()));
    }

    @GetMapping("/slots")
    public ResponseEntity<ApiResponse<List<LocalDateTime>>> slots(
            @RequestParam Long doctorId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(ApiResponse.ok(service.freeSlots(doctorId, date)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Appointment>> get(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(service.findById(id)));
    }

    @GetMapping("/{id}/history")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> history(
            @AuthenticationPrincipal User user, @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(service.history(user, id)));
    }

    @GetMapping("/patient/{patientId}")
    public ResponseEntity<ApiResponse<Page<Appointment>>> byPatient(
            @PathVariable Long patientId,
            @PageableDefault(size = 20, sort = "appointmentDate", direction = org.springframework.data.domain.Sort.Direction.DESC)
            Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(service.findByPatient(patientId, pageable)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Appointment>> create(
            @AuthenticationPrincipal User user, @Valid @RequestBody AppointmentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Appointment booked", service.create(user, request)));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<ApiResponse<Appointment>> update(
            @AuthenticationPrincipal User user, @PathVariable Long id,
            @RequestBody AppointmentRequest.Update request) {
        return ResponseEntity.ok(ApiResponse.ok("Appointment updated", service.update(user, id, request)));
    }

    // ─── Consultation (clinical roles; writes are the treating doctor's) ──────

    @GetMapping("/{id}/visit")
    public ResponseEntity<ApiResponse<Map<String, Object>>> visit(@AuthenticationPrincipal User user, @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(service.visit(user, id)));
    }

    @PutMapping("/{id}/visit")
    public ResponseEntity<ApiResponse<Void>> saveVisit(
            @AuthenticationPrincipal User user, @PathVariable Long id, @RequestBody AppointmentRequest.Visit request) {
        service.saveVisit(user, id, request);
        return ResponseEntity.ok(ApiResponse.ok("Visit note saved"));
    }

    @PutMapping("/{id}/prescription")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> savePrescription(
            @AuthenticationPrincipal User user, @PathVariable Long id,
            @RequestBody List<AppointmentRequest.RxItem> items) { // lines validated in the service (list-element
                                                                    // @Valid raises an unhandled method-validation 500)
        return ResponseEntity.ok(ApiResponse.ok("Prescription saved", service.savePrescription(user, id, items)));
    }

    @PostMapping("/{id}/addendum")
    public ResponseEntity<ApiResponse<Void>> addendum(
            @AuthenticationPrincipal User user, @PathVariable Long id, @Valid @RequestBody AppointmentRequest.Addendum request) {
        service.addAddendum(user, id, request);
        return ResponseEntity.ok(ApiResponse.ok("Addendum added"));
    }

    @GetMapping("/patient/{patientId}/visits")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> patientVisits(
            @AuthenticationPrincipal User user, @PathVariable Long patientId) {
        return ResponseEntity.ok(ApiResponse.ok(service.patientVisits(user, patientId)));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<Appointment>> changeStatus(
            @AuthenticationPrincipal User user, @PathVariable Long id,
            @Valid @RequestBody AppointmentRequest.StatusChange request) {
        return ResponseEntity.ok(ApiResponse.ok("Status updated", service.changeStatus(user, id, request)));
    }
}
