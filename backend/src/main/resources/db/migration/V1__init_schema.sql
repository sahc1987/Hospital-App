-- HMS Database Schema

CREATE TYPE user_role AS ENUM ('ADMIN','DOCTOR','NURSE','RECEPTIONIST','LAB_TECH','PHARMACIST','HR');
CREATE TYPE gender AS ENUM ('MALE','FEMALE','OTHER');
CREATE TYPE appointment_status AS ENUM ('SCHEDULED','CONFIRMED','COMPLETED','CANCELLED','NO_SHOW');
CREATE TYPE admission_status AS ENUM ('ADMITTED','DISCHARGED','TRANSFERRED');
CREATE TYPE room_type AS ENUM ('GENERAL','PRIVATE','ICU','EMERGENCY','OT','MATERNITY');
CREATE TYPE room_status AS ENUM ('AVAILABLE','OCCUPIED','MAINTENANCE');
CREATE TYPE lab_test_status AS ENUM ('ORDERED','COLLECTED','IN_PROGRESS','COMPLETED','CANCELLED');
CREATE TYPE bill_status AS ENUM ('PENDING','PARTIAL','PAID','CANCELLED','REFUNDED');
CREATE TYPE claim_status AS ENUM ('SUBMITTED','UNDER_REVIEW','APPROVED','REJECTED','SETTLED');

-- Users (authentication)
CREATE TABLE users (
    id          BIGSERIAL PRIMARY KEY,
    username    VARCHAR(50)  UNIQUE NOT NULL,
    password    VARCHAR(255) NOT NULL,
    email       VARCHAR(100) UNIQUE NOT NULL,
    full_name   VARCHAR(150),
    role        user_role NOT NULL DEFAULT 'RECEPTIONIST',
    active      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Departments
CREATE TABLE departments (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    description TEXT,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Doctors
CREATE TABLE doctors (
    id              BIGSERIAL PRIMARY KEY,
    department_id   BIGINT REFERENCES departments(id) ON DELETE SET NULL,
    name            VARCHAR(150) NOT NULL,
    specialization  VARCHAR(100),
    phone           VARCHAR(20),
    email           VARCHAR(100) UNIQUE,
    license_number  VARCHAR(50),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Patients
CREATE TABLE patients (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(150) NOT NULL,
    dob         DATE,
    gender      gender,
    phone       VARCHAR(20),
    email       VARCHAR(100),
    address     TEXT,
    blood_group VARCHAR(5),
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Rooms
CREATE TABLE rooms (
    id          BIGSERIAL PRIMARY KEY,
    room_number VARCHAR(20) NOT NULL UNIQUE,
    room_type   room_type NOT NULL,
    floor       INT,
    status      room_status NOT NULL DEFAULT 'AVAILABLE',
    daily_rate  NUMERIC(10,2) NOT NULL DEFAULT 0,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Appointments
CREATE TABLE appointments (
    id                BIGSERIAL PRIMARY KEY,
    patient_id        BIGINT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id         BIGINT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    appointment_date  TIMESTAMP NOT NULL,
    status            appointment_status NOT NULL DEFAULT 'SCHEDULED',
    reason            TEXT,
    notes             TEXT,
    created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Admissions (IPD)
CREATE TABLE admissions (
    id              BIGSERIAL PRIMARY KEY,
    patient_id      BIGINT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id       BIGINT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    room_id         BIGINT REFERENCES rooms(id) ON DELETE SET NULL,
    admission_date  TIMESTAMP NOT NULL DEFAULT NOW(),
    discharge_date  TIMESTAMP,
    status          admission_status NOT NULL DEFAULT 'ADMITTED',
    diagnosis       TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Prescriptions
CREATE TABLE prescriptions (
    id              BIGSERIAL PRIMARY KEY,
    appointment_id  BIGINT REFERENCES appointments(id) ON DELETE SET NULL,
    doctor_id       BIGINT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    patient_id      BIGINT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    notes           TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Prescription Items
CREATE TABLE prescription_items (
    id              BIGSERIAL PRIMARY KEY,
    prescription_id BIGINT NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
    medication      VARCHAR(200) NOT NULL,
    dosage          VARCHAR(100),
    frequency       VARCHAR(100),
    duration        VARCHAR(100),
    instructions    TEXT
);

-- Lab Tests
CREATE TABLE lab_tests (
    id              BIGSERIAL PRIMARY KEY,
    patient_id      BIGINT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id       BIGINT REFERENCES doctors(id) ON DELETE SET NULL,
    test_name       VARCHAR(200) NOT NULL,
    ordered_date    TIMESTAMP NOT NULL DEFAULT NOW(),
    status          lab_test_status NOT NULL DEFAULT 'ORDERED',
    notes           TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Lab Results
CREATE TABLE lab_results (
    id              BIGSERIAL PRIMARY KEY,
    lab_test_id     BIGINT NOT NULL REFERENCES lab_tests(id) ON DELETE CASCADE,
    result_data     TEXT,
    result_file     VARCHAR(500),
    result_date     TIMESTAMP NOT NULL DEFAULT NOW(),
    remarks         TEXT,
    technician_id   BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Insurance Providers
CREATE TABLE insurance_providers (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(200) NOT NULL,
    contact_number  VARCHAR(20),
    email           VARCHAR(100),
    address         TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Bills
CREATE TABLE bills (
    id                      BIGSERIAL PRIMARY KEY,
    patient_id              BIGINT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    admission_id            BIGINT REFERENCES admissions(id) ON DELETE SET NULL,
    appointment_id          BIGINT REFERENCES appointments(id) ON DELETE SET NULL,
    insurance_provider_id   BIGINT REFERENCES insurance_providers(id) ON DELETE SET NULL,
    bill_date               TIMESTAMP NOT NULL DEFAULT NOW(),
    due_date                TIMESTAMP,
    total_amount            NUMERIC(12,2) NOT NULL DEFAULT 0,
    paid_amount             NUMERIC(12,2) NOT NULL DEFAULT 0,
    discount                NUMERIC(12,2) NOT NULL DEFAULT 0,
    status                  bill_status NOT NULL DEFAULT 'PENDING',
    notes                   TEXT,
    created_at              TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Bill Items
CREATE TABLE bill_items (
    id          BIGSERIAL PRIMARY KEY,
    bill_id     BIGINT NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    item_name   VARCHAR(200) NOT NULL,
    quantity    INT NOT NULL DEFAULT 1,
    unit_price  NUMERIC(10,2) NOT NULL,
    amount      NUMERIC(10,2) NOT NULL
);

-- Insurance Claims
CREATE TABLE insurance_claims (
    id                      BIGSERIAL PRIMARY KEY,
    patient_id              BIGINT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    insurance_provider_id   BIGINT NOT NULL REFERENCES insurance_providers(id) ON DELETE CASCADE,
    bill_id                 BIGINT REFERENCES bills(id) ON DELETE SET NULL,
    claim_number            VARCHAR(100) UNIQUE,
    claim_amount            NUMERIC(12,2) NOT NULL,
    approved_amount         NUMERIC(12,2),
    status                  claim_status NOT NULL DEFAULT 'SUBMITTED',
    claim_date              TIMESTAMP NOT NULL DEFAULT NOW(),
    settled_date            TIMESTAMP,
    notes                   TEXT,
    created_at              TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Pharmacy Items (catalog)
CREATE TABLE pharmacy_items (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(200) NOT NULL,
    category        VARCHAR(100),
    unit_price      NUMERIC(10,2) NOT NULL,
    stock_quantity  INT NOT NULL DEFAULT 0,
    reorder_level   INT NOT NULL DEFAULT 10,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Pharmacy Stock (batch tracking)
CREATE TABLE pharmacy_stock (
    id                  BIGSERIAL PRIMARY KEY,
    pharmacy_item_id    BIGINT NOT NULL REFERENCES pharmacy_items(id) ON DELETE CASCADE,
    quantity            INT NOT NULL,
    batch_number        VARCHAR(100),
    expiry_date         DATE,
    supplier            VARCHAR(200),
    purchase_price      NUMERIC(10,2),
    received_date       DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Employees (HR)
CREATE TABLE employees (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(150) NOT NULL,
    role            VARCHAR(100) NOT NULL,
    department_id   BIGINT REFERENCES departments(id) ON DELETE SET NULL,
    phone           VARCHAR(20),
    email           VARCHAR(100) UNIQUE,
    address         TEXT,
    hire_date       DATE NOT NULL,
    user_id         BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Payroll
CREATE TABLE payroll (
    id              BIGSERIAL PRIMARY KEY,
    employee_id     BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    month           VARCHAR(7) NOT NULL,
    basic_salary    NUMERIC(12,2) NOT NULL,
    allowances      NUMERIC(12,2) NOT NULL DEFAULT 0,
    deductions      NUMERIC(12,2) NOT NULL DEFAULT 0,
    net_salary      NUMERIC(12,2) NOT NULL,
    paid            BOOLEAN NOT NULL DEFAULT FALSE,
    paid_date       TIMESTAMP,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (employee_id, month)
);

-- Indexes
CREATE INDEX idx_appointments_patient    ON appointments(patient_id);
CREATE INDEX idx_appointments_doctor     ON appointments(doctor_id);
CREATE INDEX idx_appointments_date       ON appointments(appointment_date);
CREATE INDEX idx_admissions_patient      ON admissions(patient_id);
CREATE INDEX idx_admissions_status       ON admissions(status);
CREATE INDEX idx_lab_tests_patient       ON lab_tests(patient_id);
CREATE INDEX idx_bills_patient           ON bills(patient_id);
CREATE INDEX idx_bills_status            ON bills(status);
CREATE INDEX idx_prescriptions_patient   ON prescriptions(patient_id);
CREATE INDEX idx_employees_department    ON employees(department_id);
CREATE INDEX idx_payroll_employee_month  ON payroll(employee_id, month);

-- Seed admin user (password: Admin@123 — bcrypt)
INSERT INTO users (username, password, email, full_name, role)
VALUES (
    'admin',
    '$2b$12$kyLY47YtKnBISD.DMa7EHOcgyZIEsHTZXnbueeFUAaqZva.gbqNa6',
    'admin@hms.local',
    'System Administrator',
    'ADMIN'
);

-- Seed departments
INSERT INTO departments (name, description) VALUES
('Cardiology',      'Heart and cardiovascular system'),
('Neurology',       'Brain and nervous system'),
('Orthopedics',     'Bones, joints, and muscles'),
('Pediatrics',      'Children healthcare'),
('Oncology',        'Cancer treatment'),
('Emergency',       'Emergency and trauma care'),
('Gynecology',      'Women healthcare'),
('Radiology',       'Medical imaging'),
('Pathology',       'Lab diagnostics'),
('General Medicine','General outpatient care');
