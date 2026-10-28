package com.hms.controller;

import com.hms.dto.ApiResponse;
import com.hms.entity.Payroll;
import com.hms.service.PayrollService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;

@RestController
@RequestMapping("/api/payroll")
@RequiredArgsConstructor
public class PayrollController {

    private final PayrollService service;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<Payroll>>> list(
            @RequestParam(required = false) Boolean paid,
            @PageableDefault(size = 20, sort = "id") Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(service.findAll(paid, pageable)));
    }

    @GetMapping("/employee/{employeeId}")
    public ResponseEntity<ApiResponse<Page<Payroll>>> byEmployee(
            @PathVariable Long employeeId, @PageableDefault(size = 20, sort = "id") Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(service.findByEmployee(employeeId, pageable)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Payroll>> generate(
            @RequestParam Long employeeId,
            @RequestParam String month,
            @RequestParam BigDecimal basicSalary) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Payroll generated", service.generate(employeeId, month, basicSalary)));
    }

    @PatchMapping("/{id}/pay")
    public ResponseEntity<ApiResponse<Payroll>> markPaid(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok("Payroll marked as paid", service.markPaid(id)));
    }
}
