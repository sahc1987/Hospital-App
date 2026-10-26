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
   - Prefixes not in `API_ROUTES` (`auth`, `users`, `permissions`) fall through to plain authentication plus their `@PreAuthorize` annotations.
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
- **Redis caching:** `@Cacheable` is used on doctors, patients and dashboard stats, and `@CacheEvict` in the services that write those. `RedisConfig` uses `DefaultTyping.EVERYTHING`, which is needed for final types and records such as `DashboardStats`. When you change a cached type's shape, flush the stale keys.
- **Schema:** Flyway owns it (`ddl-auto: validate`). Never edit an applied migration, because the checksums will fail; add `V<n+1>__*.sql` instead.
  - V3 installs DB triggers: `updated_at` timestamps, room status synced on admission and discharge (`fn_sync_room_on_admission`), and bill totals recalculated from bill items (`fn_recalc_bill_total`). Don't duplicate that logic in Java.
  - V4 converted the Postgres enum columns to TEXT, so entities use `@Enumerated(EnumType.STRING)`.

### Frontend conventions
- `src/api/endpoints.ts` holds one typed function per backend call, built on the shared axios `client`.
- Server state uses TanStack Query in the pages. Forms use react-hook-form with zod schemas.
- Zustand stores:
  - `authStore` persists only the user profile. Bump its `version` if you change the persisted shape.
  - `permissionsStore` holds the access matrix.
- Path alias: `@/` → `frontend/src/`.
- **Theme:** the palette lives in `tailwind.config.js`. The old token names are kept but now hold periwinkle values: `primary`, `surface-card` (the lavender canvas), `surface-dark` (deep indigo) and `card-dark` (the blue card). Pages re-skin through those names, so don't hard-code hex values in components.
  - Recharts props are the exception, because they need literal colours. `HEX` in `pages/Dashboard.tsx` mirrors the tokens.
  - Text on `*-light` tints uses `*-ink` (for example `text-warning-ink`) to stay above 4.5:1 contrast.
  - White text on the sidebar rail needs `primary-600` or darker.
- `index.css` styles the native `<progress>` element in two forms: `progress.bar` (set `--fill`) and `progress.ring` (set `--value` inline, 0–100). Use these instead of `div`-based bars.
- Nginx sets a strict CSP (`script-src 'self'`, `connect-src 'self'`). Inline scripts and third-party origins (other than Google Fonts) will be blocked in Docker but not in `npm run dev`.
