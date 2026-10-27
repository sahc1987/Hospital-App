package com.hms.service;

import com.hms.dto.admission.AdmissionRequest;
import com.hms.dto.billing.BillRequest;
import com.hms.entity.Admission;
import com.hms.entity.Room;
import com.hms.entity.User;
import com.hms.entity.enums.AdmissionStatus;
import com.hms.entity.enums.RoomStatus;
import com.hms.entity.enums.UserRole;
import com.hms.exception.BadRequestException;
import com.hms.exception.ResourceNotFoundException;
import com.hms.repository.AdmissionRepository;
import com.hms.repository.AppointmentRepository;
import com.hms.repository.DoctorRepository;
import com.hms.repository.PatientRepository;
import com.hms.repository.RoomRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.dao.DataAccessException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;

/**
 * Inpatient stays. Room occupancy/capacity is enforced and derived by DB triggers (V9); this service
 * checks the same rules first for friendly messages. Timeline, notes, vitals and MAR use JdbcTemplate
 * (append-only tables, no entities), like appointment history.
 */
@Service
@RequiredArgsConstructor
@SuppressWarnings("java:S8688") // now() is hospital wall-clock time: the JVM zone *is* the hospital zone (TZ, see CLAUDE.md)
public class AdmissionService {

    private static final Set<UserRole> MOVERS = Set.of(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.NURSE, UserRole.DOCTOR);
    private static final Set<UserRole> CLINICAL = Set.of(UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE);
    private static final String ADMITTED = "ADMITTED";
    private static final String CREATED_AT = "created_at";
    private static final String NIGHTS = "nights";
    private static final String AMOUNT = "amount";
    private static final Set<String> MOVEMENT = Set.of(ADMITTED, "TRANSFER", "DISCHARGED");

    private final AdmissionRepository admissionRepo;
    private final PatientRepository patientRepo;
    private final DoctorRepository doctorRepo;
    private final RoomRepository roomRepo;
    private final AppointmentRepository appointmentRepo;
    private final BillingService billingService;
    private final JdbcTemplate jdbc;

    // ─── Reads ───────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Page<Admission> findAll(AdmissionStatus status, Pageable pageable) {
        return status == null ? admissionRepo.findAll(pageable) : admissionRepo.findAllByStatus(status, pageable);
    }

    @Transactional(readOnly = true)
    public Admission findById(Long id) {
        return load(id);
    }

    private Admission load(Long id) {
        return admissionRepo.findById(id).orElseThrow(() -> new ResourceNotFoundException("Admission", id));
    }

    @Transactional(readOnly = true)
    public Page<Admission> findByPatient(Long patientId, Pageable pageable) {
        return admissionRepo.findByPatientId(patientId, pageable);
    }

    /**
     * The stay: timeline, length of stay and running room cost for everyone with Admissions access;
     * discharge summary, progress notes, vitals and medications only for clinical roles.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> stayRecord(User actor, Long id) {
        Admission a = load(id);
        boolean clinical = CLINICAL.contains(actor.getRole());
        List<Map<String, Object>> events = localTimes(jdbc.queryForList(
                "SELECT e.id, e.type, e.note, e.author, e.created_at, fr.room_number AS from_room, tr.room_number AS to_room "
                        + "FROM admission_events e LEFT JOIN rooms fr ON fr.id = e.from_room_id LEFT JOIN rooms tr ON tr.id = e.to_room_id "
                        + "WHERE e.admission_id = ? ORDER BY e.created_at, e.id", id), CREATED_AT);
        if (!clinical) {
            // Movements only, and never the note: DISCHARGED carries the final diagnosis, TRANSFER a clinical reason
            events = events.stream().filter(e -> MOVEMENT.contains(e.get("type"))).toList();
            events.forEach(e -> e.remove("note"));
        }

        Map<String, Object> r = new HashMap<>();
        r.put("events", events);
        r.put("losDays", nights(a.getAdmissionDate(), a.getDischargeDate() != null ? a.getDischargeDate() : LocalDateTime.now()));
        // Discharged stays stop accruing at discharge
        r.put("accruedCost", charges(a, a.getDischargeDate() != null ? a.getDischargeDate() : LocalDateTime.now())
                .stream().map(c -> (BigDecimal) c.get(AMOUNT))
                .reduce(BigDecimal.ZERO, BigDecimal::add));
        if (clinical) {
            r.put("finalDiagnosis", a.getFinalDiagnosis());
            r.put("dischargeSummary", a.getDischargeSummary());
            r.put("dischargeInstructions", a.getDischargeInstructions());
            r.put("vitals", localTimes(jdbc.queryForList(
                    "SELECT * FROM vitals WHERE admission_id = ? ORDER BY recorded_at", id), "recorded_at"));
            List<Map<String, Object>> orders = localTimes(jdbc.queryForList(
                    "SELECT * FROM medication_orders WHERE admission_id = ? ORDER BY ordered_at", id), "ordered_at", "stopped_at");
            for (var o : orders) {
                o.put("administrations", localTimes(jdbc.queryForList(
                        "SELECT status, note, given_by, given_at FROM medication_administrations WHERE order_id = ? ORDER BY given_at DESC",
                        o.get("id")), "given_at"));
            }
            r.put("medications", orders);
        }
        return r;
    }

    // ─── Movements ───────────────────────────────────────────────────────────

    @Transactional
    @CacheEvict(value = "dashboard", allEntries = true)
    public Admission admit(User actor, AdmissionRequest req) {
        require(MOVERS, actor, "You can't admit patients");
        var patient = patientRepo.findById(req.patientId())
                .orElseThrow(() -> new ResourceNotFoundException("Patient", req.patientId()));
        var doctor = doctorRepo.findById(req.doctorId())
                .orElseThrow(() -> new ResourceNotFoundException("Doctor", req.doctorId()));
        if (admissionRepo.existsByPatientIdAndStatus(patient.getId(), AdmissionStatus.ADMITTED)) {
            throw new BadRequestException(patient.getName() + " is already admitted");
        }
        if (req.appointmentId() != null) {
            var appt = appointmentRepo.findById(req.appointmentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Appointment", req.appointmentId()));
            if (!appt.getPatient().getId().equals(patient.getId())) {
                throw new BadRequestException("That appointment belongs to another patient");
            }
        }
        Room room = req.roomId() == null ? null : checkBedFree(req.roomId());
        LocalDateTime at = req.admissionDate() != null ? req.admissionDate() : LocalDateTime.now();

        Admission saved = save(Admission.builder()
                .patient(patient).doctor(doctor).room(room).admissionDate(at)
                .diagnosis(req.diagnosis()).appointmentId(req.appointmentId()).build());
        event(saved.getId(), ADMITTED, req.diagnosis(), null, room, actor, at);
        return saved;
    }

    @Transactional
    @CacheEvict(value = "dashboard", allEntries = true)
    public Admission transfer(User actor, Long id, AdmissionRequest.Transfer req) {
        require(MOVERS, actor, "You can't transfer patients");
        Admission a = active(id);
        if (a.getRoom() != null && a.getRoom().getId().equals(req.roomId())) {
            throw new BadRequestException("The patient is already in that room");
        }
        Room from = a.getRoom();
        Room to = checkBedFree(req.roomId());
        a.setRoom(to);
        Admission saved = save(a);
        event(id, "TRANSFER", req.note(), from, to, actor, LocalDateTime.now());
        return saved;
    }

    /** Discharge with a summary (attending doctor or admin). Locks the record and bills the room nights. */
    @Transactional
    @CacheEvict(value = "dashboard", allEntries = true)
    public Admission discharge(User actor, Long id, AdmissionRequest.Discharge req) {
        Admission a = active(id);
        requireAttending(actor, a);
        LocalDateTime now = LocalDateTime.now();
        var items = charges(a, now);

        a.setStatus(AdmissionStatus.DISCHARGED);
        a.setDischargeDate(now);
        a.setFinalDiagnosis(req.finalDiagnosis());
        a.setDischargeSummary(req.summary());
        a.setDischargeInstructions(req.instructions());
        if (!items.isEmpty()) a.setBillId(bill(a, items));
        Admission saved = save(a);
        event(id, "DISCHARGED", req.finalDiagnosis(), a.getRoom(), null, actor, now);
        return saved;
    }

    // ─── Clinical record ─────────────────────────────────────────────────────

    /** Progress note while admitted; after discharge the same call adds an addendum (summary stays locked). */
    @Transactional
    public void addNote(User actor, Long id, AdmissionRequest.Note req) {
        require(CLINICAL, actor, "Only clinical staff can write notes");
        Admission a = load(id);
        event(id, a.getStatus() == AdmissionStatus.ADMITTED ? "NOTE" : "ADDENDUM", req.note(), null, null, actor, LocalDateTime.now());
    }

    @Transactional
    public void addVitals(User actor, Long id, AdmissionRequest.Vitals v) {
        require(CLINICAL, actor, "Only clinical staff can record vitals");
        active(id);
        if (Arrays.asList(v.tempC(), v.systolic(), v.diastolic(), v.pulse(), v.respRate(), v.spo2(), v.pain())
                .stream().allMatch(Objects::isNull)) {
            throw new BadRequestException("Enter at least one measurement");
        }
        jdbc.update("INSERT INTO vitals (admission_id, recorded_at, temp_c, systolic, diastolic, pulse, resp_rate, spo2, pain, author) "
                        + "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", id, LocalDateTime.now(), v.tempC(), v.systolic(), v.diastolic(),
                v.pulse(), v.respRate(), v.spo2(), v.pain(), actor.getUsername());
    }

    @Transactional
    public void orderMedication(User actor, Long id, AdmissionRequest.MedOrder m) {
        require(Set.of(UserRole.ADMIN, UserRole.DOCTOR), actor, "Only doctors can order medication");
        active(id);
        jdbc.update("INSERT INTO medication_orders (admission_id, medication, dosage, route, frequency, instructions, ordered_by, ordered_at) "
                + "VALUES (?, ?, ?, ?, ?, ?, ?, ?)", id, m.medication(), m.dosage(), m.route(), m.frequency(), m.instructions(),
                actor.getUsername(), LocalDateTime.now());
    }

    @Transactional
    public void stopMedication(User actor, Long orderId) {
        require(Set.of(UserRole.ADMIN, UserRole.DOCTOR), actor, "Only doctors can stop medication");
        int n = jdbc.update("UPDATE medication_orders SET stopped_by = ?, stopped_at = ? WHERE id = ? AND stopped_at IS NULL",
                actor.getUsername(), LocalDateTime.now(), orderId);
        if (n == 0) throw new BadRequestException("Order not found or already stopped");
    }

    @Transactional
    public void administer(User actor, Long orderId, AdmissionRequest.Administration req) {
        require(CLINICAL, actor, "Only clinical staff can record administration");
        List<Map<String, Object>> o = jdbc.queryForList(
                "SELECT o.stopped_at, a.status FROM medication_orders o JOIN admissions a ON a.id = o.admission_id WHERE o.id = ?", orderId);
        if (o.isEmpty()) throw new ResourceNotFoundException("Medication order", orderId);
        if (o.get(0).get("stopped_at") != null || !ADMITTED.equals(o.get(0).get("status"))) {
            throw new BadRequestException("This order is no longer active");
        }
        if (!"GIVEN".equals(req.status()) && (req.note() == null || req.note().isBlank())) {
            throw new BadRequestException("Say why the dose was held or refused");
        }
        jdbc.update("INSERT INTO medication_administrations (order_id, status, note, given_by, given_at) VALUES (?, ?, ?, ?, ?)",
                orderId, req.status(), req.note(), actor.getUsername(), LocalDateTime.now());
    }

    // ─── Rules & helpers ─────────────────────────────────────────────────────

    private Room checkBedFree(Long roomId) {
        Room room = roomRepo.findById(roomId).orElseThrow(() -> new ResourceNotFoundException("Room", roomId));
        if (room.getStatus() == RoomStatus.MAINTENANCE) throw new BadRequestException("Room " + room.getRoomNumber() + " is under maintenance");
        if (admissionRepo.countByRoomIdAndStatus(roomId, AdmissionStatus.ADMITTED) >= room.getCapacity()) {
            throw new BadRequestException("Room " + room.getRoomNumber() + " has no free bed");
        }
        return room;
    }

    /**
     * Room charges for a stay: one line per room segment (from the ADMITTED/TRANSFER timeline), nights ×
     * daily rate. Nights count calendar days crossed; a stay is billed at least one night.
     */
    List<Map<String, Object>> charges(Admission a, LocalDateTime end) {
        List<Map<String, Object>> segs = jdbc.queryForList(
                "SELECT e.to_room_id, e.created_at, r.room_number, r.room_type, r.daily_rate FROM admission_events e "
                        + "JOIN rooms r ON r.id = e.to_room_id WHERE e.admission_id = ? AND e.type IN ('ADMITTED', 'TRANSFER') "
                        + "ORDER BY e.created_at, e.id", a.getId());
        List<Map<String, Object>> lines = new ArrayList<>();
        for (int i = 0; i < segs.size(); i++) {
            LocalDateTime from = ((Timestamp) segs.get(i).get(CREATED_AT)).toLocalDateTime();
            LocalDateTime to = i + 1 < segs.size() ? ((Timestamp) segs.get(i + 1).get(CREATED_AT)).toLocalDateTime() : end;
            long n = nights(from, to);
            if (i == segs.size() - 1 && lines.stream().mapToLong(l -> (long) l.get(NIGHTS)).sum() + n == 0) n = 1; // minimum one night
            BigDecimal rate = (BigDecimal) segs.get(i).get("daily_rate");
            if (n == 0 || rate.signum() == 0) continue;
            lines.add(new HashMap<>(Map.of(
                    "label", "Room " + segs.get(i).get("room_number") + " (" + segs.get(i).get("room_type") + ")",
                    NIGHTS, n, "rate", rate, AMOUNT, rate.multiply(BigDecimal.valueOf(n)))));
        }
        return lines;
    }

    private Long bill(Admission a, List<Map<String, Object>> items) {
        var bill = billingService.create(new BillRequest(a.getPatient().getId(), a.getId(), null, BigDecimal.ZERO, null,
                LocalDateTime.now().plusDays(14), "Inpatient stay — admission #" + a.getId()));
        for (var i : items) { // bill_items trigger recalculates the bill total
            jdbc.update("INSERT INTO bill_items (bill_id, item_name, quantity, unit_price, amount) VALUES (?, ?, ?, ?, ?)",
                    bill.getId(), i.get("label") + " · " + i.get(NIGHTS) + " night(s)", ((Long) i.get(NIGHTS)).intValue(),
                    i.get("rate"), i.get(AMOUNT));
        }
        return bill.getId();
    }

    static long nights(LocalDateTime from, LocalDateTime to) {
        return Math.max(0, ChronoUnit.DAYS.between(from.toLocalDate(), to.toLocalDate()));
    }

    private Admission active(Long id) {
        Admission a = load(id);
        if (a.getStatus() != AdmissionStatus.ADMITTED) throw new BadRequestException("This stay is closed");
        return a;
    }

    /** Admin, the attending doctor, or — when the attending has no login — any doctor covering for them. */
    private void requireAttending(User actor, Admission a) {
        if (actor.getRole() == UserRole.ADMIN) return;
        boolean attending = actor.getRole() == UserRole.DOCTOR && (!a.getDoctor().hasLogin()
                || doctorRepo.findByUser_Id(actor.getId()).map(d -> d.getId().equals(a.getDoctor().getId())).orElse(false));
        if (!attending) throw new AccessDeniedException("Only the attending doctor can discharge");
    }

    private static void require(Set<UserRole> roles, User actor, String msg) {
        if (!roles.contains(actor.getRole())) throw new AccessDeniedException(msg);
    }

    /** Saves and maps the V9 trigger/index errors (raised under concurrent writes) to friendly 400s. */
    private Admission save(Admission a) {
        try {
            return admissionRepo.saveAndFlush(a);
        } catch (DataAccessException e) {
            String m = String.valueOf(e.getMostSpecificCause().getMessage());
            if (m.contains("ROOM_FULL")) throw new BadRequestException("That room just filled up — pick another");
            if (m.contains("ROOM_UNAVAILABLE")) throw new BadRequestException("That room is under maintenance");
            if (m.contains("uq_admission_active_patient")) throw new BadRequestException("The patient is already admitted");
            throw e;
        }
    }

    private void event(Long id, String type, String note, Room from, Room to, User actor, LocalDateTime at) {
        jdbc.update("INSERT INTO admission_events (admission_id, type, note, from_room_id, to_room_id, author, created_at) "
                        + "VALUES (?, ?, ?, ?, ?, ?, ?)", id, type, note,
                from == null ? null : from.getId(), to == null ? null : to.getId(), actor.getUsername(), at);
    }

    /** java.sql.Timestamp serializes as UTC+offset; every other API date is naive hospital-local. */
    private static List<Map<String, Object>> localTimes(List<Map<String, Object>> rows, String... cols) {
        for (var r : rows) for (String c : cols) r.computeIfPresent(c, (k, v) -> ((Timestamp) v).toLocalDateTime());
        return rows;
    }
}
