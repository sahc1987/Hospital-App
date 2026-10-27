-- V9: Inpatient care — room capacity, reliable occupancy, transfers, discharge summary,
--     progress notes, vitals, medication orders & administration.

-- ─── Capacity & occupancy ────────────────────────────────────────────────────
-- capacity 1 = single-patient room (default); wards hold several patients.
ALTER TABLE rooms ADD COLUMN capacity INT NOT NULL DEFAULT 1 CHECK (capacity BETWEEN 1 AND 50);

-- One active stay per patient.
CREATE UNIQUE INDEX uq_admission_active_patient ON admissions (patient_id) WHERE status = 'ADMITTED';

-- Room status is derived from active admissions (MAINTENANCE is the only manual state):
-- full -> OCCUPIED, otherwise AVAILABLE. Replaces V3's version, which freed a whole ward on one discharge.
CREATE OR REPLACE FUNCTION fn_refresh_room_status(p_room_id BIGINT) RETURNS VOID AS $$
BEGIN
    UPDATE rooms r
    SET    status = CASE
                      WHEN (SELECT COUNT(*) FROM admissions a WHERE a.room_id = r.id AND a.status = 'ADMITTED') >= r.capacity
                      THEN 'OCCUPIED' ELSE 'AVAILABLE' END
    WHERE  r.id = p_room_id AND r.status <> 'MAINTENANCE';
END;
$$ LANGUAGE plpgsql;

-- Capacity guard (race-proof: locks the room row) + status sync, for every write path.
CREATE OR REPLACE FUNCTION fn_admission_room_guard() RETURNS TRIGGER AS $$
DECLARE
    v_capacity INT;
    v_status   TEXT;
    v_active   INT;
BEGIN
    IF NEW.status = 'ADMITTED' AND NEW.room_id IS NOT NULL
       AND (TG_OP = 'INSERT' OR OLD.room_id IS DISTINCT FROM NEW.room_id OR OLD.status <> 'ADMITTED') THEN
        SELECT capacity, status INTO v_capacity, v_status FROM rooms WHERE id = NEW.room_id FOR UPDATE;
        IF v_status = 'MAINTENANCE' THEN
            RAISE EXCEPTION 'ROOM_UNAVAILABLE: room is under maintenance';
        END IF;
        SELECT COUNT(*) INTO v_active FROM admissions
        WHERE room_id = NEW.room_id AND status = 'ADMITTED' AND id <> COALESCE(NEW.id, -1);
        IF v_active >= v_capacity THEN
            RAISE EXCEPTION 'ROOM_FULL: room has no free bed';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_sync_room_on_admission() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.room_id IS NOT NULL THEN PERFORM fn_refresh_room_status(NEW.room_id); END IF;
    IF TG_OP = 'UPDATE' AND OLD.room_id IS NOT NULL AND OLD.room_id IS DISTINCT FROM NEW.room_id THEN
        PERFORM fn_refresh_room_status(OLD.room_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_admission_room_sync ON admissions;
CREATE TRIGGER trg_admission_room_guard BEFORE INSERT OR UPDATE ON admissions
    FOR EACH ROW EXECUTE FUNCTION fn_admission_room_guard();
CREATE TRIGGER trg_admission_room_sync AFTER INSERT OR UPDATE ON admissions
    FOR EACH ROW EXECUTE FUNCTION fn_sync_room_on_admission();

-- Repair existing drift (rooms marked OCCUPIED with nobody in them).
SELECT fn_refresh_room_status(id) FROM rooms;

-- ─── Admission record ────────────────────────────────────────────────────────
ALTER TABLE admissions
    ADD COLUMN appointment_id         BIGINT REFERENCES appointments(id) ON DELETE SET NULL, -- admitted from a visit
    ADD COLUMN final_diagnosis        TEXT,
    ADD COLUMN discharge_summary      TEXT,
    ADD COLUMN discharge_instructions TEXT,
    ADD COLUMN bill_id                BIGINT REFERENCES bills(id) ON DELETE SET NULL;

-- Append-only stay timeline: ADMITTED | TRANSFER | DISCHARGED | NOTE (progress) | ADDENDUM.
-- room ids on ADMITTED/TRANSFER rows are also the source for per-room charges.
CREATE TABLE admission_events (
    id           BIGSERIAL PRIMARY KEY,
    admission_id BIGINT      NOT NULL REFERENCES admissions(id) ON DELETE CASCADE,
    type         VARCHAR(20) NOT NULL,
    note         TEXT,
    from_room_id BIGINT REFERENCES rooms(id) ON DELETE SET NULL,
    to_room_id   BIGINT REFERENCES rooms(id) ON DELETE SET NULL,
    author       VARCHAR(50) NOT NULL,
    created_at   TIMESTAMP   NOT NULL
);
CREATE INDEX idx_admission_events ON admission_events (admission_id, created_at);

-- Backfill the timeline start for existing stays so charges and history work for them too.
INSERT INTO admission_events (admission_id, type, to_room_id, author, created_at)
SELECT id, 'ADMITTED', room_id, 'system', admission_date FROM admissions;

-- ─── Vitals ──────────────────────────────────────────────────────────────────
CREATE TABLE vitals (
    id           BIGSERIAL PRIMARY KEY,
    admission_id BIGINT       NOT NULL REFERENCES admissions(id) ON DELETE CASCADE,
    recorded_at  TIMESTAMP    NOT NULL,
    temp_c       NUMERIC(4,1) CHECK (temp_c BETWEEN 25 AND 45),
    systolic     INT          CHECK (systolic BETWEEN 40 AND 300),
    diastolic    INT          CHECK (diastolic BETWEEN 20 AND 200),
    pulse        INT          CHECK (pulse BETWEEN 20 AND 250),
    resp_rate    INT          CHECK (resp_rate BETWEEN 4 AND 80),
    spo2         INT          CHECK (spo2 BETWEEN 50 AND 100),
    pain         INT          CHECK (pain BETWEEN 0 AND 10),
    author       VARCHAR(50)  NOT NULL
);
CREATE INDEX idx_vitals_admission ON vitals (admission_id, recorded_at);

-- ─── Medication orders & administration record (MAR) ─────────────────────────
CREATE TABLE medication_orders (
    id           BIGSERIAL PRIMARY KEY,
    admission_id BIGINT       NOT NULL REFERENCES admissions(id) ON DELETE CASCADE,
    medication   VARCHAR(200) NOT NULL,
    dosage       VARCHAR(100),
    route        VARCHAR(50),
    frequency    VARCHAR(100),
    instructions TEXT,
    ordered_by   VARCHAR(50)  NOT NULL,
    ordered_at   TIMESTAMP    NOT NULL,
    stopped_by   VARCHAR(50),
    stopped_at   TIMESTAMP
);

CREATE TABLE medication_administrations (
    id        BIGSERIAL PRIMARY KEY,
    order_id  BIGINT      NOT NULL REFERENCES medication_orders(id) ON DELETE CASCADE,
    status    VARCHAR(10) NOT NULL CHECK (status IN ('GIVEN', 'HELD', 'REFUSED')),
    note      TEXT,
    given_by  VARCHAR(50) NOT NULL,
    given_at  TIMESTAMP   NOT NULL
);
CREATE INDEX idx_mar_order ON medication_administrations (order_id, given_at);
