-- V7: Slot-based scheduling, strict lifecycle audit trail, double-booking guards.

-- Doctor working hours. Slots are [work_start, work_end) stepped by slot_minutes on work_days.
ALTER TABLE doctors
    ADD COLUMN work_start   TIME        NOT NULL DEFAULT '09:00',
    ADD COLUMN work_end     TIME        NOT NULL DEFAULT '17:00',
    ADD COLUMN slot_minutes INT         NOT NULL DEFAULT 30 CHECK (slot_minutes BETWEEN 5 AND 240),
    ADD COLUMN work_days    VARCHAR(30) NOT NULL DEFAULT 'MON,TUE,WED,THU,FRI',
    ADD CONSTRAINT chk_doctor_hours CHECK (work_end > work_start);

-- Length is frozen at booking time, so later slot-length changes can't corrupt overlap checks.
ALTER TABLE appointments
    ADD COLUMN duration_minutes INT NOT NULL DEFAULT 30,
    ADD COLUMN cancel_reason    TEXT;

-- Race-proof backstop for the app-level overlap check: one active booking per start time,
-- per doctor and per patient. CANCELLED / NO_SHOW free the slot again.
CREATE UNIQUE INDEX uq_appt_doctor_slot  ON appointments (doctor_id, appointment_date)
    WHERE status NOT IN ('CANCELLED', 'NO_SHOW');
CREATE UNIQUE INDEX uq_appt_patient_slot ON appointments (patient_id, appointment_date)
    WHERE status NOT IN ('CANCELLED', 'NO_SHOW');

-- Append-only audit trail: every status change and reschedule, who and when.
CREATE TABLE appointment_history (
    id             BIGSERIAL PRIMARY KEY,
    appointment_id BIGINT      NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    action         VARCHAR(30) NOT NULL,          -- CREATED | STATUS | RESCHEDULED | EDITED
    from_status    VARCHAR(20),
    to_status      VARCHAR(20),
    note           TEXT,
    changed_by     VARCHAR(50) NOT NULL,          -- username (kept even if the account is deleted)
    changed_at     TIMESTAMP   NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_appt_history_appt ON appointment_history (appointment_id, changed_at);
