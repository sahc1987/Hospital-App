package com.hms.controller;

import com.hms.dto.ApiResponse;
import com.hms.dto.employee.EmployeeRequest;
import com.hms.entity.Employee;
import com.hms.service.EmployeeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/employees")
@RequiredArgsConstructor
public class EmployeeController {

    private final EmployeeService service;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<Employee>>> list(
            @RequestParam(required = false) String name,
            @PageableDefault(size = 20, sort = "id") Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(service.findAll(name, pageable)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Employee>> get(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(service.findById(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Employee>> create(@Valid @RequestBody EmployeeRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Employee created", service.create(request)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Employee>> update(
            @PathVariable Long id, @Valid @RequestBody EmployeeRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Employee updated", service.update(id, request)));
    }
}
