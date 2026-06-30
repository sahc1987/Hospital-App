package com.hms.service;

import com.hms.dto.department.DepartmentRequest;
import com.hms.entity.Department;
import com.hms.exception.BadRequestException;
import com.hms.exception.ResourceNotFoundException;
import com.hms.repository.DepartmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class DepartmentService {

    private final DepartmentRepository repo;

    @Transactional(readOnly = true)
    @Cacheable("departments")
    public List<Department> findAll() {
        return repo.findAllByOrderByNameAsc();
    }

    @Transactional(readOnly = true)
    public Department findById(Long id) {
        return repo.findById(id).orElseThrow(() -> new ResourceNotFoundException("Department", id));
    }

    @Transactional
    @CacheEvict(value = "departments", allEntries = true)
    public Department create(DepartmentRequest request) {
        if (repo.existsByNameIgnoreCase(request.name()))
            throw new BadRequestException("Department already exists: " + request.name());
        Department dept = new Department();
        dept.setName(request.name());
        dept.setDescription(request.description());
        return repo.save(dept);
    }

    @Transactional
    @CacheEvict(value = "departments", allEntries = true)
    public Department update(Long id, DepartmentRequest request) {
        Department existing = repo.findById(id).orElseThrow(() -> new ResourceNotFoundException("Department", id));
        existing.setName(request.name());
        existing.setDescription(request.description());
        return repo.save(existing);
    }

    @Transactional
    @CacheEvict(value = "departments", allEntries = true)
    public void delete(Long id) {
        if (!repo.existsById(id)) throw new ResourceNotFoundException("Department", id);
        repo.deleteById(id);
    }
}
