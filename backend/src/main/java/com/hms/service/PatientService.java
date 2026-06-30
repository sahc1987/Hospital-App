package com.hms.service;

import com.hms.dto.patient.PatientRequest;
import com.hms.entity.Patient;
import com.hms.exception.ResourceNotFoundException;
import com.hms.mapper.PatientMapper;
import com.hms.repository.PatientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PatientService {

    private final PatientRepository repo;
    private final PatientMapper mapper;

    @Transactional(readOnly = true)
    @Cacheable(value = "patients", key = "#id")
    public Patient findById(Long id) {
        return repo.findById(id).orElseThrow(() -> new ResourceNotFoundException("Patient", id));
    }

    @Transactional(readOnly = true)
    public Page<Patient> search(String q, Pageable pageable) {
        if (q == null || q.isBlank()) return repo.findAll(pageable);
        return repo.search(q.trim(), pageable);
    }

    @Transactional
    @CacheEvict(value = {"patients", "dashboard"}, allEntries = true)
    public Patient create(PatientRequest request) {
        return repo.save(mapper.toEntity(request));
    }

    @Transactional
    @CacheEvict(value = "patients", key = "#id")
    public Patient update(Long id, PatientRequest request) {
        Patient existing = repo.findById(id).orElseThrow(() -> new ResourceNotFoundException("Patient", id));
        mapper.updateEntity(request, existing);
        return repo.save(existing);
    }

    @Transactional
    @CacheEvict(value = {"patients", "dashboard"}, allEntries = true)
    public void delete(Long id) {
        if (!repo.existsById(id)) throw new ResourceNotFoundException("Patient", id);
        repo.deleteById(id);
    }
}
