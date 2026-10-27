package com.hms.service;

import com.hms.dto.user.LinkRequest;
import com.hms.dto.user.UserRequest;
import com.hms.dto.user.UserResponse;
import com.hms.entity.Department;
import com.hms.entity.Doctor;
import com.hms.entity.Employee;
import com.hms.entity.User;
import com.hms.entity.enums.UserRole;
import com.hms.exception.BadRequestException;
import com.hms.exception.ResourceNotFoundException;
import com.hms.repository.DepartmentRepository;
import com.hms.repository.DoctorRepository;
import com.hms.repository.EmployeeRepository;
import com.hms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@SuppressWarnings("java:S8688") // now() is hospital wall-clock time: the JVM zone *is* the hospital zone (TZ, see CLAUDE.md)
public class UserService {

    private final UserRepository       userRepository;
    private final PasswordEncoder      passwordEncoder;
    private final DoctorRepository     doctorRepository;
    private final EmployeeRepository   employeeRepository;
    private final DepartmentRepository departmentRepository;

    @Transactional(readOnly = true)
    public Page<UserResponse> list(String q, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<User> users = (q != null && !q.isBlank())
                ? userRepository.findByUsernameContainingIgnoreCaseOrFullNameContainingIgnoreCase(q, q, pageable)
                : userRepository.findAll(pageable);
        return enrichPage(users);
    }

    @Transactional(readOnly = true)
    public UserResponse get(Long id) {
        return enrichSingle(findOrThrow(id));
    }

    @Transactional
    public UserResponse create(UserRequest req) {
        if (req.password() == null || req.password().isBlank()) {
            throw new BadRequestException("Password is required when creating a user");
        }
        if (userRepository.existsByUsername(req.username())) {
            throw new BadRequestException("Username '" + req.username() + "' is already taken");
        }
        if (userRepository.existsByEmail(req.email())) {
            throw new BadRequestException("Email '" + req.email() + "' is already registered");
        }
        User user = User.builder()
                .username(req.username())
                .password(passwordEncoder.encode(req.password()))
                .email(req.email())
                .fullName(req.fullName())
                .role(req.role())
                .active(true)
                .build();
        User saved = userRepository.save(Objects.requireNonNull(user));

        if (req.role() == UserRole.DOCTOR) {
            Department dept = loadDepartment(req.departmentId());
            Doctor doctor = Doctor.builder()
                    .name(req.fullName())
                    .email(req.email())
                    .specialization(req.specialization())
                    .licenseNumber(req.licenseNumber())
                    .phone(req.phone())
                    .department(dept)
                    .user(saved)
                    .build();
            doctorRepository.save(doctor);
            return UserResponse.withDoctor(saved, doctor);
        } else if (req.role() != UserRole.ADMIN) {
            Department dept = loadDepartment(req.departmentId());
            Employee employee = Employee.builder()
                    .name(req.fullName())
                    .email(req.email())
                    .role(req.role().name())
                    .phone(req.phone())
                    .department(dept)
                    .hireDate(req.hireDate() != null ? req.hireDate() : LocalDate.now())
                    .user(saved)
                    .build();
            employeeRepository.save(employee);
            return UserResponse.withEmployee(saved, employee);
        }

        return UserResponse.from(saved);
    }

    @Transactional
    public UserResponse update(Long id, UserRequest req) {
        User user = findOrThrow(id);
        if (!user.getUsername().equals(req.username()) && userRepository.existsByUsername(req.username())) {
            throw new BadRequestException("Username '" + req.username() + "' is already taken");
        }
        if (!user.getEmail().equals(req.email()) && userRepository.existsByEmail(req.email())) {
            throw new BadRequestException("Email '" + req.email() + "' is already registered");
        }
        user.setUsername(req.username());
        user.setEmail(req.email());
        user.setFullName(req.fullName());
        user.setRole(req.role());
        if (req.password() != null && !req.password().isBlank()) {
            user.setPassword(passwordEncoder.encode(req.password()));
        }
        return enrichSingle(userRepository.save(user));
    }

    @Transactional
    public UserResponse toggleActive(Long id) {
        User user = findOrThrow(id);
        user.setActive(!user.isActive());
        return enrichSingle(userRepository.save(user));
    }

    @Transactional
    public void delete(Long id) {
        if (!userRepository.existsById(Objects.requireNonNull(id))) {
            throw new ResourceNotFoundException("User", id);
        }
        userRepository.deleteById(Objects.requireNonNull(id));
    }

    @Transactional
    public UserResponse linkStaff(Long userId, LinkRequest req) {
        User user = findOrThrow(userId);
        clearExistingLinks(userId);

        if ("DOCTOR".equalsIgnoreCase(req.staffType())) {
            Long staffId = Objects.requireNonNull(req.staffId());
            Doctor doctor = doctorRepository.findById(staffId)
                    .orElseThrow(() -> new ResourceNotFoundException("Doctor", staffId));
            if (doctor.getUser() != null && !doctor.getUser().getId().equals(userId)) {
                throw new BadRequestException("This doctor record is already linked to another user account");
            }
            doctor.setUser(user);
            doctorRepository.save(doctor);
            return UserResponse.withDoctor(user, doctor);

        } else if ("EMPLOYEE".equalsIgnoreCase(req.staffType())) {
            Long staffId = Objects.requireNonNull(req.staffId());
            Employee employee = employeeRepository.findById(staffId)
                    .orElseThrow(() -> new ResourceNotFoundException("Employee", staffId));
            if (employee.getUser() != null && !employee.getUser().getId().equals(userId)) {
                throw new BadRequestException("This employee record is already linked to another user account");
            }
            employee.setUser(user);
            employeeRepository.save(employee);
            return UserResponse.withEmployee(user, employee);

        } else {
            throw new BadRequestException("Invalid staffType '" + req.staffType() + "'. Use DOCTOR or EMPLOYEE");
        }
    }

    @Transactional
    public UserResponse unlinkStaff(Long userId) {
        User user = findOrThrow(userId);
        clearExistingLinks(userId);
        return UserResponse.from(user);
    }

    // ─── Private helpers ─────────────────────────────────────────────────────

    private void clearExistingLinks(Long userId) {
        doctorRepository.findByUser_Id(userId).ifPresent(d -> {
            d.setUser(null);
            doctorRepository.save(d);
        });
        employeeRepository.findByUser_Id(userId).ifPresent(e -> {
            e.setUser(null);
            employeeRepository.save(e);
        });
    }

    private UserResponse enrichSingle(User user) {
        Optional<Doctor> doctor = doctorRepository.findByUser_Id(user.getId());
        if (doctor.isPresent()) return UserResponse.withDoctor(user, doctor.get());
        Optional<Employee> emp = employeeRepository.findByUser_Id(user.getId());
        if (emp.isPresent()) return UserResponse.withEmployee(user, emp.get());
        return UserResponse.from(user);
    }

    private Page<UserResponse> enrichPage(Page<User> users) {
        if (users.isEmpty()) return users.map(UserResponse::from);

        List<Long> ids = users.getContent().stream().map(u -> u.getId()).toList();

        Map<Long, Doctor> docMap = new HashMap<>();
        doctorRepository.findByUser_IdIn(ids).forEach(d -> docMap.put(d.getUser().getId(), d));

        Map<Long, Employee> empMap = new HashMap<>();
        employeeRepository.findByUser_IdIn(ids).forEach(e -> empMap.put(e.getUser().getId(), e));

        return users.map(u -> {
            Doctor d = docMap.get(u.getId());
            if (d != null) return UserResponse.withDoctor(u, d);
            Employee e = empMap.get(u.getId());
            if (e != null) return UserResponse.withEmployee(u, e);
            return UserResponse.from(u);
        });
    }

    private User findOrThrow(Long id) {
        return userRepository.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new ResourceNotFoundException("User", id));
    }

    private Department loadDepartment(Long departmentId) {
        if (departmentId == null) return null;
        return departmentRepository.findById(departmentId).orElse(null);
    }
}
