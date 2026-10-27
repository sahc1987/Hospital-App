package com.hms.service;

import com.hms.exception.BadRequestException;
import com.hms.repository.RolePermissionRepository;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

class PermissionGuardTest {

    private final RolePermissionRepository repo = mock(RolePermissionRepository.class);
    private final PermissionService service = new PermissionService(repo);

    @Test
    void routeKeyedBodyIsRejectedBeforeTheWipe() {
        // The shape the frontend used to send: route -> roles
        assertThrows(BadRequestException.class, () -> service.updateMatrix(Map.of("/patients", List.of("ADMIN"))));
        verify(repo, never()).deleteAllInBatch();
    }

    @Test
    void roleKeyedBodyIsSaved() {
        service.updateMatrix(Map.of("DOCTOR", List.of("/", "/patients")));
        verify(repo).deleteAllInBatch();
        verify(repo).saveAll(anyList());
    }
}
