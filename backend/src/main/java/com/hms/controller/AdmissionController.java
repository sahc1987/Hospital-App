package com.hms.controller;

import com.hms.dto.ApiResponse;
import com.hms.dto.admission.AdmissionRequest;
import com.hms.entity.Admission;
import com.hms.entity.User;
import com.hms.entity.enums.AdmissionStatus;
import com.hms.service.AdmissionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admissions")
@RequiredArgsConstructor
public class AdmissionController {

    private final AdmissionService service;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<Admission>>> list(
            @RequestParam(required = false) AdmissionStatus status,
            @PageableDefault(size = 20, sort = "admissionDate", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(service.findAll(status, pageable)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Admission>> get(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(service.findById(id)));
    }

    /** Timeline + LOS + running cost for all; summary, notes, vitals, meds for clinical roles. */
    @GetMapping("/{id}/record")
    public ResponseEntity<ApiResponse<Map<String, Object>>> record(@AuthenticationPrincipal User user, @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(service.stayRecord(user, id)));
    }

    @GetMapping("/patient/{patientId}")
    public ResponseEntity<ApiResponse<Page<Admission>>> byPatient(
            @PathVariable Long patientId, @PageableDefault(size = 20, sort = "id") Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(service.findByPatient(patientId, pageable)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Admission>> admit(
            @AuthenticationPrincipal User user, @Valid @RequestBody AdmissionRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Patient admitted", service.admit(user, request)));
    }

    @PostMapping("/{id}/transfer")
    public ResponseEntity<ApiResponse<Admission>> transfer(
            @AuthenticationPrincipal User user, @PathVariable Long id, @Valid @RequestBody AdmissionRequest.Transfer request) {
        return ResponseEntity.ok(ApiResponse.ok("Patient transferred", service.transfer(user, id, request)));
    }

    @PostMapping("/{id}/discharge")
    public ResponseEntity<ApiResponse<Admission>> discharge(
            @AuthenticationPrincipal User user, @PathVariable Long id, @Valid @RequestBody AdmissionRequest.Discharge request) {
        return ResponseEntity.ok(ApiResponse.ok("Patient discharged", service.discharge(user, id, request)));
    }

    @PostMapping("/{id}/notes")
    public ResponseEntity<ApiResponse<Void>> note(
            @AuthenticationPrincipal User user, @PathVariable Long id, @Valid @RequestBody AdmissionRequest.Note request) {
        service.addNote(user, id, request);
        return ResponseEntity.ok(ApiResponse.ok("Note added"));
    }

    @PostMapping("/{id}/vitals")
    public ResponseEntity<ApiResponse<Void>> vitals(
            @AuthenticationPrincipal User user, @PathVariable Long id, @Valid @RequestBody AdmissionRequest.Vitals request) {
        service.addVitals(user, id, request);
        return ResponseEntity.ok(ApiResponse.ok("Vitals recorded"));
    }

    @PostMapping("/{id}/medications")
    public ResponseEntity<ApiResponse<Void>> order(
            @AuthenticationPrincipal User user, @PathVariable Long id, @Valid @RequestBody AdmissionRequest.MedOrder request) {
        service.orderMedication(user, id, request);
        return ResponseEntity.ok(ApiResponse.ok("Medication ordered"));
    }

    @PostMapping("/medications/{orderId}/stop")
    public ResponseEntity<ApiResponse<Void>> stop(@AuthenticationPrincipal User user, @PathVariable Long orderId) {
        service.stopMedication(user, orderId);
        return ResponseEntity.ok(ApiResponse.ok("Medication stopped"));
    }

    @PostMapping("/medications/{orderId}/administrations")
    public ResponseEntity<ApiResponse<Void>> administer(
            @AuthenticationPrincipal User user, @PathVariable Long orderId,
            @Valid @RequestBody AdmissionRequest.Administration request) {
        service.administer(user, orderId, request);
        return ResponseEntity.ok(ApiResponse.ok("Dose recorded"));
    }
}
