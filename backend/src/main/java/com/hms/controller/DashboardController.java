package com.hms.controller;

import com.hms.dto.ApiResponse;
import com.hms.dto.dashboard.DashboardStats;
import com.hms.dto.dashboard.DashboardTrends;
import com.hms.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<DashboardStats>> stats() {
        return ResponseEntity.ok(ApiResponse.ok(dashboardService.getStats()));
    }

    @GetMapping("/trends")
    public ResponseEntity<ApiResponse<DashboardTrends>> trends() {
        return ResponseEntity.ok(ApiResponse.ok(dashboardService.getTrends()));
    }
}
