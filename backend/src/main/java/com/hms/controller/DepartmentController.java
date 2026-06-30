package com.hms.controller;

import com.hms.dto.ApiResponse;
import com.hms.dto.department.DepartmentRequest;
import com.hms.entity.Department;
import com.hms.service.DepartmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/departments")
@RequiredArgsConstructor
public class DepartmentController {

    private final DepartmentService service;

    @GetMapping
    public ResponseEntity<ApiResponse<List<Department>>> list() {
        return ResponseEntity.ok(ApiResponse.ok(service.findAll()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Department>> get(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(service.findById(id)));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Department>> create(@Valid @RequestBody DepartmentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Department created", service.create(request)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Department>> update(@PathVariable Long id,
                                                          @Valid @RequestBody DepartmentRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Department updated", service.update(id, request)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
