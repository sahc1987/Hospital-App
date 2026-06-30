package com.hms.controller;

import com.hms.dto.ApiResponse;
import com.hms.dto.pharmacy.PharmacyItemRequest;
import com.hms.entity.PharmacyItem;
import com.hms.service.PharmacyService;
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
@RequestMapping("/api/pharmacy")
@RequiredArgsConstructor
public class PharmacyController {

    private final PharmacyService service;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<PharmacyItem>>> list(
            @RequestParam(required = false) String name,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(service.findAll(name, pageable)));
    }

    @GetMapping("/low-stock")
    public ResponseEntity<ApiResponse<List<PharmacyItem>>> lowStock() {
        return ResponseEntity.ok(ApiResponse.ok(service.findLowStock()));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<PharmacyItem>> create(@Valid @RequestBody PharmacyItemRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Item created", service.create(request)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<PharmacyItem>> update(
            @PathVariable Long id, @Valid @RequestBody PharmacyItemRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Item updated", service.update(id, request)));
    }

    @PatchMapping("/{id}/restock")
    public ResponseEntity<ApiResponse<PharmacyItem>> restock(
            @PathVariable Long id, @RequestParam int quantity) {
        return ResponseEntity.ok(ApiResponse.ok("Restocked", service.restock(id, quantity)));
    }
}
