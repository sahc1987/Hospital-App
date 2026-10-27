-- V10: Deleting a patient or doctor must never erase clinical/financial history.
-- These FKs were ON DELETE CASCADE (V1); RESTRICT makes the delete fail instead, and the API
-- turns that into a 400 ("has records"). Patients/doctors with no history can still be deleted.

ALTER TABLE appointments     DROP CONSTRAINT appointments_patient_id_fkey,
    ADD CONSTRAINT appointments_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE RESTRICT;
ALTER TABLE appointments     DROP CONSTRAINT appointments_doctor_id_fkey,
    ADD CONSTRAINT appointments_doctor_id_fkey  FOREIGN KEY (doctor_id)  REFERENCES doctors(id)  ON DELETE RESTRICT;
ALTER TABLE admissions       DROP CONSTRAINT admissions_patient_id_fkey,
    ADD CONSTRAINT admissions_patient_id_fkey   FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE RESTRICT;
ALTER TABLE admissions       DROP CONSTRAINT admissions_doctor_id_fkey,
    ADD CONSTRAINT admissions_doctor_id_fkey    FOREIGN KEY (doctor_id)  REFERENCES doctors(id)  ON DELETE RESTRICT;
ALTER TABLE bills            DROP CONSTRAINT bills_patient_id_fkey,
    ADD CONSTRAINT bills_patient_id_fkey        FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE RESTRICT;
ALTER TABLE insurance_claims DROP CONSTRAINT insurance_claims_patient_id_fkey,
    ADD CONSTRAINT insurance_claims_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE RESTRICT;
ALTER TABLE lab_tests        DROP CONSTRAINT lab_tests_patient_id_fkey,
    ADD CONSTRAINT lab_tests_patient_id_fkey    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE RESTRICT;
ALTER TABLE prescriptions    DROP CONSTRAINT prescriptions_patient_id_fkey,
    ADD CONSTRAINT prescriptions_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE RESTRICT;
ALTER TABLE prescriptions    DROP CONSTRAINT prescriptions_doctor_id_fkey,
    ADD CONSTRAINT prescriptions_doctor_id_fkey FOREIGN KEY (doctor_id)  REFERENCES doctors(id)  ON DELETE RESTRICT;
