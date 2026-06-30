-- =============================================================
-- V2: Seed Data — realistic demo data for all modules
-- =============================================================

-- ─── USERS ────────────────────────────────────────────────────
-- All passwords = Admin@123 (bcrypt rounds=12)
INSERT INTO users (username, password, email, full_name, role) VALUES
('dr_smith',    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LFuNqm.Nf4Ys5Gu2', 'smith@hms.local',      'Dr. James Smith',       'DOCTOR'),
('dr_patel',    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LFuNqm.Nf4Ys5Gu2', 'patel@hms.local',      'Dr. Priya Patel',       'DOCTOR'),
('dr_chen',     '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LFuNqm.Nf4Ys5Gu2', 'chen@hms.local',       'Dr. Kevin Chen',        'DOCTOR'),
('dr_garcia',   '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LFuNqm.Nf4Ys5Gu2', 'garcia@hms.local',     'Dr. Maria Garcia',      'DOCTOR'),
('dr_johnson',  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LFuNqm.Nf4Ys5Gu2', 'johnson@hms.local',    'Dr. Robert Johnson',    'DOCTOR'),
('nurse_ali',   '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LFuNqm.Nf4Ys5Gu2', 'ali@hms.local',        'Nurse Fatima Ali',      'NURSE'),
('nurse_kim',   '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LFuNqm.Nf4Ys5Gu2', 'kim@hms.local',        'Nurse Soo-Jin Kim',     'NURSE'),
('recept_anna', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LFuNqm.Nf4Ys5Gu2', 'anna@hms.local',       'Anna Thompson',         'RECEPTIONIST'),
('lab_mike',    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LFuNqm.Nf4Ys5Gu2', 'mike.lab@hms.local',   'Mike Reyes',            'LAB_TECH'),
('pharma_sara', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LFuNqm.Nf4Ys5Gu2', 'sara.ph@hms.local',    'Sara Nguyen',           'PHARMACIST'),
('hr_david',    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LFuNqm.Nf4Ys5Gu2', 'david.hr@hms.local',   'David Okafor',          'HR');

-- ─── INSURANCE PROVIDERS ─────────────────────────────────────
INSERT INTO insurance_providers (name, contact_number, email, address) VALUES
('BlueCross BlueShield',  '+1-800-521-2227', 'claims@bcbs.com',       '225 N Michigan Ave, Chicago, IL 60601'),
('Aetna Health',          '+1-800-872-3862', 'members@aetna.com',     '151 Farmington Ave, Hartford, CT 06156'),
('UnitedHealthcare',      '+1-866-242-6754', 'support@uhc.com',       '9900 Bren Rd E, Minnetonka, MN 55343'),
('Cigna',                 '+1-800-244-6224', 'service@cigna.com',     '900 Cottage Grove Rd, Bloomfield, CT 06002'),
('Humana',                '+1-800-486-2620', 'info@humana.com',       '500 W Main St, Louisville, KY 40202');

-- ─── DOCTORS ─────────────────────────────────────────────────
-- departments: 1=Cardiology, 2=Neurology, 3=Orthopedics, 4=Pediatrics,
--              5=Oncology, 6=Emergency, 7=Gynecology, 8=Radiology,
--              9=Pathology, 10=General Medicine
INSERT INTO doctors (department_id, name, specialization, phone, email, license_number) VALUES
(1,  'Dr. James Smith',    'Interventional Cardiology',   '+1-555-0101', 'smith@hms.local',   'LIC-CARD-001'),
(2,  'Dr. Priya Patel',    'Neurosurgery',                '+1-555-0102', 'patel@hms.local',   'LIC-NEUR-002'),
(3,  'Dr. Kevin Chen',     'Joint Replacement Surgery',   '+1-555-0103', 'chen@hms.local',    'LIC-ORTH-003'),
(4,  'Dr. Maria Garcia',   'Neonatology',                 '+1-555-0104', 'garcia@hms.local',  'LIC-PEDI-004'),
(5,  'Dr. Robert Johnson', 'Medical Oncology',            '+1-555-0105', 'johnson@hms.local', 'LIC-ONCO-005'),
(6,  'Dr. Linda Park',     'Emergency Medicine',          '+1-555-0106', 'lpark@hms.local',   'LIC-EMER-006'),
(7,  'Dr. Susan Walker',   'Obstetrics & Gynecology',     '+1-555-0107', 'swalker@hms.local', 'LIC-GYNE-007'),
(8,  'Dr. Ahmed Hassan',   'Diagnostic Radiology',        '+1-555-0108', 'ahassan@hms.local', 'LIC-RADI-008'),
(9,  'Dr. Emily Clarke',   'Clinical Pathology',          '+1-555-0109', 'eclarke@hms.local', 'LIC-PATH-009'),
(10, 'Dr. Tom Brown',      'Internal Medicine',           '+1-555-0110', 'tbrown@hms.local',  'LIC-GMED-010');

-- ─── PATIENTS ─────────────────────────────────────────────────
INSERT INTO patients (name, dob, gender, phone, email, address, blood_group) VALUES
('Alice Monroe',       '1985-03-12', 'FEMALE', '+1-555-1001', 'alice.m@mail.com',   '12 Oak St, Springfield, IL',       'A+'),
('Bob Harrison',       '1978-07-22', 'MALE',   '+1-555-1002', 'bob.h@mail.com',     '45 Elm Ave, Shelbyville, IN',       'B-'),
('Catherine Lee',      '1992-11-05', 'FEMALE', '+1-555-1003', 'cath.l@mail.com',    '7 Pine Rd, Capital City, IL',       'O+'),
('David Kim',          '1965-01-30', 'MALE',   '+1-555-1004', 'david.k@mail.com',   '88 Maple Dr, Ogdenville, NY',       'AB+'),
('Emma Wilson',        '2001-06-18', 'FEMALE', '+1-555-1005', 'emma.w@mail.com',    '3 Birch Ln, North Haverbrook, OH',  'A-'),
('Frank Delgado',      '1955-09-14', 'MALE',   '+1-555-1006', 'frank.d@mail.com',   '99 Cedar Blvd, Brockway, PA',       'O-'),
('Grace Obi',          '1998-04-27', 'FEMALE', '+1-555-1007', 'grace.o@mail.com',   '21 Spruce Way, Cypress Creek, TX',  'B+'),
('Henry Zhang',        '1970-12-03', 'MALE',   '+1-555-1008', 'henry.z@mail.com',   '56 Walnut St, Shelbyville, IL',     'AB-'),
('Isabelle Tremblay',  '1988-08-09', 'FEMALE', '+1-555-1009', 'izzy.t@mail.com',    '14 Hickory Ct, Springfield, IL',    'O+'),
('Jack Murphy',        '1945-02-17', 'MALE',   '+1-555-1010', 'jack.m@mail.com',    '72 Poplar Ave, Capital City, IL',   'A+'),
('Karen Petrov',       '1995-05-31', 'FEMALE', '+1-555-1011', 'karen.p@mail.com',   '8 Ash St, Ogdenville, NY',          'B+'),
('Luis Hernandez',     '1980-10-22', 'MALE',   '+1-555-1012', 'luis.h@mail.com',    '33 Chestnut Dr, Brockway, PA',      'O+'),
('Megan Foster',       '2005-07-04', 'FEMALE', '+1-555-1013', 'megan.f@mail.com',   '61 Sycamore Rd, North Haverbrook',  'A-'),
('Nathan Brooks',      '1963-03-19', 'MALE',   '+1-555-1014', 'nathan.b@mail.com',  '27 Magnolia Blvd, Cypress Creek',   'AB+'),
('Olivia Stone',       '1990-09-28', 'FEMALE', '+1-555-1015', 'olivia.s@mail.com',  '5 Willow Way, Springfield, IL',     'O-'),
('Paul Nguyen',        '1975-11-11', 'MALE',   '+1-555-1016', 'paul.n@mail.com',    '43 Juniper Ct, Shelbyville, IN',    'B-'),
('Quinn Adams',        '2000-01-07', 'MALE',   '+1-555-1017', 'quinn.a@mail.com',   '19 Redwood Ln, Capital City, IL',   'A+'),
('Rachel Scott',       '1983-06-14', 'FEMALE', '+1-555-1018', 'rachel.s@mail.com',  '68 Cypress Ave, Ogdenville, NY',    'B+'),
('Samuel Green',       '1950-08-25', 'MALE',   '+1-555-1019', 'samuel.g@mail.com',  '11 Fir St, Brockway, PA',           'O+'),
('Tina Cooper',        '2010-12-30', 'FEMALE', '+1-555-1020', 'tina.c@mail.com',    '39 Larch Blvd, Springfield, IL',    'A+');

-- ─── ROOMS ────────────────────────────────────────────────────
INSERT INTO rooms (room_number, room_type, floor, status, daily_rate) VALUES
-- Floor 1: General
('G101', 'GENERAL',   1, 'OCCUPIED',     250.00),
('G102', 'GENERAL',   1, 'AVAILABLE',    250.00),
('G103', 'GENERAL',   1, 'AVAILABLE',    250.00),
('G104', 'GENERAL',   1, 'OCCUPIED',     250.00),
('G105', 'GENERAL',   1, 'MAINTENANCE',  250.00),
-- Floor 2: Private
('P201', 'PRIVATE',   2, 'AVAILABLE',    550.00),
('P202', 'PRIVATE',   2, 'OCCUPIED',     550.00),
('P203', 'PRIVATE',   2, 'AVAILABLE',    550.00),
('P204', 'PRIVATE',   2, 'OCCUPIED',     550.00),
-- Floor 3: ICU
('ICU301', 'ICU',     3, 'OCCUPIED',    1200.00),
('ICU302', 'ICU',     3, 'OCCUPIED',    1200.00),
('ICU303', 'ICU',     3, 'AVAILABLE',   1200.00),
-- Floor 1: Emergency
('ER101', 'EMERGENCY', 1, 'OCCUPIED',    800.00),
('ER102', 'EMERGENCY', 1, 'AVAILABLE',   800.00),
-- Floor 4: OT
('OT401', 'OT',       4, 'AVAILABLE',   2000.00),
('OT402', 'OT',       4, 'OCCUPIED',    2000.00),
-- Floor 2: Maternity
('MAT201', 'MATERNITY', 2, 'AVAILABLE',  650.00),
('MAT202', 'MATERNITY', 2, 'OCCUPIED',   650.00),
('MAT203', 'MATERNITY', 2, 'AVAILABLE',  650.00);

-- ─── PHARMACY ITEMS ───────────────────────────────────────────
INSERT INTO pharmacy_items (name, category, unit_price, stock_quantity, reorder_level) VALUES
('Paracetamol 500mg',       'Analgesic',      0.15,   500,  50),
('Ibuprofen 400mg',         'Anti-inflammatory', 0.25, 320,  40),
('Amoxicillin 500mg',       'Antibiotic',     0.80,    80,  30),
('Metformin 500mg',         'Antidiabetic',   0.35,   200,  40),
('Lisinopril 10mg',         'ACE Inhibitor',  0.45,   150,  30),
('Atorvastatin 20mg',       'Statin',         0.60,   180,  35),
('Omeprazole 20mg',         'PPI',            0.40,   240,  40),
('Amlodipine 5mg',          'CCB',            0.55,    90,  30),
('Aspirin 75mg',            'Antiplatelet',   0.10,   400,  60),
('Salbutamol Inhaler',      'Bronchodilator', 8.50,    45,  15),
('Insulin Glargine 100U/ml','Insulin',       28.00,    30,  10),
('Warfarin 5mg',            'Anticoagulant',  0.90,    60,  20),
('Prednisolone 5mg',        'Corticosteroid', 0.30,   110,  25),
('Furosemide 40mg',         'Diuretic',       0.20,   160,  30),
('Ceftriaxone 1g Injection','Antibiotic',    12.00,    25,   8),
('Morphine 10mg Injection', 'Opioid Analgesic',15.00,  12,   5),
('Normal Saline 500ml',     'IV Fluid',       2.50,   200,  50),
('Dextrose 5% 500ml',       'IV Fluid',       3.00,   150,  50),
('Ondansetron 4mg',         'Antiemetic',     1.20,    80,  20),
('Dexamethasone 4mg',       'Corticosteroid', 2.40,  7,    10);  -- low stock

-- Pharmacy stock batches
INSERT INTO pharmacy_stock (pharmacy_item_id, quantity, batch_number, expiry_date, supplier, purchase_price) VALUES
(1,  500, 'PCM-2024-01', '2026-12-31', 'PharmaCo Ltd',       0.08),
(2,  320, 'IBU-2024-01', '2026-10-31', 'MedSupply Inc',      0.15),
(3,   80, 'AMX-2024-01', '2025-08-31', 'BioPharm Corp',      0.55),
(4,  200, 'MET-2024-01', '2026-12-31', 'GenericMeds Ltd',    0.22),
(5,  150, 'LIS-2024-01', '2026-09-30', 'CardioPharm',        0.30),
(6,  180, 'ATV-2024-01', '2027-01-31', 'StatinSupply Co',    0.40),
(7,  240, 'OMP-2024-01', '2026-11-30', 'GastroMeds Inc',     0.25),
(8,   90, 'AML-2024-01', '2026-08-31', 'HeartPharm',         0.38),
(9,  400, 'ASP-2024-01', '2027-03-31', 'PharmaCo Ltd',       0.06),
(10,  45, 'SAL-2024-01', '2025-12-31', 'RespiraMed',         6.00),
(11,  30, 'INS-2024-01', '2025-06-30', 'DiabetesCare Corp',  20.00),
(12,  60, 'WAR-2024-01', '2026-07-31', 'CardioPharm',        0.65),
(13, 110, 'PRD-2024-01', '2026-10-31', 'SteroidSupply',      0.20),
(14, 160, 'FRS-2024-01', '2026-12-31', 'RenalMeds Inc',      0.12),
(15,  25, 'CEF-2024-01', '2025-09-30', 'InjectaCare',        8.50),
(16,  12, 'MOR-2024-01', '2025-07-31', 'PainMed Corp',      11.00),
(17, 200, 'NS-2024-01',  '2026-12-31', 'IV Solutions Ltd',   1.80),
(18, 150, 'D5-2024-01',  '2026-12-31', 'IV Solutions Ltd',   2.10),
(19,  80, 'OND-2024-01', '2026-08-31', 'GastroMeds Inc',     0.85),
(20,   7, 'DEX-2024-01', '2025-10-31', 'BioPharm Corp',      1.70);

-- ─── EMPLOYEES ────────────────────────────────────────────────
INSERT INTO employees (name, role, department_id, phone, email, address, hire_date, user_id) VALUES
('Dr. James Smith',    'Senior Cardiologist',     1,  '+1-555-0101', 'smith@hms.local',      '100 Doctor Row, Springfield',    '2018-03-01',  2),
('Dr. Priya Patel',    'Consultant Neurologist',  2,  '+1-555-0102', 'patel@hms.local',      '14 Oak Lane, Springfield',       '2019-06-15',  3),
('Dr. Kevin Chen',     'Orthopedic Surgeon',      3,  '+1-555-0103', 'chen@hms.local',       '9 Pine Ave, Springfield',        '2020-01-10',  4),
('Dr. Maria Garcia',   'Neonatologist',           4,  '+1-555-0104', 'garcia@hms.local',     '22 Elm St, Springfield',         '2017-09-20',  5),
('Dr. Robert Johnson', 'Medical Oncologist',      5,  '+1-555-0105', 'johnson@hms.local',    '37 Maple Dr, Springfield',       '2016-05-05',  6),
('Fatima Ali',         'Head Nurse',              1,  '+1-555-0201', 'ali@hms.local',        '45 Cedar Rd, Springfield',       '2019-08-12',  7),
('Soo-Jin Kim',        'Staff Nurse',             4,  '+1-555-0202', 'kim@hms.local',        '58 Birch Blvd, Springfield',     '2021-02-28',  8),
('Anna Thompson',      'Senior Receptionist',     10, '+1-555-0301', 'anna@hms.local',       '71 Spruce Ct, Springfield',      '2020-11-01',  9),
('Mike Reyes',         'Senior Lab Technician',   9,  '+1-555-0401', 'mike.lab@hms.local',   '83 Walnut Way, Springfield',     '2018-07-14', 10),
('Sara Nguyen',        'Lead Pharmacist',         NULL,'+1-555-0501','sara.ph@hms.local',    '96 Hickory Ln, Springfield',     '2019-04-22', 11),
('David Okafor',       'HR Manager',              NULL,'+1-555-0601','david.hr@hms.local',   '12 Poplar Ave, Springfield',     '2017-12-01', 12);

-- ─── APPOINTMENTS ─────────────────────────────────────────────
-- Mix of past (completed) and upcoming (scheduled/confirmed)
INSERT INTO appointments (patient_id, doctor_id, appointment_date, status, reason, notes) VALUES
(1,  1, NOW() - INTERVAL '10 days', 'COMPLETED',  'Chest pain evaluation',          'ECG done, stress test ordered'),
(2,  2, NOW() - INTERVAL '8 days',  'COMPLETED',  'Persistent headaches',            'MRI ordered, follow up in 2 weeks'),
(3,  3, NOW() - INTERVAL '5 days',  'COMPLETED',  'Knee pain assessment',            'X-ray taken, physiotherapy recommended'),
(4,  1, NOW() - INTERVAL '3 days',  'COMPLETED',  'Follow-up post angioplasty',      'Recovery on track, medication adjusted'),
(5,  4, NOW() - INTERVAL '2 days',  'COMPLETED',  'Pediatric fever and cough',       'Viral infection, prescribed antivirals'),
(6,  5, NOW() - INTERVAL '1 day',   'COMPLETED',  'Chemotherapy consultation',       'Cycle 3 started'),
(7,  7, NOW() - INTERVAL '1 day',   'COMPLETED',  'Prenatal checkup',                '28 weeks, all normal'),
(1,  1, NOW() + INTERVAL '1 day',   'CONFIRMED',  'Stress test follow-up',           NULL),
(8,  2, NOW() + INTERVAL '1 day',   'SCHEDULED',  'Tingling in hands and feet',      NULL),
(9,  3, NOW() + INTERVAL '2 days',  'SCHEDULED',  'Hip replacement consultation',    NULL),
(10, 10,NOW() + INTERVAL '2 days',  'SCHEDULED',  'Annual health checkup',           NULL),
(11, 4, NOW() + INTERVAL '3 days',  'SCHEDULED',  'Toddler vaccinations',            NULL),
(12, 5, NOW() + INTERVAL '3 days',  'CONFIRMED',  'Post-chemo follow-up',            NULL),
(13, 7, NOW() + INTERVAL '4 days',  'SCHEDULED',  'Gynecology routine checkup',      NULL),
(14, 1, NOW() + INTERVAL '4 days',  'SCHEDULED',  'Hypertension management',         NULL),
(15, 10,NOW() + INTERVAL '5 days',  'SCHEDULED',  'Diabetes checkup',                NULL),
(2,  2, NOW() + INTERVAL '6 days',  'SCHEDULED',  'MRI results review',              NULL),
(3,  8, NOW() + INTERVAL '6 days',  'SCHEDULED',  'Post-physio radiology check',     NULL),
-- today's appointments
(16, 6, NOW(),                       'CONFIRMED',  'Emergency triage — high BP',      NULL),
(17, 10,NOW() + INTERVAL '2 hours', 'SCHEDULED',  'Asthma management review',        NULL),
(18, 4, NOW() + INTERVAL '3 hours', 'CONFIRMED',  'Child vaccination follow-up',     NULL),
(19, 5, NOW() + INTERVAL '4 hours', 'SCHEDULED',  'Oncology consultation',           NULL);

-- ─── ADMISSIONS ───────────────────────────────────────────────
INSERT INTO admissions (patient_id, doctor_id, room_id, admission_date, discharge_date, status, diagnosis) VALUES
-- Active admissions
(1,  1, 1,  NOW() - INTERVAL '3 days',  NULL,                        'ADMITTED',   'Acute Myocardial Infarction'),
(4,  1, 10, NOW() - INTERVAL '5 days',  NULL,                        'ADMITTED',   'Post-CABG recovery'),
(6,  5, 2,  NOW() - INTERVAL '8 days',  NULL,                        'ADMITTED',   'Chemotherapy inpatient'),
(8,  2, 11, NOW() - INTERVAL '2 days',  NULL,                        'ADMITTED',   'Subarachnoid haemorrhage'),
(10, 6, 13, NOW() - INTERVAL '1 day',   NULL,                        'ADMITTED',   'Hypertensive emergency'),
(7,  7, 18, NOW() - INTERVAL '4 days',  NULL,                        'ADMITTED',   'High-risk pregnancy monitoring'),
-- Discharged
(2,  3, 7,  NOW() - INTERVAL '15 days', NOW() - INTERVAL '10 days',  'DISCHARGED', 'Knee arthroscopy recovery'),
(5,  4, 17, NOW() - INTERVAL '7 days',  NOW() - INTERVAL '4 days',   'DISCHARGED', 'Pneumonia — paediatric'),
(9,  6, 14, NOW() - INTERVAL '5 days',  NOW() - INTERVAL '2 days',   'DISCHARGED', 'Fracture — right radius'),
(14, 1, 4,  NOW() - INTERVAL '12 days', NOW() - INTERVAL '6 days',   'DISCHARGED', 'Unstable angina');

-- ─── PRESCRIPTIONS ────────────────────────────────────────────
INSERT INTO prescriptions (appointment_id, doctor_id, patient_id, notes) VALUES
(1,  1,  1,  'Take with food. Avoid strenuous activity.'),
(2,  2,  2,  'Rest advised. Report any vision changes.'),
(3,  3,  3,  'Ice knee twice daily. Start physiotherapy.'),
(5,  4,  5,  'Plenty of fluids. Fever monitoring every 4h.'),
(6,  5,  6,  'Anti-nausea meds before each chemo session.');

INSERT INTO prescription_items (prescription_id, medication, dosage, frequency, duration, instructions) VALUES
(1, 'Aspirin',           '75mg',  'Once daily',    '30 days', 'After breakfast'),
(1, 'Atorvastatin',      '40mg',  'Once at night', '90 days', 'With water'),
(1, 'Lisinopril',        '10mg',  'Once daily',    '90 days', 'Morning'),
(2, 'Ibuprofen',         '400mg', 'TDS',           '5 days',  'After meals'),
(2, 'Amitriptyline',     '10mg',  'Once at night', '30 days', 'Bedtime'),
(3, 'Paracetamol',       '500mg', 'QDS PRN',       '7 days',  'As needed for pain'),
(4, 'Amoxicillin',       '500mg', 'TDS',           '7 days',  'Complete full course'),
(4, 'Paracetamol',       '250mg', 'QDS PRN',       '5 days',  'Syrup form'),
(5, 'Ondansetron',       '4mg',   'Before chemo',  '5 days',  'IV 30 min before'),
(5, 'Dexamethasone',     '8mg',   'Before chemo',  '5 days',  'IV with ondansetron');

-- ─── LAB TESTS ────────────────────────────────────────────────
INSERT INTO lab_tests (patient_id, doctor_id, test_name, ordered_date, status, notes) VALUES
(1,  1, 'Troponin I',                   NOW() - INTERVAL '3 days', 'COMPLETED',   'STAT — cardiac emergency'),
(1,  1, 'ECG',                          NOW() - INTERVAL '3 days', 'COMPLETED',   'Bedside'),
(1,  1, 'Full Blood Count',             NOW() - INTERVAL '3 days', 'COMPLETED',   NULL),
(4,  1, 'INR/PT',                       NOW() - INTERVAL '2 days', 'COMPLETED',   'Post-op anticoagulation monitoring'),
(4,  1, 'Echocardiogram',               NOW() - INTERVAL '1 day',  'IN_PROGRESS', 'Echo lab booked'),
(8,  2, 'CT Brain without contrast',    NOW() - INTERVAL '2 days', 'COMPLETED',   'STAT'),
(8,  2, 'Lumbar puncture CSF analysis', NOW() - INTERVAL '1 day',  'IN_PROGRESS', 'Awaiting pathology'),
(2,  2, 'MRI Brain with contrast',      NOW() - INTERVAL '8 days', 'COMPLETED',   NULL),
(3,  8, 'X-ray right knee AP/Lateral',  NOW() - INTERVAL '5 days', 'COMPLETED',   NULL),
(5,  4, 'Chest X-ray PA',               NOW() - INTERVAL '7 days', 'COMPLETED',   'Paediatric'),
(6,  5, 'CBC with differential',        NOW() - INTERVAL '1 day',  'IN_PROGRESS', 'Pre-chemo assessment'),
(6,  9, 'Tumour markers (CEA, CA19-9)', NOW() - INTERVAL '8 days', 'COMPLETED',   NULL),
(10, 6, 'Serum electrolytes',           NOW() - INTERVAL '1 day',  'ORDERED',     'Urgent'),
(10, 6, 'Renal function tests',         NOW() - INTERVAL '1 day',  'COLLECTED',   'Urgent'),
(15, 10,'HbA1c',                        NOW() - INTERVAL '3 days', 'COMPLETED',   NULL),
(15, 10,'Fasting blood glucose',        NOW() - INTERVAL '3 days', 'COMPLETED',   NULL),
(11, 4, 'Growth hormone panel',         NOW() - INTERVAL '2 days', 'ORDERED',     NULL),
(18, 4, 'Mantoux test',                 NOW() - INTERVAL '1 day',  'COLLECTED',   NULL);

-- Lab results for completed tests
INSERT INTO lab_results (lab_test_id, result_data, result_date, remarks, technician_id) VALUES
(1,  'Troponin I: 4.2 ng/mL (Ref: <0.04 ng/mL) — ELEVATED',        NOW() - INTERVAL '3 days', 'Significantly elevated — correlate with clinical findings', 10),
(2,  'ST elevation in leads II, III, aVF. Rate 102 bpm.',            NOW() - INTERVAL '3 days', 'Inferior STEMI pattern — urgent cardiology review',          10),
(3,  'Hb: 11.2 g/dL | WBC: 14.2 ×10⁹/L | Plt: 198 ×10⁹/L',        NOW() - INTERVAL '3 days', 'Mild anaemia, leukocytosis — watch for infection',            10),
(4,  'INR: 2.8 (Target 2.0–3.0) | PT: 32s',                         NOW() - INTERVAL '2 days', 'Within therapeutic range',                                   10),
(6,  'Hyperdense lesion in basal cisterns consistent with SAH.',      NOW() - INTERVAL '2 days', 'Neurosurgery notified immediately',                          10),
(8,  'Ring-enhancing lesion 18mm in right temporal lobe.',            NOW() - INTERVAL '8 days', 'Differential: metastasis vs primary CNS tumour',             10),
(9,  'Medial compartment narrowing grade III OA. No fracture.',       NOW() - INTERVAL '5 days', 'Physiotherapy + consider knee replacement consult',          10),
(10, 'Right lower lobe infiltrates. Air bronchograms present.',       NOW() - INTERVAL '7 days', 'Consistent with lobar pneumonia',                            10),
(12, 'CEA: 42 U/mL (ref <5) | CA19-9: 380 U/mL (ref <37)',          NOW() - INTERVAL '8 days', 'Markedly elevated — consistent with active malignancy',      10),
(15, 'HbA1c: 8.4% (Target <7%)',                                     NOW() - INTERVAL '3 days', 'Suboptimal control — medication review advised',             10),
(16, 'FBG: 11.6 mmol/L (Ref 3.9–5.5)',                              NOW() - INTERVAL '3 days', 'Elevated fasting glucose — reinforce dietary advice',        10);

-- ─── BILLS ────────────────────────────────────────────────────
INSERT INTO bills (patient_id, admission_id, appointment_id, insurance_provider_id, bill_date, due_date, total_amount, paid_amount, discount, status, notes) VALUES
-- Discharged patient bills
(2,  7,  NULL, 1, NOW() - INTERVAL '10 days', NOW() - INTERVAL '3 days',  3850.00, 3850.00,  0.00,   'PAID',    'Paid in full via insurance'),
(5,  8,  NULL, 2, NOW() - INTERVAL '4 days',  NOW() + INTERVAL '11 days', 2100.00, 1050.00,  0.00,   'PARTIAL', 'Awaiting insurance reimbursement'),
(9,  9,  NULL, NULL, NOW() - INTERVAL '2 days', NOW() + INTERVAL '13 days', 1500.00, 1500.00, 150.00, 'PAID',    'Self-pay, loyalty discount applied'),
(14, 10, NULL, 3, NOW() - INTERVAL '6 days',  NOW() + INTERVAL '9 days',  5200.00, 5200.00,  0.00,   'PAID',    'Insurance covered fully'),
-- Active admission bills (running)
(1,  1,  NULL, 1, NOW() - INTERVAL '3 days',  NOW() + INTERVAL '12 days', 6800.00, 0.00,     0.00,   'PENDING', 'ICU stay, ongoing'),
(4,  2,  NULL, 4, NOW() - INTERVAL '5 days',  NOW() + INTERVAL '10 days', 9200.00, 4600.00,  0.00,   'PARTIAL', 'Insurance pre-auth obtained'),
(6,  3,  NULL, 2, NOW() - INTERVAL '8 days',  NOW() + INTERVAL '7 days',  12400.00,0.00,     0.00,   'PENDING', 'Chemo billing — awaiting oncology codes'),
(8,  4,  NULL, 3, NOW() - INTERVAL '2 days',  NOW() + INTERVAL '13 days', 7600.00, 0.00,     0.00,   'PENDING', 'Neurosurgery consult pending'),
-- OPD bills
(3,  NULL, 3, NULL, NOW() - INTERVAL '5 days', NOW() + INTERVAL '10 days',  320.00,  320.00,  0.00,  'PAID',    'OPD consultation + X-ray'),
(15, NULL,15, 5,    NOW() - INTERVAL '3 days', NOW() + INTERVAL '12 days',  180.00,    0.00,  0.00,  'PENDING', 'Diabetes clinic OPD');

-- Bill items
INSERT INTO bill_items (bill_id, item_name, quantity, unit_price, amount) VALUES
-- Bill 1 (patient 2 — knee arthroscopy, PAID)
(1, 'Surgical Theatre Fee',    1, 1800.00, 1800.00),
(1, 'Surgeon Fee',             1,  900.00,  900.00),
(1, 'Anaesthesia',             1,  400.00,  400.00),
(1, 'General Ward — 5 days',   5,  250.00, 1250.00),
(1, 'Physiotherapy — 3 sessions', 3, 100.00, 300.00),
(1, 'Medications',             1,  200.00,  200.00),
-- Bill 2 (patient 5 — pneumonia, PARTIAL)
(2, 'Paediatric Ward — 3 days', 3, 250.00,  750.00),
(2, 'IV Antibiotics course',    1, 480.00,  480.00),
(2, 'Chest X-ray',             1,  120.00,  120.00),
(2, 'Doctor Consultation',      4,  150.00,  600.00),
(2, 'Medications',              1,  150.00,  150.00),
-- Bill 3 (patient 9 — fracture, PAID with discount)
(3, 'Emergency Consultation',  1,  200.00,  200.00),
(3, 'X-ray',                   1,  100.00,  100.00),
(3, 'Casting — radius',        1,  400.00,  400.00),
(3, 'ER Ward — 2 days',        2,  250.00,  500.00),
(3, 'Medications',             1,  150.00,  150.00),
(3, 'Loyalty Discount',        1, -150.00, -150.00),
-- Bill 5 (patient 1 — AMI, PENDING running)
(5, 'ICU — 3 days',            3, 1200.00, 3600.00),
(5, 'Troponin I Test',         1,   80.00,   80.00),
(5, 'ECG',                     1,   40.00,   40.00),
(5, 'Cardiology Consultation', 2,  400.00,  800.00),
(5, 'Medications (daily)',      3,   80.00,  240.00),
(5, 'IV Lines & Consumables',  3,   80.00,  240.00),
-- Bill 9 (patient 3 — OPD)
(9, 'Orthopaedic Consultation',1,  200.00,  200.00),
(9, 'X-ray knee',              1,  120.00,  120.00);

-- ─── INSURANCE CLAIMS ─────────────────────────────────────────
INSERT INTO insurance_claims (patient_id, insurance_provider_id, bill_id, claim_number, claim_amount, approved_amount, status, claim_date, settled_date, notes) VALUES
(2,  1, 1, 'CLM-BCBS-2024-001', 3850.00, 3850.00, 'SETTLED', NOW() - INTERVAL '10 days', NOW() - INTERVAL '5 days', 'Full cover approved'),
(5,  2, 2, 'CLM-AETNA-2024-001', 2100.00, 1500.00, 'APPROVED', NOW() - INTERVAL '4 days', NULL, 'Partial cover — deductible applies'),
(14, 3, 4, 'CLM-UHC-2024-001',  5200.00, 5200.00, 'SETTLED', NOW() - INTERVAL '6 days', NOW() - INTERVAL '3 days', 'In-network provider, full cover'),
(1,  1, 5, 'CLM-BCBS-2024-002', 6800.00,     NULL, 'SUBMITTED', NOW() - INTERVAL '3 days', NULL, 'Awaiting pre-auth for continued ICU stay'),
(4,  4, 6, 'CLM-CIGNA-2024-001', 9200.00, 4600.00, 'APPROVED', NOW() - INTERVAL '5 days', NULL, '50% interim approval, final post-discharge'),
(6,  2, 7, 'CLM-AETNA-2024-002', 12400.00,    NULL, 'UNDER_REVIEW', NOW() - INTERVAL '8 days', NULL, 'Oncology claim under medical review');

-- ─── PAYROLL ──────────────────────────────────────────────────
INSERT INTO payroll (employee_id, month, basic_salary, allowances, deductions, net_salary, paid, paid_date) VALUES
-- May (paid)
(1, '2026-05', 12000.00, 2500.00, 1200.00, 13300.00, TRUE, NOW() - INTERVAL '26 days'),
(2, '2026-05', 11000.00, 2000.00, 1100.00, 11900.00, TRUE, NOW() - INTERVAL '26 days'),
(3, '2026-05', 10500.00, 1800.00, 1050.00, 11250.00, TRUE, NOW() - INTERVAL '26 days'),
(4, '2026-05', 11500.00, 2200.00, 1150.00, 12550.00, TRUE, NOW() - INTERVAL '26 days'),
(5, '2026-05', 13000.00, 2800.00, 1300.00, 14500.00, TRUE, NOW() - INTERVAL '26 days'),
(6, '2026-05',  6000.00, 1000.00,  600.00,  6400.00, TRUE, NOW() - INTERVAL '26 days'),
(7, '2026-05',  5500.00,  800.00,  550.00,  5750.00, TRUE, NOW() - INTERVAL '26 days'),
(8, '2026-05',  4500.00,  700.00,  450.00,  4750.00, TRUE, NOW() - INTERVAL '26 days'),
(9, '2026-05',  5800.00,  900.00,  580.00,  6120.00, TRUE, NOW() - INTERVAL '26 days'),
(10,'2026-05',  6200.00, 1100.00,  620.00,  6680.00, TRUE, NOW() - INTERVAL '26 days'),
(11,'2026-05',  7000.00, 1200.00,  700.00,  7500.00, TRUE, NOW() - INTERVAL '26 days'),
-- June (current month — pending)
(1, '2026-06', 12000.00, 2500.00, 1200.00, 13300.00, FALSE, NULL),
(2, '2026-06', 11000.00, 2000.00, 1100.00, 11900.00, FALSE, NULL),
(3, '2026-06', 10500.00, 1800.00, 1050.00, 11250.00, FALSE, NULL),
(4, '2026-06', 11500.00, 2200.00, 1150.00, 12550.00, FALSE, NULL),
(5, '2026-06', 13000.00, 2800.00, 1300.00, 14500.00, FALSE, NULL),
(6, '2026-06',  6000.00, 1000.00,  600.00,  6400.00, FALSE, NULL),
(7, '2026-06',  5500.00,  800.00,  550.00,  5750.00, FALSE, NULL),
(8, '2026-06',  4500.00,  700.00,  450.00,  4750.00, FALSE, NULL),
(9, '2026-06',  5800.00,  900.00,  580.00,  6120.00, FALSE, NULL),
(10,'2026-06',  6200.00, 1100.00,  620.00,  6680.00, FALSE, NULL),
(11,'2026-06',  7000.00, 1200.00,  700.00,  7500.00, FALSE, NULL);
