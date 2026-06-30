package com.hms.controller;

import com.hms.dto.ApiResponse;
import com.hms.dto.patient.PatientRequest;
import com.hms.entity.Patient;
import com.hms.service.PatientService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/patients")
@RequiredArgsConstructor
public class PatientController {

    private final PatientService service;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<Patient>>> list(
            @RequestParam(required = false) String q,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(service.search(q, pageable)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Patient>> get(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(service.findById(id)));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','RECEPTIONIST','NURSE','DOCTOR')")
    public ResponseEntity<ApiResponse<Patient>> create(@Valid @RequestBody PatientRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Patient created", service.create(request)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','RECEPTIONIST','NURSE','DOCTOR')")
    public ResponseEntity<ApiResponse<Patient>> update(@PathVariable Long id,
                                                       @Valid @RequestBody PatientRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Patient updated", service.update(id, request)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
