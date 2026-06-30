package com.hms.service;

import com.hms.dto.employee.EmployeeRequest;
import com.hms.entity.Employee;
import com.hms.exception.ResourceNotFoundException;
import com.hms.repository.DepartmentRepository;
import com.hms.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class EmployeeService {

    private final EmployeeRepository employeeRepo;
    private final DepartmentRepository departmentRepo;

    @Transactional(readOnly = true)
    public Page<Employee> findAll(String name, Pageable pageable) {
        if (name != null && !name.isBlank()) {
            return employeeRepo.findByNameContainingIgnoreCase(name, pageable);
        }
        return employeeRepo.findAll(pageable);
    }

    @Transactional(readOnly = true)
    public Employee findById(Long id) {
        return employeeRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Employee", id));
    }

    @Transactional
    @CacheEvict(value = "dashboard", allEntries = true)
    public Employee create(EmployeeRequest request) {
        var builder = Employee.builder()
                .name(request.name())
                .role(request.role())
                .phone(request.phone())
                .email(request.email())
                .hireDate(request.hireDate())
                .address(request.address());

        if (request.departmentId() != null) {
            var dept = departmentRepo.findById(request.departmentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Department", request.departmentId()));
            builder.department(dept);
        }

        return employeeRepo.save(builder.build());
    }

    @Transactional
    public Employee update(Long id, EmployeeRequest request) {
        Employee employee = employeeRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Employee", id));

        employee.setName(request.name());
        employee.setRole(request.role());
        employee.setPhone(request.phone());
        employee.setEmail(request.email());
        employee.setHireDate(request.hireDate());
        employee.setAddress(request.address());

        if (request.departmentId() != null) {
            var dept = departmentRepo.findById(request.departmentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Department", request.departmentId()));
            employee.setDepartment(dept);
        } else {
            employee.setDepartment(null);
        }

        return employeeRepo.save(employee);
    }
}
