package com.hms.controller;

import com.hms.dto.ApiResponse;
import com.hms.dto.billing.BillRequest;
import com.hms.entity.Bill;
import com.hms.service.BillingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;

@RestController
@RequestMapping("/api/bills")
@RequiredArgsConstructor
public class BillingController {

    private final BillingService service;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<Bill>>> list(
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(service.findAll(pageable)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Bill>> get(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(service.findById(id)));
    }

    @GetMapping("/patient/{patientId}")
    public ResponseEntity<ApiResponse<Page<Bill>>> byPatient(
            @PathVariable Long patientId, @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(service.findByPatient(patientId, pageable)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Bill>> create(@Valid @RequestBody BillRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Bill created", service.create(request)));
    }

    @PatchMapping("/{id}/pay")
    public ResponseEntity<ApiResponse<Bill>> recordPayment(
            @PathVariable Long id, @RequestParam BigDecimal amount) {
        return ResponseEntity.ok(ApiResponse.ok("Payment recorded", service.recordPayment(id, amount)));
    }
}
