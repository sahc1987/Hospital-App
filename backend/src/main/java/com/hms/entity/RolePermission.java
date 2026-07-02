package com.hms.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "role_permissions")
@IdClass(RolePermissionId.class)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class RolePermission {

    @Id
    @Column(name = "role", nullable = false, length = 50)
    private String role;

    @Id
    @Column(name = "route", nullable = false, length = 100)
    private String route;
}
