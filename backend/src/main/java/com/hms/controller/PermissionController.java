package com.hms.controller;

import com.hms.dto.ApiResponse;
import com.hms.service.PermissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/permissions")
@RequiredArgsConstructor
public class PermissionController {

    private final PermissionService permissionService;

    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, List<String>>>> getMatrix() {
        return ResponseEntity.ok(ApiResponse.ok(permissionService.getMatrix()));
    }

    @PutMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, List<String>>>> updateMatrix(
            @RequestBody Map<String, List<String>> matrix) {
        return ResponseEntity.ok(ApiResponse.ok("Permissions updated", permissionService.updateMatrix(matrix)));
    }
}
