-- =============================================================
-- V3: Triggers, Views, Functions, and Constraints
-- =============================================================

-- ─── UPDATED_AT TRIGGER ───────────────────────────────────────
-- Single function, applied to every table that has updated_at
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at             BEFORE UPDATE ON users             FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_departments_updated_at       BEFORE UPDATE ON departments       FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_doctors_updated_at           BEFORE UPDATE ON doctors           FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_patients_updated_at          BEFORE UPDATE ON patients          FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_rooms_updated_at             BEFORE UPDATE ON rooms             FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_appointments_updated_at      BEFORE UPDATE ON appointments      FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_admissions_updated_at        BEFORE UPDATE ON admissions        FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_prescriptions_updated_at     BEFORE UPDATE ON prescriptions     FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_lab_tests_updated_at         BEFORE UPDATE ON lab_tests         FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_bills_updated_at             BEFORE UPDATE ON bills             FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_insurance_providers_updated  BEFORE UPDATE ON insurance_providers FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_insurance_claims_updated_at  BEFORE UPDATE ON insurance_claims  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_pharmacy_items_updated_at    BEFORE UPDATE ON pharmacy_items    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_employees_updated_at         BEFORE UPDATE ON employees         FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_payroll_updated_at           BEFORE UPDATE ON payroll           FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ─── ROOM STATUS SYNC ─────────────────────────────────────────
-- Automatically set room to OCCUPIED on admission, AVAILABLE on discharge
CREATE OR REPLACE FUNCTION fn_sync_room_on_admission()
RETURNS TRIGGER AS $$
BEGIN
    -- New admission or status change to ADMITTED
    IF (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.status = 'ADMITTED'))
       AND NEW.room_id IS NOT NULL THEN
        UPDATE rooms SET status = 'OCCUPIED' WHERE id = NEW.room_id;
    END IF;

    -- Discharge or transfer: free the old room
    IF TG_OP = 'UPDATE'
       AND OLD.status = 'ADMITTED'
       AND NEW.status IN ('DISCHARGED', 'TRANSFERRED')
       AND OLD.room_id IS NOT NULL THEN
        UPDATE rooms SET status = 'AVAILABLE' WHERE id = OLD.room_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_admission_room_sync
    AFTER INSERT OR UPDATE ON admissions
    FOR EACH ROW EXECUTE FUNCTION fn_sync_room_on_admission();

-- ─── BILL TOTAL AUTO-RECALC ───────────────────────────────────
-- Keep bills.total_amount in sync when bill_items are inserted/updated/deleted
CREATE OR REPLACE FUNCTION fn_recalc_bill_total()
RETURNS TRIGGER AS $$
DECLARE
    v_bill_id BIGINT;
    v_total   NUMERIC(12,2);
BEGIN
    v_bill_id := COALESCE(NEW.bill_id, OLD.bill_id);

    SELECT COALESCE(SUM(amount), 0)
    INTO   v_total
    FROM   bill_items
    WHERE  bill_id = v_bill_id;

    UPDATE bills
    SET    total_amount = v_total + discount   -- discount stored as negative in items or separately
    WHERE  id = v_bill_id;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bill_item_sync
    AFTER INSERT OR UPDATE OR DELETE ON bill_items
    FOR EACH ROW EXECUTE FUNCTION fn_recalc_bill_total();

-- ─── BILL STATUS AUTO-UPDATE ──────────────────────────────────
-- Flip bill status between PENDING / PARTIAL / PAID when paid_amount changes
CREATE OR REPLACE FUNCTION fn_update_bill_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.paid_amount <= 0 THEN
        NEW.status = 'PENDING';
    ELSIF NEW.paid_amount >= NEW.total_amount THEN
        NEW.status = 'PAID';
    ELSE
        NEW.status = 'PARTIAL';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bill_status_sync
    BEFORE UPDATE OF paid_amount ON bills
    FOR EACH ROW EXECUTE FUNCTION fn_update_bill_status();

-- ─── PHARMACY STOCK QUANTITY SYNC ────────────────────────────
-- Keep pharmacy_items.stock_quantity equal to sum of its stock batches
CREATE OR REPLACE FUNCTION fn_sync_pharmacy_stock()
RETURNS TRIGGER AS $$
DECLARE
    v_item_id BIGINT;
    v_total   INT;
BEGIN
    v_item_id := COALESCE(NEW.pharmacy_item_id, OLD.pharmacy_item_id);

    SELECT COALESCE(SUM(quantity), 0)
    INTO   v_total
    FROM   pharmacy_stock
    WHERE  pharmacy_item_id = v_item_id;

    UPDATE pharmacy_items
    SET    stock_quantity = v_total
    WHERE  id = v_item_id;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pharmacy_stock_sync
    AFTER INSERT OR UPDATE OR DELETE ON pharmacy_stock
    FOR EACH ROW EXECUTE FUNCTION fn_sync_pharmacy_stock();

-- ─── CHECK CONSTRAINTS ────────────────────────────────────────
ALTER TABLE bills         ADD CONSTRAINT chk_bills_paid_amount       CHECK (paid_amount  >= 0);
ALTER TABLE bills         ADD CONSTRAINT chk_bills_total_amount      CHECK (total_amount >= 0);
ALTER TABLE bills         ADD CONSTRAINT chk_bills_discount          CHECK (discount     >= 0);
ALTER TABLE payroll       ADD CONSTRAINT chk_payroll_net_salary      CHECK (net_salary   >= 0);
ALTER TABLE payroll       ADD CONSTRAINT chk_payroll_basic_salary    CHECK (basic_salary >  0);
ALTER TABLE payroll       ADD CONSTRAINT chk_payroll_month_format    CHECK (month ~ '^\d{4}-(0[1-9]|1[0-2])$');
ALTER TABLE rooms         ADD CONSTRAINT chk_rooms_daily_rate        CHECK (daily_rate   >= 0);
ALTER TABLE pharmacy_items ADD CONSTRAINT chk_pharmacy_stock_qty     CHECK (stock_quantity >= 0);
ALTER TABLE pharmacy_items ADD CONSTRAINT chk_pharmacy_reorder_level CHECK (reorder_level  >= 0);
ALTER TABLE pharmacy_stock ADD CONSTRAINT chk_stock_quantity         CHECK (quantity      >= 0);
ALTER TABLE insurance_claims ADD CONSTRAINT chk_claim_approved_lte   CHECK (approved_amount IS NULL OR approved_amount <= claim_amount);
ALTER TABLE admissions     ADD CONSTRAINT chk_discharge_after_admit  CHECK (discharge_date IS NULL OR discharge_date >= admission_date);

-- ─── VIEWS ────────────────────────────────────────────────────

-- Active (current) admissions with full context
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

-- Today's appointment schedule
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
JOIN patients   p    ON p.id    = ap.patient_id
JOIN doctors    d    ON d.id    = ap.doctor_id
LEFT JOIN departments dept ON dept.id = d.department_id
WHERE DATE(ap.appointment_date) = CURRENT_DATE
ORDER BY ap.appointment_date;

-- Low stock items (at or below reorder level)
CREATE OR REPLACE VIEW v_low_stock_items AS
SELECT
    pi.id,
    pi.name,
    pi.category,
    pi.stock_quantity,
    pi.reorder_level,
    pi.unit_price,
    (pi.reorder_level - pi.stock_quantity) AS shortfall,
    MIN(ps.expiry_date)                    AS nearest_expiry
FROM pharmacy_items pi
LEFT JOIN pharmacy_stock ps ON ps.pharmacy_item_id = pi.id
WHERE pi.stock_quantity <= pi.reorder_level
GROUP BY pi.id, pi.name, pi.category, pi.stock_quantity, pi.reorder_level, pi.unit_price
ORDER BY shortfall DESC;

-- Monthly revenue summary (last 12 months)
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

-- Department statistics
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

-- Pending lab tests with patient and ordering doctor
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

-- Outstanding bills with patient and insurance context
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

-- ─── UTILITY FUNCTIONS ────────────────────────────────────────

-- Discharge a patient: update status, set discharge date, free room
CREATE OR REPLACE FUNCTION fn_discharge_patient(
    p_admission_id  BIGINT,
    p_discharge_date TIMESTAMP DEFAULT NOW()
)
RETURNS VOID AS $$
BEGIN
    UPDATE admissions
    SET    status         = 'DISCHARGED',
           discharge_date = p_discharge_date
    WHERE  id     = p_admission_id
      AND  status = 'ADMITTED';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Admission % not found or already discharged', p_admission_id;
    END IF;
    -- room is freed automatically by trg_admission_room_sync
END;
$$ LANGUAGE plpgsql;

-- Record a payment against a bill
CREATE OR REPLACE FUNCTION fn_record_payment(
    p_bill_id      BIGINT,
    p_amount       NUMERIC(12,2)
)
RETURNS TABLE (
    bill_id       BIGINT,
    total_amount  NUMERIC(12,2),
    paid_amount   NUMERIC(12,2),
    balance_due   NUMERIC(12,2),
    new_status    bill_status
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

-- Restock a pharmacy item (adds a new batch)
CREATE OR REPLACE FUNCTION fn_restock_pharmacy(
    p_item_id       BIGINT,
    p_quantity      INT,
    p_batch_number  VARCHAR,
    p_expiry_date   DATE,
    p_supplier      VARCHAR DEFAULT NULL,
    p_purchase_price NUMERIC(10,2) DEFAULT NULL
)
RETURNS INT AS $$
DECLARE
    v_new_total INT;
BEGIN
    IF p_quantity <= 0 THEN
        RAISE EXCEPTION 'Restock quantity must be positive';
    END IF;

    INSERT INTO pharmacy_stock (pharmacy_item_id, quantity, batch_number, expiry_date, supplier, purchase_price)
    VALUES (p_item_id, p_quantity, p_batch_number, p_expiry_date, p_supplier, p_purchase_price);
    -- stock_quantity is updated automatically by trg_pharmacy_stock_sync

    SELECT stock_quantity INTO v_new_total FROM pharmacy_items WHERE id = p_item_id;
    RETURN v_new_total;
END;
$$ LANGUAGE plpgsql;

-- Dashboard stats (used by the API to avoid N+1 queries)
CREATE OR REPLACE FUNCTION fn_dashboard_stats()
RETURNS TABLE (
    total_patients      BIGINT,
    today_appointments  BIGINT,
    current_admissions  BIGINT,
    available_rooms     BIGINT,
    pending_lab_tests   BIGINT,
    low_stock_items     BIGINT,
    pending_bills       BIGINT,
    monthly_revenue     NUMERIC,
    total_doctors       BIGINT,
    total_employees     BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM patients),
        (SELECT COUNT(*) FROM appointments WHERE DATE(appointment_date) = CURRENT_DATE),
        (SELECT COUNT(*) FROM admissions  WHERE status = 'ADMITTED'),
        (SELECT COUNT(*) FROM rooms       WHERE status = 'AVAILABLE'),
        (SELECT COUNT(*) FROM lab_tests   WHERE status NOT IN ('COMPLETED','CANCELLED')),
        (SELECT COUNT(*) FROM pharmacy_items WHERE stock_quantity <= reorder_level),
        (SELECT COUNT(*) FROM bills       WHERE status IN ('PENDING','PARTIAL')),
        (SELECT COALESCE(SUM(paid_amount),0) FROM bills
         WHERE  DATE_TRUNC('month', bill_date) = DATE_TRUNC('month', NOW())
           AND  status != 'CANCELLED'),
        (SELECT COUNT(*) FROM doctors),
        (SELECT COUNT(*) FROM employees);
END;
$$ LANGUAGE plpgsql;

-- ─── ADDITIONAL INDEXES (query-pattern driven) ────────────────
-- Appointment lookups by date range (dashboards, scheduling)
CREATE INDEX idx_appointments_date_status ON appointments(appointment_date, status);

-- Bill lookups by date for revenue reporting
CREATE INDEX idx_bills_date        ON bills(bill_date);
CREATE INDEX idx_bills_due_date    ON bills(due_date);

-- Lab test lookups by status (pending queue)
CREATE INDEX idx_lab_tests_status  ON lab_tests(status);

-- Admission lookups by room (room management)
CREATE INDEX idx_admissions_room   ON admissions(room_id) WHERE status = 'ADMITTED';

-- Payroll lookups by month across all employees
CREATE INDEX idx_payroll_month     ON payroll(month);

-- Pharmacy expiry tracking
CREATE INDEX idx_stock_expiry      ON pharmacy_stock(expiry_date);

-- Doctor email for auth linkage
CREATE INDEX idx_doctors_email     ON doctors(email);

-- Full-text search on patient name (GIN trgm index)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_patients_name_trgm     ON patients USING GIN (name gin_trgm_ops);
CREATE INDEX idx_doctors_name_trgm      ON doctors  USING GIN (name gin_trgm_ops);
CREATE INDEX idx_employees_name_trgm    ON employees USING GIN (name gin_trgm_ops);
CREATE INDEX idx_pharmacy_name_trgm     ON pharmacy_items USING GIN (name gin_trgm_ops);
