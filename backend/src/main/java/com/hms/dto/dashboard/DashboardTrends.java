package com.hms.dto.dashboard;

import java.time.LocalDate;
import java.util.List;

/** Daily counts for the last 7 days (oldest first); every list is aligned with {@code days}. */
public record DashboardTrends(
        List<LocalDate> days,
        List<Long> admissions,
        List<Long> appointments,
        List<Long> labTests
) {}
