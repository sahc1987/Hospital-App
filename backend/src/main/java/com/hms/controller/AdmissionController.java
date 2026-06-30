package com.hms.controller;

import com.hms.dto.ApiResponse;
import com.hms.dto.admission.AdmissionRequest;
import com.hms.entity.Admission;
import com.hms.service.AdmissionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admissions")
@RequiredArgsConstructor
public class AdmissionController {

    private final AdmissionService service;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<Admission>>> list(
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(service.findAll(pageable)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Admission>> get(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(service.findById(id)));
    }

    @GetMapping("/patient/{patientId}")
    public ResponseEntity<ApiResponse<Page<Admission>>> byPatient(
            @PathVariable Long patientId, @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(service.findByPatient(patientId, pageable)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Admission>> admit(@Valid @RequestBody AdmissionRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Patient admitted", service.admit(request)));
    }

    @PatchMapping("/{id}/discharge")
    public ResponseEntity<ApiResponse<Admission>> discharge(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok("Patient discharged", service.discharge(id)));
    }
}
