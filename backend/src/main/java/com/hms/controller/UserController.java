package com.hms.controller;

import com.hms.dto.ApiResponse;
import com.hms.dto.user.LinkRequest;
import com.hms.dto.user.UserRequest;
import com.hms.dto.user.UserResponse;
import com.hms.entity.User;
import com.hms.entity.enums.UserRole;
import com.hms.exception.BadRequestException;
import com.hms.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class UserController {

    private final UserService userService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<UserResponse>>> list(
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.ok(userService.list(q, page, size)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<UserResponse>> get(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(userService.get(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<UserResponse>> create(@Valid @RequestBody UserRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("User created", userService.create(req)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<UserResponse>> update(
            @AuthenticationPrincipal User me, @PathVariable Long id, @Valid @RequestBody UserRequest req) {
        if (me.getId().equals(id) && req.role() != UserRole.ADMIN) notSelf("change your own role");
        return ResponseEntity.ok(ApiResponse.ok("User updated", userService.update(id, req)));
    }

    @PatchMapping("/{id}/toggle-active")
    public ResponseEntity<ApiResponse<UserResponse>> toggleActive(
            @AuthenticationPrincipal User me, @PathVariable Long id) {
        if (me.getId().equals(id)) notSelf("deactivate your own account");
        return ResponseEntity.ok(ApiResponse.ok(userService.toggleActive(id)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal User me, @PathVariable Long id) {
        if (me.getId().equals(id)) notSelf("delete your own account");
        userService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/link")
    public ResponseEntity<ApiResponse<UserResponse>> linkStaff(
            @PathVariable Long id, @Valid @RequestBody LinkRequest req) {
        return ResponseEntity.ok(ApiResponse.ok("Staff profile linked", userService.linkStaff(id, req)));
    }

    @DeleteMapping("/{id}/link")
    public ResponseEntity<ApiResponse<UserResponse>> unlinkStaff(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok("Staff profile unlinked", userService.unlinkStaff(id)));
    }

    // Stops the last admin from locking everyone out
    private static void notSelf(String action) {
        throw new BadRequestException("You cannot " + action);
    }
}
