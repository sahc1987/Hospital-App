package com.hms.service;

import com.hms.dto.appointment.AppointmentRequest;
import com.hms.dto.billing.BillRequest;
import com.hms.entity.Appointment;
import com.hms.entity.Doctor;
import com.hms.entity.Patient;
import com.hms.entity.User;
import com.hms.entity.enums.AppointmentStatus;
import com.hms.entity.enums.UserRole;
import com.hms.exception.BadRequestException;
import com.hms.exception.ResourceNotFoundException;
import com.hms.repository.AppointmentRepository;
import com.hms.repository.DoctorRepository;
import com.hms.repository.PatientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static com.hms.entity.enums.AppointmentStatus.*;

@Service
@RequiredArgsConstructor
@SuppressWarnings("java:S8688") // now() is hospital wall-clock time: the JVM zone *is* the hospital zone (TZ, see CLAUDE.md)
public class AppointmentService {

    // ponytail: fixed horizon — make it a setting if a clinic needs longer advance booking
    private static final int BOOKING_HORIZON_DAYS = 180;
    private static final List<AppointmentStatus> INACTIVE = List.of(CANCELLED, NO_SHOW);
    /** Roles allowed to book, reschedule, edit and cancel any appointment. */
    private static final Set<UserRole> FRONT_DESK = Set.of(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.NURSE);
    /** Roles that may read clinical records (visit notes, diagnoses, prescriptions). */
    private static final Set<UserRole> CLINICAL = Set.of(UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE);
    private static final String ADDENDUM = "ADDENDUM";

    private final AppointmentRepository repo;
    private final PatientRepository patientRepo;
    private final DoctorRepository doctorRepo;
    private final JdbcTemplate jdbc;
    private final BillingService billingService;

    // ─── Reads ───────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Appointment findById(Long id) {
        return load(id);
    }

    private Appointment load(Long id) {
        return repo.findById(id).orElseThrow(() -> new ResourceNotFoundException("Appointment", id));
    }

    /** All filters optional. `mine` narrows a doctor to their own appointments (ignored for other roles). */
    @Transactional(readOnly = true)
    public Page<Appointment> search(User actor, AppointmentRequest.Filter f, Pageable pageable) {
        Long effectiveDoctor = f.onlyMine() ? ownDoctorId(actor) : null;
        Long doctorFilter = effectiveDoctor != null ? effectiveDoctor : f.doctorId();
        List<Specification<Appointment>> s = new ArrayList<>();
        if (f.status() != null && !f.status().isEmpty()) s.add((r, q, cb) -> r.get("status").in(f.status()));
        if (doctorFilter != null) s.add((r, q, cb) -> cb.equal(r.get("doctor").get("id"), doctorFilter));
        if (f.patientId() != null) s.add((r, q, cb) -> cb.equal(r.get("patient").get("id"), f.patientId()));
        if (f.from() != null) s.add((r, q, cb) -> cb.greaterThanOrEqualTo(r.get("appointmentDate"), f.from().atStartOfDay()));
        if (f.to() != null) s.add((r, q, cb) -> cb.lessThan(r.get("appointmentDate"), f.to().plusDays(1).atStartOfDay()));
        if (f.q() != null && !f.q().isBlank()) {
            String like = "%" + f.q().toLowerCase().trim() + "%";
            s.add((r, q, cb) -> cb.like(cb.lower(r.get("patient").get("name")), like));
        }
        return repo.findAll(Specification.allOf(s), pageable);
    }

    @Transactional(readOnly = true)
    public Page<Appointment> findByPatient(Long patientId, Pageable pageable) {
        return repo.findByPatientId(patientId, pageable);
    }

    @Transactional(readOnly = true)
    public List<Appointment> findTodayAppointments() {
        LocalDateTime start = LocalDate.now().atStartOfDay();
        return repo.findByDateRange(start, start.plusDays(1));
    }

    /** Bookable start times for a doctor on a date: inside working hours, in the future, not overlapping. */
    @Transactional(readOnly = true)
    public List<LocalDateTime> freeSlots(Long doctorId, LocalDate date) {
        Doctor d = doctor(doctorId);
        if (!d.worksOn(date.getDayOfWeek())) return List.of();
        List<Appointment> booked = repo.findActiveForDoctor(
                doctorId, date.atStartOfDay(), date.plusDays(1).atStartOfDay(), INACTIVE);
        LocalDateTime now = LocalDateTime.now();
        List<LocalDateTime> free = new ArrayList<>();
        int slot = d.getSlotMinutes();
        int endMin = minuteOfDay(d.getWorkEnd());
        // ponytail: O(slots × bookings) per day — trivially small (≈16 × 16)
        for (int m = minuteOfDay(d.getWorkStart()); m + slot <= endMin; m += slot) {
            LocalDateTime start = date.atStartOfDay().plusMinutes(m);
            LocalDateTime end = start.plusMinutes(slot);
            boolean taken = booked.stream().anyMatch(a -> a.getAppointmentDate().isBefore(end) && a.getEndDate().isAfter(start));
            if (start.isAfter(now) && !taken) free.add(start);
        }
        return free;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> history(User actor, Long id) {
        load(id);
        List<Map<String, Object>> rows = jdbc.queryForList("SELECT action, from_status, to_status, note, changed_by, changed_at "
                + "FROM appointment_history WHERE appointment_id = ? ORDER BY changed_at, id", id);
        // Addenda are clinical record (corrections to the visit note): clinical roles only
        if (actor == null || !CLINICAL.contains(actor.getRole())) {
            rows = new ArrayList<>(rows.stream().filter(r -> !ADDENDUM.equals(r.get("action"))).toList());
        }
        // java.sql.Timestamp would serialize as UTC+offset; every other API date is naive hospital-local
        rows.forEach(r -> r.computeIfPresent("changed_at", (k, v) -> ((java.sql.Timestamp) v).toLocalDateTime()));
        return rows;
    }

    // ─── Writes ──────────────────────────────────────────────────────────────

    @Transactional
    @CacheEvict(value = "dashboard", allEntries = true)
    public Appointment create(User actor, AppointmentRequest req) {
        Doctor doctor = doctor(req.doctorId());
        requireBookingRights(actor, doctor.getId());
        Patient patient = patientRepo.findById(req.patientId())
                .orElseThrow(() -> new ResourceNotFoundException("Patient", req.patientId()));
        checkSlot(doctor, patient.getId(), req.appointmentDate(), doctor.getSlotMinutes(), -1);

        Appointment saved = save(Appointment.builder()
                .patient(patient).doctor(doctor).appointmentDate(req.appointmentDate())
                .durationMinutes(doctor.getSlotMinutes()).reason(req.reason()).build());
        log(saved.getId(), "CREATED", null, SCHEDULED, "Booked for " + req.appointmentDate(), actor);
        return saved;
    }

    /** Reschedule (new date) and/or edit reason & notes. Only while the appointment is still open. */
    @Transactional
    @CacheEvict(value = "dashboard", allEntries = true)
    public Appointment update(User actor, Long id, AppointmentRequest.Update req) {
        Appointment a = load(id);
        requireBookingRights(actor, a.getDoctor().getId());
        if (!a.getStatus().isOpen()) {
            throw new BadRequestException("Only scheduled or confirmed appointments can be changed");
        }
        if (req.appointmentDate() != null && !req.appointmentDate().equals(a.getAppointmentDate())) {
            checkSlot(a.getDoctor(), a.getPatient().getId(), req.appointmentDate(), a.getDoctor().getSlotMinutes(), id);
            log(id, "RESCHEDULED", a.getStatus(), SCHEDULED,
                    "From " + a.getAppointmentDate() + " to " + req.appointmentDate(), actor);
            a.setAppointmentDate(req.appointmentDate());
            a.setDurationMinutes(a.getDoctor().getSlotMinutes());
            a.setStatus(SCHEDULED); // new time needs re-confirming
        }
        if (req.reason() != null || req.notes() != null) {
            if (req.reason() != null) a.setReason(req.reason());
            if (req.notes() != null) a.setNotes(req.notes());
            log(id, "EDITED", null, null, "Reason/notes updated", actor);
        }
        return save(a);
    }

    @Transactional
    @CacheEvict(value = "dashboard", allEntries = true)
    public Appointment changeStatus(User actor, Long id, AppointmentRequest.StatusChange req) {
        Appointment a = load(id);
        AppointmentStatus from = a.getStatus();
        AppointmentStatus to = req.status();
        requireStatusRights(actor, a, to);
        checkTransition(a, to, req.note());

        stamp(a, to, req.note());
        log(id, "STATUS", from, to, req.note(), actor);
        Appointment saved = save(a);
        if (to == COMPLETED) billConsultation(saved);
        return saved;
    }

    private void requireStatusRights(User actor, Appointment a, AppointmentStatus to) {
        boolean actsFor = actsFor(actor, a.getDoctor());
        if (to.isClinical()) {
            if (actor.getRole() != UserRole.ADMIN && !actsFor) {
                throw new AccessDeniedException("Only the appointment's doctor can start or complete the consultation");
            }
        } else if (!FRONT_DESK.contains(actor.getRole()) && !actsFor) {
            throw new AccessDeniedException("You can only change your own appointments");
        }
    }

    private static void checkTransition(Appointment a, AppointmentStatus to, String note) {
        AppointmentStatus from = a.getStatus();
        if (!from.next().contains(to)) {
            throw new BadRequestException("Cannot change " + label(from) + " to " + label(to));
        }
        if (to == CANCELLED && blank(note)) {
            throw new BadRequestException("A reason is required to cancel");
        }
        LocalDate day = a.getAppointmentDate().toLocalDate();
        if (to == CHECKED_IN && !day.equals(LocalDate.now())) {
            throw new BadRequestException("Patients can only be checked in on the appointment day");
        }
        if (to == NO_SHOW && a.getAppointmentDate().isAfter(LocalDateTime.now())) {
            throw new BadRequestException("Can't mark a no-show before the appointment time");
        }

        if (to == COMPLETED && (blank(a.getDiagnosis()) || blank(a.getVisitNote()))) {
            throw new BadRequestException("Add a diagnosis and visit note before completing");
        }
    }

    /** Applies the new status plus its timestamp / cancel reason. */
    private static void stamp(Appointment a, AppointmentStatus to, String note) {
        LocalDateTime now = LocalDateTime.now();
        a.setStatus(to);
        switch (to) {
            case CANCELLED -> a.setCancelReason(note);
            case CHECKED_IN -> a.setCheckedInAt(now);
            case IN_CONSULTATION -> a.setStartedAt(now);
            case COMPLETED -> a.setCompletedAt(now);
            default -> { /* CONFIRMED / NO_SHOW / SCHEDULED carry no timestamp */ }
        }
    }

    // ─── Consultation ────────────────────────────────────────────────────────

    /** Visit record for clinical roles: documentation, timings, prescription and addenda. */
    @Transactional(readOnly = true)
    public Map<String, Object> visit(User actor, Long id) {
        requireClinical(actor);
        Appointment a = load(id);
        Map<String, Object> v = new java.util.HashMap<>();
        v.put("diagnosis", a.getDiagnosis());
        v.put("visitNote", a.getVisitNote());
        v.put("prescription", prescription(id));
        v.put("addenda", history(actor, id).stream().filter(h -> ADDENDUM.equals(h.get("action"))).toList());
        v.put("labTests", jdbc.queryForList("SELECT id, test_name, status FROM lab_tests WHERE appointment_id = ? ORDER BY id", id));
        return v;
    }

    @Transactional
    public void saveVisit(User actor, Long id, AppointmentRequest.Visit req) {
        Appointment a = documentable(actor, id);
        a.setDiagnosis(req.diagnosis());
        a.setVisitNote(req.visitNote());
        save(a);
    }

    /** Replaces the visit's prescription lines. */
    @Transactional
    public List<Map<String, Object>> savePrescription(User actor, Long id, List<AppointmentRequest.RxItem> items) {
        Appointment a = documentable(actor, id);
        if (items.stream().anyMatch(i -> blank(i.medication()))) {
            throw new BadRequestException("Every prescription line needs a medication");
        }
        jdbc.update("DELETE FROM prescriptions WHERE appointment_id = ?", id); // items cascade
        if (!items.isEmpty()) {
            Long rxId = jdbc.queryForObject("INSERT INTO prescriptions (appointment_id, doctor_id, patient_id, created_at, updated_at) "
                    + "VALUES (?, ?, ?, ?, ?) RETURNING id", Long.class,
                    id, a.getDoctor().getId(), a.getPatient().getId(), LocalDateTime.now(), LocalDateTime.now());
            for (var i : items) {
                jdbc.update("INSERT INTO prescription_items (prescription_id, medication, dosage, frequency, duration, instructions) "
                        + "VALUES (?, ?, ?, ?, ?, ?)", rxId, i.medication(), i.dosage(), i.frequency(), i.duration(), i.instructions());
            }
        }
        log(id, "EDITED", null, null, "Prescription updated (" + items.size() + " item" + (items.size() == 1 ? "" : "s") + ")", actor);
        return prescription(id);
    }

    @Transactional
    public void addAddendum(User actor, Long id, AppointmentRequest.Addendum req) {
        Appointment a = load(id);
        requireTreatingDoctor(actor, a);
        if (a.getStatus() != COMPLETED) throw new BadRequestException("Addenda are for completed visits; edit the note instead");
        log(id, ADDENDUM, null, null, req.note(), actor);
    }

    /** Completed visits of a patient with their documentation, newest first (clinical roles). */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> patientVisits(User actor, Long patientId) {
        requireClinical(actor);
        List<Map<String, Object>> rows = jdbc.queryForList("SELECT a.id, a.appointment_date, a.diagnosis, a.visit_note, d.name AS doctor "
                + "FROM appointments a JOIN doctors d ON d.id = a.doctor_id "
                + "WHERE a.patient_id = ? AND a.status = 'COMPLETED' ORDER BY a.appointment_date DESC LIMIT 20", patientId);
        rows.forEach(r -> r.computeIfPresent("appointment_date", (k, v) -> ((java.sql.Timestamp) v).toLocalDateTime()));
        return rows;
    }

    private List<Map<String, Object>> prescription(Long id) {
        return jdbc.queryForList("SELECT i.medication, i.dosage, i.frequency, i.duration, i.instructions "
                + "FROM prescriptions p JOIN prescription_items i ON i.prescription_id = p.id "
                + "WHERE p.appointment_id = ? ORDER BY i.id", id);
    }

    /** Visit documentation is the treating doctor's, only while the patient is here. */
    private Appointment documentable(User actor, Long id) {
        Appointment a = load(id);
        requireTreatingDoctor(actor, a);
        if (a.getStatus() != CHECKED_IN && a.getStatus() != IN_CONSULTATION) {
            throw new BadRequestException(a.getStatus() == COMPLETED
                    ? "This visit is completed and locked — add an addendum instead"
                    : "The patient must be checked in first");
        }
        return a;
    }

    private void requireTreatingDoctor(User actor, Appointment a) {
        if (!actsFor(actor, a.getDoctor())) {
            throw new AccessDeniedException("Only the treating doctor can document this visit");
        }
    }

    /** Admin, the doctor themself, or — when that doctor has no login — any doctor covering for them. */
    private boolean actsFor(User actor, Doctor d) {
        if (actor.getRole() == UserRole.ADMIN) return true;
        if (actor.getRole() != UserRole.DOCTOR) return false;
        return !d.hasLogin() || d.getId().equals(ownDoctorId(actor));
    }

    private static void requireClinical(User actor) {
        if (!CLINICAL.contains(actor.getRole())) throw new AccessDeniedException("Clinical records are restricted");
    }

    private void billConsultation(Appointment a) {
        var fee = a.getDoctor().getConsultationFee();
        if (fee == null || fee.signum() <= 0) return; // ponytail: no fee set = no bill (set it on the Doctors page)
        billingService.create(new BillRequest(a.getPatient().getId(), null, a.getId(), fee, null,
                LocalDateTime.now().plusDays(14), "Consultation — " + a.getDoctor().getName()));
    }

    private static boolean blank(String s) {
        return s == null || s.isBlank();
    }

    // ─── Rules ───────────────────────────────────────────────────────────────

    private void checkSlot(Doctor d, Long patientId, LocalDateTime start, int minutes, long excludeId) {
        LocalDateTime now = LocalDateTime.now();
        if (!start.isAfter(now)) throw new BadRequestException("Appointment time must be in the future");
        if (start.isAfter(now.plusDays(BOOKING_HORIZON_DAYS))) {
            throw new BadRequestException("Appointments can be booked up to " + BOOKING_HORIZON_DAYS + " days ahead");
        }
        if (!d.worksOn(start.getDayOfWeek())) {
            throw new BadRequestException(d.getName() + " doesn't work on " + start.getDayOfWeek().name().toLowerCase());
        }
        // Minutes-of-day ints: LocalTime arithmetic silently wraps at midnight
        int m = minuteOfDay(start.toLocalTime());
        int open = minuteOfDay(d.getWorkStart());
        boolean onGrid = start.getSecond() == 0 && start.getNano() == 0 && (m - open) % d.getSlotMinutes() == 0;
        if (m < open || m + minutes > minuteOfDay(d.getWorkEnd()) || !onGrid) {
            throw new BadRequestException("Pick a " + d.getSlotMinutes() + "-minute slot between "
                    + d.getWorkStart() + " and " + d.getWorkEnd());
        }
        LocalDateTime end = start.plusMinutes(minutes);
        if (repo.doctorBusy(d.getId(), start, end, excludeId)) {
            throw new BadRequestException(d.getName() + " is already booked at that time");
        }
        if (repo.patientBusy(patientId, start, end, excludeId)) {
            throw new BadRequestException("The patient already has an appointment at that time");
        }
    }

    private void requireBookingRights(User actor, Long doctorId) {
        if (FRONT_DESK.contains(actor.getRole())) return;
        if (doctorId.equals(ownDoctorId(actor))) return; // doctors manage their own diary
        throw new AccessDeniedException("You can't manage this doctor's appointments");
    }

    /** The doctor record linked to this user, or null for non-doctors. */
    private Long ownDoctorId(User actor) {
        if (actor.getRole() != UserRole.DOCTOR) return null;
        return doctorRepo.findByUser_Id(actor.getId()).map(Doctor::getId).orElse(null);
    }

    private Appointment save(Appointment a) {
        try {
            return repo.saveAndFlush(a);
        } catch (DataIntegrityViolationException e) {
            // uq_appt_*_slot: someone booked the same slot between our check and this insert
            throw new BadRequestException("That time was just booked by someone else — pick another slot");
        }
    }

    private void log(Long id, String action, AppointmentStatus from, AppointmentStatus to, String note, User actor) {
        // changed_at from the JVM (hospital TZ), not DB NOW(): Postgres runs in UTC
        jdbc.update("INSERT INTO appointment_history (appointment_id, action, from_status, to_status, note, changed_by, changed_at) "
                        + "VALUES (?, ?, ?, ?, ?, ?, ?)",
                id, action, from == null ? null : from.name(), to == null ? null : to.name(), note, actor.getUsername(),
                LocalDateTime.now());
    }

    private Doctor doctor(Long id) {
        return doctorRepo.findById(id).orElseThrow(() -> new ResourceNotFoundException("Doctor", id));
    }

    private static int minuteOfDay(LocalTime t) {
        return t.getHour() * 60 + t.getMinute();
    }

    private static String label(AppointmentStatus s) {
        return s.name().toLowerCase().replace('_', ' ');
    }
}
