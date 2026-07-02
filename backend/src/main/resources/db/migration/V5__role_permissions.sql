-- V5: Role-based access control matrix
-- Stores which routes each role can access, configurable by admins at runtime.

CREATE TABLE role_permissions (
    role  VARCHAR(50)  NOT NULL,
    route VARCHAR(100) NOT NULL,
    PRIMARY KEY (role, route)
);

-- ─── Seed defaults (mirrors the hardcoded matrix in the frontend) ─────────────

-- Dashboard (/)
INSERT INTO role_permissions (role, route) VALUES
('ADMIN', '/'), ('DOCTOR', '/'), ('NURSE', '/'),
('RECEPTIONIST', '/'), ('LAB_TECH', '/'), ('PHARMACIST', '/'), ('HR', '/');

-- Patients
INSERT INTO role_permissions (role, route) VALUES
('ADMIN', '/patients'), ('DOCTOR', '/patients'), ('NURSE', '/patients'),
('RECEPTIONIST', '/patients'), ('LAB_TECH', '/patients'), ('PHARMACIST', '/patients');

-- Appointments
INSERT INTO role_permissions (role, route) VALUES
('ADMIN', '/appointments'), ('DOCTOR', '/appointments'),
('NURSE', '/appointments'), ('RECEPTIONIST', '/appointments');

-- Doctors
INSERT INTO role_permissions (role, route) VALUES
('ADMIN', '/doctors'), ('DOCTOR', '/doctors'), ('NURSE', '/doctors'),
('RECEPTIONIST', '/doctors'), ('HR', '/doctors');

-- Departments
INSERT INTO role_permissions (role, route) VALUES
('ADMIN', '/departments'), ('DOCTOR', '/departments'), ('NURSE', '/departments'),
('RECEPTIONIST', '/departments'), ('HR', '/departments');

-- Admissions
INSERT INTO role_permissions (role, route) VALUES
('ADMIN', '/admissions'), ('DOCTOR', '/admissions'),
('NURSE', '/admissions'), ('RECEPTIONIST', '/admissions');

-- Rooms
INSERT INTO role_permissions (role, route) VALUES
('ADMIN', '/rooms'), ('DOCTOR', '/rooms'),
('NURSE', '/rooms'), ('RECEPTIONIST', '/rooms');

-- Lab
INSERT INTO role_permissions (role, route) VALUES
('ADMIN', '/lab'), ('DOCTOR', '/lab'), ('NURSE', '/lab'), ('LAB_TECH', '/lab');

-- Pharmacy
INSERT INTO role_permissions (role, route) VALUES
('ADMIN', '/pharmacy'), ('DOCTOR', '/pharmacy'),
('NURSE', '/pharmacy'), ('PHARMACIST', '/pharmacy');

-- Billing
INSERT INTO role_permissions (role, route) VALUES
('ADMIN', '/billing'), ('RECEPTIONIST', '/billing');

-- Employees
INSERT INTO role_permissions (role, route) VALUES
('ADMIN', '/employees'), ('HR', '/employees');

-- Payroll
INSERT INTO role_permissions (role, route) VALUES
('ADMIN', '/payroll'), ('HR', '/payroll');

-- Reports
INSERT INTO role_permissions (role, route) VALUES
('ADMIN', '/reports'), ('DOCTOR', '/reports'), ('HR', '/reports');

-- User Management (ADMIN only)
INSERT INTO role_permissions (role, route) VALUES
('ADMIN', '/users');

-- Access Matrix (ADMIN only)
INSERT INTO role_permissions (role, route) VALUES
('ADMIN', '/access-matrix');
