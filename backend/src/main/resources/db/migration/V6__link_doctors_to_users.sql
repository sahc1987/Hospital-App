-- Add user account link to doctors table
ALTER TABLE doctors
    ADD COLUMN user_id BIGINT REFERENCES users(id) ON DELETE SET NULL;

-- Enforce one doctor per user account
CREATE UNIQUE INDEX idx_doctors_user_id ON doctors(user_id) WHERE user_id IS NOT NULL;

-- Auto-link seeded doctors to their matching user accounts by email
UPDATE doctors d
SET    user_id = u.id
FROM   users u
WHERE  d.email = u.email
  AND  u.role  = 'DOCTOR';
