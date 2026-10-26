package com.hms.dto.dashboard;

import java.math.BigDecimal;

public record DashboardStats(
        long totalPatients,
        long todayAppointments,
        long currentAdmissions,
        long availableRooms,
        long occupiedRooms,
        long totalRooms,
        long pendingLabTests,
        long lowStockItems,
        long pendingBills,
        BigDecimal monthlyRevenue,
        long totalDoctors,
        long totalEmployees
) {}
