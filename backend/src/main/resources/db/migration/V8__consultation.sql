-- V8: Consultation workflow — visit documentation, timings, patient alerts, lab/bill links, fees.

ALTER TABLE patients
    ADD COLUMN allergies  TEXT,
    ADD COLUMN conditions TEXT;

-- Visit record. Locked once completed (corrections go to appointment_history as ADDENDUM rows).
ALTER TABLE appointments
    ADD COLUMN diagnosis     TEXT,
    ADD COLUMN visit_note    TEXT,
    ADD COLUMN checked_in_at TIMESTAMP,
    ADD COLUMN started_at    TIMESTAMP,
    ADD COLUMN completed_at  TIMESTAMP;

-- Lab tests ordered from a visit point back to it.
ALTER TABLE lab_tests
    ADD COLUMN appointment_id BIGINT REFERENCES appointments(id) ON DELETE SET NULL;

-- 0 = no automatic bill on completion.
ALTER TABLE doctors
    ADD COLUMN consultation_fee NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (consultation_fee >= 0);

-- One prescription per visit (prescriptions / prescription_items exist since V1, unused until now).
CREATE UNIQUE INDEX uq_prescription_appointment ON prescriptions (appointment_id) WHERE appointment_id IS NOT NULL;
