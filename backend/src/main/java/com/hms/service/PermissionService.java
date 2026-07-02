package com.hms.service;

import com.hms.entity.RolePermission;
import com.hms.repository.RolePermissionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PermissionService {

    private final RolePermissionRepository repository;

    // Returns { "ADMIN": ["/", "/patients", ...], "DOCTOR": [...], ... }
    public Map<String, List<String>> getMatrix() {
        return repository.findAll().stream()
                .collect(Collectors.groupingBy(
                        p -> p.getRole(),
                        Collectors.mapping(p -> p.getRoute(), Collectors.toList())
                ));
    }

    // Replaces the entire matrix atomically
    @Transactional
    public Map<String, List<String>> updateMatrix(Map<String, List<String>> matrix) {
        repository.deleteAllInBatch();
        List<RolePermission> rows = new java.util.ArrayList<>();
        matrix.forEach((role, routes) ->
                routes.forEach(route -> rows.add(new RolePermission(role, route))));
        repository.saveAll(rows);
        return getMatrix();
    }
}
