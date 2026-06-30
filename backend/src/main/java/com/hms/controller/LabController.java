package com.hms.controller;

import com.hms.dto.ApiResponse;
import com.hms.dto.lab.LabResultRequest;
import com.hms.dto.lab.LabTestRequest;
import com.hms.entity.LabTest;
import com.hms.entity.enums.LabTestStatus;
import com.hms.service.LabTestService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/lab")
@RequiredArgsConstructor
public class LabController {

    private final LabTestService service;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<LabTest>>> list(@PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(service.findAll(pageable)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<LabTest>> get(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(service.findById(id)));
    }

    @GetMapping("/patient/{patientId}")
    public ResponseEntity<ApiResponse<Page<LabTest>>> byPatient(
            @PathVariable Long patientId, @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(service.findByPatient(patientId, pageable)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<LabTest>> create(@Valid @RequestBody LabTestRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Lab test created", service.create(request)));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<LabTest>> updateStatus(
            @PathVariable Long id, @RequestParam LabTestStatus status) {
        return ResponseEntity.ok(ApiResponse.ok("Status updated", service.updateStatus(id, status)));
    }

    @PostMapping("/{id}/result")
    public ResponseEntity<ApiResponse<LabTest>> submitResult(
            @PathVariable Long id, @RequestBody LabResultRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Result submitted", service.submitResult(id, request)));
    }
}
