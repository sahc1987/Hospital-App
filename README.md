<div align="center">

# 🏥 Hospital Management System (HMS)

A modern, full-stack hospital management platform — manage patients, appointments, admissions, billing, pharmacy, lab, and payroll from a single clean dashboard.

[![Java](https://img.shields.io/badge/Java-21-orange.svg)](https://openjdk.org/projects/jdk/21/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.4-6DB33F.svg?logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1.svg?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED.svg?logo=docker&logoColor=white)](https://www.docker.com/)

</div>

---

## ✨ Overview

HMS is a production-style hospital management system built as a clean, modular monorepo. The **Spring Boot** backend exposes a secured REST API backed by **PostgreSQL** and **Redis**, while the **React + TypeScript** frontend delivers a fast, responsive admin experience styled with **Tailwind CSS**. The entire stack spins up with a single `docker compose up`.

## 🚀 Features

- 👤 **Patient Management** — registration, demographics, and medical history
- 🩺 **Doctors & Departments** — specializations, scheduling, and org structure
- 📅 **Appointments** — booking, status tracking, and daily schedules
- 🛏️ **Admissions & Rooms** — bed allocation, room types, and length-of-stay tracking
- 💊 **Pharmacy** — medication catalog, stock levels, and prescriptions
- 🔬 **Laboratory** — lab test ordering and results management
- 💳 **Billing & Insurance** — itemized bills, payments, and insurance claims
- 👥 **Employees & Payroll** — staff records and payroll processing
- 📊 **Dashboard & Reports** — live metrics and analytics with charts
- 🔐 **Authentication** — JWT-based login with role-based access control

## 🛠️ Tech Stack

### Backend
| Area | Technology |
|------|-----------|
| Language | Java 21 |
| Framework | Spring Boot 3.4 (Web, Data JPA, Security, Validation, Actuator) |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Auth | Spring Security + JWT (jjwt) |
| Migrations | Flyway |
| Mapping | MapStruct + Lombok |
| Build | Maven |

### Frontend
| Area | Technology |
|------|-----------|
| Framework | React 18 + TypeScript 5.5 |
| Build Tool | Vite 5 |
| Styling | Tailwind CSS + Headless UI |
| Data Fetching | TanStack Query + Axios |
| State | Zustand |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Icons / UX | Lucide React + React Hot Toast |

### Infrastructure
- 🐳 Docker & Docker Compose
- 🌐 Nginx (frontend production server)

## 📁 Project Structure

```
Hospital-App/
├── backend/                  # Spring Boot REST API
│   └── src/main/
│       ├── java/com/hms/
│       │   ├── config/       # App & security configuration
│       │   ├── controller/   # REST endpoints
│       │   ├── dto/          # Request/response objects
│       │   ├── entity/       # JPA entities + enums
│       │   ├── exception/    # Error handling
│       │   ├── mapper/       # MapStruct mappers
│       │   ├── repository/   # Spring Data repositories
│       │   ├── security/     # JWT & auth filters
│       │   └── service/      # Business logic
│       └── resources/
│           ├── db/migration/ # Flyway SQL migrations + seed data
│           └── application.yml
├── frontend/                 # React + TypeScript SPA
│   └── src/
│       ├── api/              # API client layer
│       ├── components/       # Reusable UI components
│       ├── pages/            # Route-level views
│       ├── store/            # Zustand stores
│       ├── types/            # Shared TypeScript types
│       └── utils/            # Helpers
├── docker-compose.yml        # Full-stack orchestration
└── .env.example              # Environment variable template
```

## ⚡ Quick Start (Docker)

The fastest way to run the entire stack:

```bash
# 1. Clone the repository
git clone https://github.com/sahc1987/Hospital-App.git
cd Hospital-App

# 2. Create your environment file and set real secrets
cp .env.example .env
# Set JWT_SECRET (required — compose refuses to start without it), e.g.:
#   openssl rand -base64 48
# and replace POSTGRES_PASSWORD / REDIS_PASSWORD

# 3. Launch everything
docker compose up --build
```

Once running, the services are available at:

| Service | URL |
|---------|-----|
| 🖥️ Frontend | http://localhost:3000 |
| ⚙️ Backend API | http://localhost:8080 (also proxied at http://localhost:3000/api) |

PostgreSQL and Redis are **not** published to the host; the backend reaches them on the internal Docker network. To connect from your machine (e.g. with `psql`), add a loopback-only mapping such as `"127.0.0.1:5433:5432"` to the `postgres` service.

> Database schema and demo data are applied automatically via Flyway migrations on first startup.
>
> `POSTGRES_PASSWORD` only takes effect when the database volume is first created. Changing it later requires updating the password inside Postgres (or recreating the `postgres_data` volume, which deletes all data).

## 🔧 Configuration

All configuration is driven by environment variables (see `.env.example`):

| Variable | Description | Default |
|----------|-------------|---------|
| `POSTGRES_DB` | Database name | `hms_db` |
| `POSTGRES_USER` | Database user | `hms_user` |
| `POSTGRES_PASSWORD` | Database password | *(set your own)* |
| `REDIS_PASSWORD` | Redis password | *(set your own)* |
| `JWT_SECRET` | JWT signing key (256-bit+) — **required, no default** | *(set your own)* |
| `JWT_EXPIRATION_MS` | Access token lifetime | `86400000` (24h) |
| `JWT_REFRESH_EXPIRATION_MS` | Refresh token lifetime | `604800000` (7d) |
| `VITE_API_URL` | Backend target for the Vite dev-server `/api` proxy | `http://localhost:8080` |

The browser always calls the API on the same origin (`/api`), proxied by Nginx in Docker and by Vite in development. This keeps the auth cookies first-party.

> ⚠️ **Never commit your `.env` file.** Always use strong, unique secrets in production.

## 💻 Local Development

### Backend
```bash
cd backend
export JWT_SECRET="$(openssl rand -base64 48)"   # required
mvn spring-boot:run
```
Requires JDK 21+ and Maven, plus PostgreSQL and Redis on `localhost:5432` / `localhost:6379` (override with `SPRING_DATASOURCE_*` and `SPRING_DATA_REDIS_*`). If you use the Docker containers for these, publish their ports first (see Quick Start).

Run the tests with:
```bash
mvn test
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```
The dev server runs on http://localhost:3000 with hot module replacement and proxies `/api` to the backend. Stop the Docker `frontend` container first, because it also uses port 3000.

**Available scripts:**
```bash
npm run dev       # Start dev server
npm run build     # Type-check + production build
npm run preview   # Preview the production build
npm run lint      # Run ESLint
```

## 🔐 Authentication

Authentication uses JWTs stored in **HttpOnly, `SameSite=Strict` cookies**. Tokens are never returned in response bodies or kept in browser storage.

| Endpoint | Purpose |
|----------|---------|
| `POST /api/auth/login` | Verifies credentials and sets the `hms_access` and `hms_refresh` cookies |
| `POST /api/auth/refresh` | Rotates both tokens using the refresh cookie. A refresh token works only once. |
| `POST /api/auth/logout` | Revokes both tokens on the server and clears the cookies |
| `GET/PUT /api/auth/me` | Reads or updates the current user's profile |

**Role-based access** is enforced by the backend, not just hidden in the UI. Each `/api/<module>` request is checked against the `role_permissions` table, which admins can edit on the **Access Matrix** page. `ADMIN` always has full access. User management is limited to admins.

### Demo accounts

The seed migrations create these accounts, all with the password `Admin@123`:

| Username | Role |
|----------|------|
| `admin` | ADMIN |
| `dr_smith`, `dr_patel`, `dr_chen`, `dr_garcia`, `dr_johnson` | DOCTOR |
| `nurse_ali`, `nurse_kim` | NURSE |
| `recept_anna` | RECEPTIONIST |
| `lab_mike` | LAB_TECH |
| `pharma_sara` | PHARMACIST |
| `hr_david` | HR |

> ⚠️ Change or disable all demo accounts before any real deployment.

## 🛡️ Security

- **Login lockout:** 5 failed attempts lock that username for 15 minutes. The counter is kept in Redis.
- **Token handling:**
  - Access and refresh tokens are typed, so one can't be used in place of the other.
  - Revoked tokens are blacklisted in Redis until they expire.
  - Deactivating a user cuts off their access immediately.
- **Admin safeguards:** an admin can't deactivate or delete their own account, or remove their own `ADMIN` role.
- **Data exposure:** password hashes are never serialized into API responses or the cache.
- **Input validation:**
  - A payment can't exceed the bill's outstanding balance.
  - Payroll requires a positive salary and a `YYYY-MM` month.
- **HTTP headers:** Nginx sends a Content Security Policy, `X-Frame-Options: DENY`, `nosniff`, a Referrer-Policy and a Permissions-Policy.
- **Secure cookies:** cookies get the `Secure` flag automatically when the app is served over HTTPS. The backend trusts the `X-Forwarded-Proto` header for this.

## 🤝 Contributing

Contributions are welcome! Feel free to open an issue or submit a pull request.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is currently unlicensed. Consider adding a `LICENSE` file to clarify usage terms.

---

<div align="center">
Built with ☕ Spring Boot and ⚛️ React
</div>
