# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

The repo has two halves: a Spring Boot API in `backend/` and a React SPA in `frontend/`. There is no Maven wrapper, so use `mvn` directly.

```bash
# Full stack (needs JWT_SECRET in .env, or compose refuses to start)
docker compose up -d --build                  # frontend :3000, backend :8080
docker compose up -d --build backend          # rebuild one service after changes

# Backend (JDK 21+; Lombok 1.18.42 also supports JDK 25)
cd backend
mvn compile
mvn test
mvn test -Dtest=AccessMatrixTest              # single test class
mvn test -Dtest=AccessMatrixTest#enforcesMatrix
mvn spring-boot:run                           # needs JWT_SECRET, plus Postgres/Redis on localhost

# Frontend
cd frontend
npm run dev                                   # Vite on :3000, proxies /api -> VITE_API_URL (default :8080)
npx tsc --noEmit -p .                         # type-check only
npm run build                                 # tsc + vite build
```

Postgres and Redis are not published to the host in `docker-compose.yml`; only the backend can reach them, over `hms-network`. To inspect them, use `docker exec hms-postgres psql -U hms_user -d hms_db` and `docker exec hms-redis redis-cli -a <REDIS_PASSWORD>`. The Vite dev server and the Docker frontend both bind port 3000.

Every seeded demo account uses the password `Admin@123`: `admin`, `dr_smith`, `nurse_kim`, `recept_anna`, `lab_mike`, `pharma_sara`, `hr_david`, and the rest are listed in the README. 5 failed logins lock a username for 15 minutes. To clear a lockout, delete the Redis key `login:fail:<username>`.

## Architecture

### Request flow and auth
- The browser only ever calls same-origin `/api`. Nginx in Docker (`frontend/nginx.conf`) and Vite in dev proxy it to the backend. Auth depends on this, because tokens travel in HttpOnly `SameSite=Strict` cookies, not headers.
  - `hms_access` has path `/api`. `hms_refresh` has path `/api/auth`.
  - `AuthController` sets and clears both cookies. Response bodies never contain tokens (`AuthResponse.withoutTokens()`).
  - `JwtAuthFilter` reads only the `hms_access` cookie. `Authorization: Bearer` is not supported.
  - CSRF is disabled on purpose; `SameSite=Strict` covers it.
- JWTs carry a `typ` claim (`access` or `refresh`), checked with `JwtTokenProvider.isType`. Revocation (logout, refresh rotation) blacklists the token's `jti` in Redis via `TokenBlacklistService`. The filter also rejects users whose account is inactive.
- Unauthenticated requests get **401**, from the `HttpStatusEntryPoint`. The frontend axios interceptor (`frontend/src/api/client.ts`) logs out on 401, except for `/auth/login`.
  - `/error` must stay `permitAll`. Error dispatches skip the JWT filter, so without it a 403 gets rewritten to a 401 and the user is logged out.

### Role-based access: two layers that must stay in sync
1. **Route matrix (backend):** the `role_permissions` table (V5 migration) maps a role to frontend routes such as `/billing`. `SecurityConfig.checkAccessMatrix` enforces it for `/api/**`. It maps the first path segment after `/api` to a route using `API_ROUTES`; for example `bills` maps to `/billing`.
   - `ADMIN` always passes.
   - **Deny by default:** a prefix missing from `API_ROUTES` gets a 403, unless it's in `SELF_GUARDED` (`auth`, `users`, `permissions`, which have their own checks). A new controller stays closed until it's mapped.
   - Responses that mix movement data with clinical text must strip the clinical fields for non-clinical roles. `RoleVisibilityTest` guards the stay timeline and the appointment history.
   - `/api/dashboard/**` and `/api/appointments/today` are open to every authenticated role, because every role's dashboard calls them.
   - **When adding a controller or a page:**
     - Add an `API_ROUTES` entry.
     - Seed `role_permissions` rows in a new migration.
     - Update `DEFAULT_MATRIX` in `frontend/src/store/permissionsStore.ts`.
   - If a page loads data from another module, every role that can see the page also needs that module's route.
2. **`@PreAuthorize`:** finer-grained checks on individual endpoints, such as admin-only writes on doctors, departments, patients, users and permissions.

The frontend fetches the matrix from `GET /api/permissions` in `DashboardLayout`. It uses the matrix only to hide routes and nav items (`utils/permissions.ts` `canAccess`), so it is never the security boundary.

### Backend conventions
- Layering is controller → service → Spring Data repository. Every response is wrapped in `ApiResponse<T>` (`{success, message, data}`), and list endpoints return a Spring `Page` inside `data`.
- Errors are handled in `GlobalExceptionHandler`: throw `BadRequestException` (400) or `ResourceNotFoundException` (404). Validation errors come back as `{fields: {...}}`, which the frontend renders per field.
- Most controllers return **JPA entities directly**, serialized by Jackson with `Hibernate6Module` (lazy proxies that weren't loaded become null). This has caused bugs:
  - Bidirectional relations need `@JsonIgnore` on the back-reference. `LabResult.labTest` once caused infinite recursion.
  - `User.password` is `@JsonIgnore` because `User` hangs off `Doctor`, `Employee` and `LabResult`.
  - Only `User`, `Doctor` and `Patient` have DTOs; the latter two go through the MapStruct mappers in `mapper/`.
- **Redis caching:** `@Cacheable` is used on patients and dashboard stats, with `@CacheEvict` in the services that write them. Doctors are uncached, because their lazy department proxy can't go into Redis. `RedisConfig` uses NON_FINAL typing extended to records (a small custom `DefaultTypeResolverBuilder`; Jackson 2.x has no built-in option for it), which records such as `DashboardStats` need. Don't cache entities that have lazy relations. When you change a cached type's shape, flush the stale keys.
- **Schema:** Flyway owns it (`ddl-auto: validate`). Never edit an applied migration, because the checksums will fail; add `V<n+1>__*.sql` instead.
  - V3 installs DB triggers: `updated_at` timestamps, room status synced on admission and discharge (`fn_sync_room_on_admission`), and bill totals recalculated from bill items (`fn_recalc_bill_total`). Don't duplicate that logic in Java.
  - V4 converted the Postgres enum columns to TEXT, so entities use `@Enumerated(EnumType.STRING)`.

### Appointments
- **Times:** all times are naive local times in the hospital zone, `TZ` in `docker-compose.yml` (default `America/New_York`). The JVM evaluates "now", "today" and working hours in that zone, while Postgres stays in UTC, so take timestamps from Java, never from `NOW()`.
- **Booking:** bookings must land on a doctor's slot grid (`doctors.work_start`/`work_end`/`slot_minutes`/`work_days`, from V7), up to 180 days ahead.
  - Overlaps for both the doctor and the patient are checked in `AppointmentService.checkSlot`.
  - Partial unique indexes back that check up against races.
  - Each appointment stores `duration_minutes` at booking time.
- **Lifecycle:** `AppointmentStatus.next()` holds the allowed transitions. COMPLETED, CANCELLED and NO_SHOW are final, and a cancel needs a reason.
  - Every create, status change, reschedule and edit is appended to `appointment_history`.
  - There is no DELETE endpoint, on purpose.
- **Roles:** ADMIN, RECEPTIONIST and NURSE book, reschedule and cancel anything. A doctor can do all of that only in their own diary, through the user→doctor link (`doctors.user_id`). Only the doctor or an admin can mark an appointment COMPLETED.
- `pages/Appointments.tsx` mirrors these rules only to decide which buttons to show.
- **Consultation (V8):** the flow continues CHECKED_IN → IN_CONSULTATION → COMPLETED, and only the treating doctor or an admin can move it.
  - **Notes:** `diagnosis` and `visit_note` are required to complete. After completion they're locked; corrections go into `appointment_history` as ADDENDUM rows.
  - **Privacy:** those fields are `@JsonIgnore` on `Appointment` because front-desk roles can read appointments. They're served only through `GET /{id}/visit` and `/patient/{id}/visits` to ADMIN, DOCTOR and NURSE.
  - **Prescriptions:** they use the V1 `prescriptions`/`prescription_items` tables through JdbcTemplate, with no entities.
  - **Lab orders:** an order from a visit sets `lab_tests.appointment_id`.
  - **Billing:** completing a visit creates a PENDING bill when `doctors.consultation_fee` is greater than 0.
  - UI: `components/appointments/ConsultationPanel.tsx`.

### Admissions (V9)
- **Room status:** `rooms.capacity` is the number of beds. Room status is **derived** by the `trg_admission_room_guard` and `trg_admission_room_sync` triggers: OCCUPIED when full, otherwise AVAILABLE.
  - MAINTENANCE is the only manual state, and it can only be set on an empty room.
  - Never set OCCUPIED/AVAILABLE from Java on an admission write path, because a stale `Room` entity save would overwrite the trigger.
  - The guard raises `ROOM_FULL`/`ROOM_UNAVAILABLE`; `AdmissionService.save` maps those to 400s.
- **One active stay:** a partial unique index allows one active admission per patient.
- **Timeline:** `admission_events` (ADMITTED/TRANSFER/DISCHARGED/NOTE/ADDENDUM) is the stay timeline. Its ADMITTED and TRANSFER rows are also the source for per-room charges (`AdmissionService.charges`; at least one night per stay).
- **Clinical data:** vitals and the medication administration record live in plain tables accessed through JdbcTemplate. `GET /admissions/{id}/record` drops clinical fields for non-clinical roles, and the discharge summary fields are `@JsonIgnore` on the entity.
- **Gotcha:** every repository method that feeds a JSON response needs an `@EntityGraph` for the relations it shows (including `findById`). Otherwise Hibernate6Module serializes lazy relations as null, and the UI crashes on `patient.dob`.

### Record protection (V10) & covering doctors
- Foreign keys from clinical and billing tables to `patients` and `doctors` are `ON DELETE RESTRICT`. Deleting someone with history returns 409, through the `DataIntegrityViolationException` handler. Never switch these back to CASCADE.
- **Covering doctor:** `Doctor.hasLogin()` is false when a doctor record has no user account. Any doctor may then act for them: start and complete visits, document them, and discharge. See `AppointmentService.actsFor` and `AdmissionService.requireAttending`; the frontend mirrors this with `covers()` and `attending`.
- Refresh-token reuse is blocked atomically by `TokenBlacklistService.claim` (Redis SET NX). Don't reintroduce check-then-set.

### Frontend conventions
- `src/api/endpoints.ts` holds one typed function per backend call, built on the shared axios `client`.
- Server state uses TanStack Query in the pages. Forms use react-hook-form with zod schemas.
- Zustand stores:
  - `authStore` persists only the user profile. Bump its `version` if you change the persisted shape.
  - `permissionsStore` holds the access matrix.
- Path alias: `@/` → `frontend/src/`.
- **Theme:** the palette lives in `tailwind.config.js`. The old token names are kept but now hold periwinkle values: `primary`, `surface-card` (the lavender canvas), `surface-dark` (deep indigo) and `card-dark` (the blue card). Pages re-skin through those names, so don't hard-code hex values in components.
  - Recharts props are the exception, because they need literal colours; mirror the tokens there.
  - Text on `*-light` tints uses `*-ink` (for example `text-warning-ink`) to stay above 4.5:1 contrast.
  - White text on the sidebar rail needs `primary-600` or darker.
- **Dashboard:** the hero is the clinic board (one lane per doctor on a time axis, from `/appointments/today`). Board status colours use `mint-bright`/`mint-deep` and `warning-bright`/`warning-deep`; never tell statuses apart by hue alone.
- **Font:** Atkinson Hyperlegible Next (Google Fonts, `index.html`), chosen for legibility on screens left open all shift.
- Nginx sets a strict CSP (`script-src 'self'`, `connect-src 'self'`). Inline scripts and third-party origins (other than Google Fonts) will be blocked in Docker but not in `npm run dev`.
