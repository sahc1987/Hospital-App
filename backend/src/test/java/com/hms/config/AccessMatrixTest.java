package com.hms.config;

import com.hms.entity.RolePermissionId;
import com.hms.entity.User;
import com.hms.entity.enums.UserRole;
import com.hms.repository.RolePermissionRepository;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.web.access.intercept.RequestAuthorizationContext;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AccessMatrixTest {

    private final RolePermissionRepository repo = mock(RolePermissionRepository.class);
    private final SecurityConfig config = new SecurityConfig(null, null, repo);

    private boolean allowed(UserRole role, String uri) {
        User user = User.builder().username("u").role(role).build();
        var auth = new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities());
        var ctx = new RequestAuthorizationContext(new MockHttpServletRequest("GET", uri));
        return config.checkAccessMatrix(() -> auth, ctx).isGranted();
    }

    @Test
    void enforcesMatrix() {
        when(repo.existsById(new RolePermissionId("HR", "/payroll"))).thenReturn(true);
        assertTrue(allowed(UserRole.HR, "/api/payroll"));
        assertFalse(allowed(UserRole.PHARMACIST, "/api/payroll/employee/1"));
        assertFalse(allowed(UserRole.NURSE, "/api/bills"));   // bills -> /billing, not granted
        assertTrue(allowed(UserRole.ADMIN, "/api/bills"));    // admin bypass
        assertTrue(allowed(UserRole.NURSE, "/api/auth/me"));  // self-guarded prefix
        assertFalse(allowed(UserRole.NURSE, "/api/newmodule")); // unmapped prefix: denied by default
        assertFalse(allowed(UserRole.NURSE, "/api/PAYROLL"));   // case tricks don't fall through
    }
}
