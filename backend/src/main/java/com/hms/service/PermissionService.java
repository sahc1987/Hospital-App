package com.hms.service;

import com.hms.entity.RolePermission;
import com.hms.entity.enums.UserRole;
import com.hms.exception.BadRequestException;
import com.hms.repository.RolePermissionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
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
        // Validate before the wipe: a route-keyed body ({"/patients": ["ADMIN"]}) used to be stored as
        // role="/patients", leaving every real role with no rows, i.e. locked out of the whole API
        matrix.forEach((role, routes) -> {
            if (Arrays.stream(UserRole.values()).noneMatch(r -> r.name().equals(role))) {
                throw new BadRequestException("Unknown role: " + role);
            }
            if (routes.stream().anyMatch(route -> route == null || !route.startsWith("/"))) {
                throw new BadRequestException("Routes must start with '/' (role " + role + ")");
            }
        });
        repository.deleteAllInBatch();
        List<RolePermission> rows = new java.util.ArrayList<>();
        matrix.forEach((role, routes) ->
                routes.forEach(route -> rows.add(new RolePermission(role, route))));
        repository.saveAll(rows);
        return getMatrix();
    }
}
