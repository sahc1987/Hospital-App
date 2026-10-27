package com.hms.service;

import com.hms.entity.Payroll;
import com.hms.exception.BadRequestException;
import com.hms.exception.ResourceNotFoundException;
import com.hms.repository.EmployeeRepository;
import com.hms.repository.PayrollRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@SuppressWarnings("java:S8688") // now() is hospital wall-clock time: the JVM zone *is* the hospital zone (TZ, see CLAUDE.md)
public class PayrollService {

    private final PayrollRepository payrollRepo;
    private final EmployeeRepository employeeRepo;

    @Transactional(readOnly = true)
    public Page<Payroll> findAll(Pageable pageable) {
        return payrollRepo.findAll(pageable);
    }

    @Transactional(readOnly = true)
    public Page<Payroll> findByEmployee(Long employeeId, Pageable pageable) {
        return payrollRepo.findByEmployeeId(employeeId, pageable);
    }

    @Transactional
    public Payroll generate(Long employeeId, String rawMonth, BigDecimal basicSalary) {
        if (basicSalary.signum() <= 0) throw new BadRequestException("Basic salary must be positive");
        String month;
        try {
            month = java.time.YearMonth.parse(rawMonth).toString(); // canonical YYYY-MM, fits VARCHAR(7)
        } catch (java.time.format.DateTimeParseException e) {
            throw new BadRequestException("Month must be in YYYY-MM format");
        }
        var employee = employeeRepo.findById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee", employeeId));

        payrollRepo.findByEmployeeIdAndMonth(employeeId, month).ifPresent(p -> {
            throw new BadRequestException("Payroll for " + employee.getName() + " in " + month + " already exists");
        });

        Payroll payroll = Payroll.builder()
                .employee(employee)
                .month(month)
                .basicSalary(basicSalary)
                .netSalary(basicSalary)
                .build();

        return payrollRepo.save(payroll);
    }

    @Transactional
    public Payroll markPaid(Long id) {
        Payroll payroll = payrollRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Payroll", id));
        if (payroll.isPaid()) {
            throw new BadRequestException("Payroll record is already paid");
        }
        payroll.setPaid(true);
        payroll.setPaidDate(LocalDateTime.now());
        return payrollRepo.save(payroll);
    }
}
