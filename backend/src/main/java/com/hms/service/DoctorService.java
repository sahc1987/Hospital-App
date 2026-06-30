package com.hms.service;

import com.hms.dto.doctor.DoctorRequest;
import com.hms.entity.Department;
import com.hms.entity.Doctor;
import com.hms.exception.ResourceNotFoundException;
import com.hms.mapper.DoctorMapper;
import com.hms.repository.DepartmentRepository;
import com.hms.repository.DoctorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class DoctorService {

    private final DoctorRepository repo;
    private final DepartmentRepository deptRepo;
    private final DoctorMapper mapper;

    @Transactional(readOnly = true)
    @Cacheable(value = "doctors", key = "#id")
    public Doctor findById(Long id) {
        return repo.findById(id).orElseThrow(() -> new ResourceNotFoundException("Doctor", id));
    }

    @Transactional(readOnly = true)
    public Page<Doctor> search(String name, Pageable pageable) {
        if (name == null || name.isBlank()) return repo.findAll(pageable);
        return repo.findByNameContainingIgnoreCase(name, pageable);
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "doctors", key = "'dept-' + #deptId")
    public List<Doctor> findByDepartment(Long deptId) {
        return repo.findByDepartmentId(deptId);
    }

    @Transactional
    @CacheEvict(value = "doctors", allEntries = true)
    public Doctor create(DoctorRequest request) {
        Doctor doctor = mapper.toEntity(request);
        doctor.setDepartment(resolveDepartment(request.departmentId()));
        return repo.save(doctor);
    }

    @Transactional
    @CacheEvict(value = "doctors", allEntries = true)
    public Doctor update(Long id, DoctorRequest request) {
        Doctor existing = repo.findById(id).orElseThrow(() -> new ResourceNotFoundException("Doctor", id));
        mapper.updateEntity(request, existing);
        existing.setDepartment(resolveDepartment(request.departmentId()));
        return repo.save(existing);
    }

    @Transactional
    @CacheEvict(value = "doctors", allEntries = true)
    public void delete(Long id) {
        if (!repo.existsById(id)) throw new ResourceNotFoundException("Doctor", id);
        repo.deleteById(id);
    }

    private Department resolveDepartment(Long departmentId) {
        if (departmentId == null) return null;
        return deptRepo.findById(departmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Department", departmentId));
    }
}
