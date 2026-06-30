-- V4: Convert PostgreSQL custom enum columns to TEXT (Hibernate compatibility)
--     and fix truncated bcrypt password hashes from seed data.

-- ─── DROP VIEWS THAT DEPEND ON ENUM COLUMNS ──────────────────────────────────
-- PostgreSQL blocks ALTER COLUMN TYPE when any view references the column.
DROP VIEW IF EXISTS v_today_appointments;
DROP VIEW IF EXISTS v_active_admissions;
DROP VIEW IF EXISTS v_department_stats;
DROP VIEW IF EXISTS v_pending_lab_tests;
DROP VIEW IF EXISTS v_outstanding_bills;
DROP VIEW IF EXISTS v_monthly_revenue;

-- fn_record_payment return type includes "bill_status" — must be recreated as TEXT
DROP FUNCTION IF EXISTS fn_record_payment(BIGINT, NUMERIC);

-- ─── DROP PARTIAL INDEX WITH ENUM LITERAL IN WHERE CLAUSE ────────────────────
-- idx_admissions_room stores its predicate as (status = 'ADMITTED'::admission_status).
-- PostgreSQL cannot rebuild this index after the column type changes to TEXT
-- because there is no operator (text = admission_status).
DROP INDEX IF EXISTS idx_admissions_room;

-- ─── DROP ENUM COLUMN DEFAULTS BEFORE ALTERING TYPES ─────────────────────────
-- Column DEFAULT expressions store a typed literal, e.g. 'SCHEDULED'::appointment_status.
-- Even after ALTER COLUMN TYPE TEXT succeeds, the DEFAULT expression still references
-- the old enum type, so DROP TYPE fails with "other objects depend on it".
-- Drop the defaults first; restore them as plain text literals after the type drops.
ALTER TABLE users            ALTER COLUMN role   DROP DEFAULT;
ALTER TABLE appointments     ALTER COLUMN status DROP DEFAULT;
ALTER TABLE admissions       ALTER COLUMN status DROP DEFAULT;
ALTER TABLE rooms            ALTER COLUMN status DROP DEFAULT;
ALTER TABLE lab_tests        ALTER COLUMN status DROP DEFAULT;
ALTER TABLE bills            ALTER COLUMN status DROP DEFAULT;
ALTER TABLE insurance_claims ALTER COLUMN status DROP DEFAULT;

-- ─── ENUM COLUMNS → TEXT ──────────────────────────────────────────────────────
ALTER TABLE users             ALTER COLUMN role      TYPE TEXT USING role::TEXT;
ALTER TABLE patients          ALTER COLUMN gender    TYPE TEXT USING gender::TEXT;
ALTER TABLE appointments      ALTER COLUMN status    TYPE TEXT USING status::TEXT;
ALTER TABLE admissions        ALTER COLUMN status    TYPE TEXT USING status::TEXT;
ALTER TABLE rooms             ALTER COLUMN room_type TYPE TEXT USING room_type::TEXT;
ALTER TABLE rooms             ALTER COLUMN status    TYPE TEXT USING status::TEXT;
ALTER TABLE lab_tests         ALTER COLUMN status    TYPE TEXT USING status::TEXT;
ALTER TABLE bills             ALTER COLUMN status    TYPE TEXT USING status::TEXT;
ALTER TABLE insurance_claims  ALTER COLUMN status    TYPE TEXT USING status::TEXT;

-- ─── DROP CUSTOM ENUM TYPES ───────────────────────────────────────────────────
DROP TYPE IF EXISTS user_role;
DROP TYPE IF EXISTS gender;
DROP TYPE IF EXISTS appointment_status;
DROP TYPE IF EXISTS admission_status;
DROP TYPE IF EXISTS room_type;
DROP TYPE IF EXISTS room_status;
DROP TYPE IF EXISTS lab_test_status;
DROP TYPE IF EXISTS bill_status;
DROP TYPE IF EXISTS claim_status;

-- ─── RESTORE COLUMN DEFAULTS AS PLAIN TEXT LITERALS ──────────────────────────
ALTER TABLE users            ALTER COLUMN role   SET DEFAULT 'RECEPTIONIST';
ALTER TABLE appointments     ALTER COLUMN status SET DEFAULT 'SCHEDULED';
ALTER TABLE admissions       ALTER COLUMN status SET DEFAULT 'ADMITTED';
ALTER TABLE rooms            ALTER COLUMN status SET DEFAULT 'AVAILABLE';
ALTER TABLE lab_tests        ALTER COLUMN status SET DEFAULT 'ORDERED';
ALTER TABLE bills            ALTER COLUMN status SET DEFAULT 'PENDING';
ALTER TABLE insurance_claims ALTER COLUMN status SET DEFAULT 'SUBMITTED';

-- ─── RECREATE PARTIAL INDEX (predicate now uses TEXT comparison) ──────────────
CREATE INDEX idx_admissions_room ON admissions(room_id) WHERE status = 'ADMITTED';

-- ─── RECREATE VIEWS ───────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW v_active_admissions AS
SELECT
    a.id                  AS admission_id,
    a.admission_date,
    a.diagnosis,
    a.status,
    p.id                  AS patient_id,
    p.name                AS patient_name,
    p.blood_group,
    d.name                AS doctor_name,
    d.specialization,
    r.room_number,
    r.room_type,
    r.floor,
    EXTRACT(DAY FROM NOW() - a.admission_date)::INT AS los_days,
    r.daily_rate,
    (EXTRACT(DAY FROM NOW() - a.admission_date) * r.daily_rate)::NUMERIC(12,2) AS accrued_room_cost
FROM admissions a
JOIN patients   p ON p.id = a.patient_id
JOIN doctors    d ON d.id = a.doctor_id
LEFT JOIN rooms r ON r.id = a.room_id
WHERE a.status = 'ADMITTED';

CREATE OR REPLACE VIEW v_today_appointments AS
SELECT
    ap.id                 AS appointment_id,
    ap.appointment_date,
    ap.status,
    ap.reason,
    p.name                AS patient_name,
    p.phone               AS patient_phone,
    d.name                AS doctor_name,
    d.specialization,
    dept.name             AS department
FROM appointments ap
JOIN patients      p    ON p.id    = ap.patient_id
JOIN doctors       d    ON d.id    = ap.doctor_id
LEFT JOIN departments dept ON dept.id = d.department_id
WHERE DATE(ap.appointment_date) = CURRENT_DATE
ORDER BY ap.appointment_date;

CREATE OR REPLACE VIEW v_monthly_revenue AS
SELECT
    TO_CHAR(bill_date, 'YYYY-MM')       AS month,
    COUNT(*)                             AS bill_count,
    SUM(total_amount)                    AS gross_revenue,
    SUM(paid_amount)                     AS collected,
    SUM(total_amount - paid_amount)      AS outstanding,
    SUM(discount)                        AS total_discounts,
    ROUND(AVG(total_amount), 2)          AS avg_bill_value
FROM bills
WHERE bill_date >= NOW() - INTERVAL '12 months'
  AND status    != 'CANCELLED'
GROUP BY TO_CHAR(bill_date, 'YYYY-MM')
ORDER BY month DESC;

CREATE OR REPLACE VIEW v_department_stats AS
SELECT
    dept.id,
    dept.name,
    COUNT(DISTINCT d.id)     AS doctor_count,
    COUNT(DISTINCT e.id)     AS employee_count,
    COUNT(DISTINCT ap.id)    AS appointment_count,
    COUNT(DISTINCT CASE WHEN ap.status = 'COMPLETED' THEN ap.id END) AS completed_appointments
FROM departments dept
LEFT JOIN doctors      d    ON d.department_id  = dept.id
LEFT JOIN employees    e    ON e.department_id  = dept.id
LEFT JOIN appointments ap   ON ap.doctor_id     = d.id
GROUP BY dept.id, dept.name
ORDER BY dept.name;

CREATE OR REPLACE VIEW v_pending_lab_tests AS
SELECT
    lt.id             AS test_id,
    lt.test_name,
    lt.status,
    lt.ordered_date,
    EXTRACT(HOUR FROM NOW() - lt.ordered_date)::INT AS hours_pending,
    p.name            AS patient_name,
    p.phone           AS patient_phone,
    d.name            AS ordering_doctor,
    lt.notes
FROM lab_tests lt
JOIN patients p ON p.id = lt.patient_id
LEFT JOIN doctors d ON d.id = lt.doctor_id
WHERE lt.status NOT IN ('COMPLETED', 'CANCELLED')
ORDER BY lt.ordered_date;

CREATE OR REPLACE VIEW v_outstanding_bills AS
SELECT
    b.id              AS bill_id,
    b.bill_date,
    b.due_date,
    b.total_amount,
    b.paid_amount,
    b.total_amount - b.paid_amount AS balance_due,
    b.status,
    p.name            AS patient_name,
    p.phone           AS patient_phone,
    ip.name           AS insurance_provider,
    ic.claim_number,
    ic.status         AS claim_status,
    CASE WHEN b.due_date < NOW() THEN TRUE ELSE FALSE END AS is_overdue
FROM bills b
JOIN patients p ON p.id = b.patient_id
LEFT JOIN insurance_providers ip ON ip.id = b.insurance_provider_id
LEFT JOIN insurance_claims    ic ON ic.bill_id = b.id
WHERE b.status IN ('PENDING', 'PARTIAL')
ORDER BY b.due_date NULLS LAST;

-- ─── RECREATE fn_record_payment WITHOUT ENUM RETURN TYPE ──────────────────────
CREATE OR REPLACE FUNCTION fn_record_payment(
    p_bill_id      BIGINT,
    p_amount       NUMERIC(12,2)
)
RETURNS TABLE (
    bill_id       BIGINT,
    total_amount  NUMERIC(12,2),
    paid_amount   NUMERIC(12,2),
    balance_due   NUMERIC(12,2),
    new_status    TEXT
) AS $$
BEGIN
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Payment amount must be positive';
    END IF;

    UPDATE bills b
    SET    paid_amount = LEAST(b.paid_amount + p_amount, b.total_amount)
    WHERE  b.id     = p_bill_id
      AND  b.status NOT IN ('PAID', 'CANCELLED', 'REFUNDED');

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Bill % not found or already closed', p_bill_id;
    END IF;

    RETURN QUERY
    SELECT b.id, b.total_amount, b.paid_amount,
           b.total_amount - b.paid_amount, b.status
    FROM   bills b WHERE b.id = p_bill_id;
END;
$$ LANGUAGE plpgsql;

-- ─── FIX TRUNCATED BCRYPT HASHES (59 chars → 60 chars) ───────────────────────
UPDATE users
SET password = '$2b$12$kyLY47YtKnBISD.DMa7EHOcgyZIEsHTZXnbueeFUAaqZva.gbqNa6'
WHERE password = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LFuNqm.Nf4Ys5Gu2';
