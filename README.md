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

# 2. Create your environment file
cp .env.example .env
# Edit .env and set strong secrets for production

# 3. Launch everything
docker compose up --build
```

Once running, the services are available at:

| Service | URL |
|---------|-----|
| 🖥️ Frontend | http://localhost:3000 |
| ⚙️ Backend API | http://localhost:8080 |
| 🐘 PostgreSQL | localhost:5432 |
| 🧠 Redis | localhost:6379 |

> Database schema and demo data are applied automatically via Flyway migrations on first startup.

## 🔧 Configuration

All configuration is driven by environment variables (see `.env.example`):

| Variable | Description | Default |
|----------|-------------|---------|
| `POSTGRES_DB` | Database name | `hms_db` |
| `POSTGRES_USER` | Database user | `hms_user` |
| `POSTGRES_PASSWORD` | Database password | *(set your own)* |
| `REDIS_PASSWORD` | Redis password | *(set your own)* |
| `JWT_SECRET` | JWT signing key (256-bit+) | *(set your own)* |
| `JWT_EXPIRATION_MS` | Access token lifetime | `86400000` (24h) |
| `JWT_REFRESH_EXPIRATION_MS` | Refresh token lifetime | `604800000` (7d) |
| `VITE_API_URL` | Backend URL for the frontend | `http://localhost:8080` |

> ⚠️ **Never commit your `.env` file.** Always use strong, unique secrets in production.

## 💻 Local Development

### Backend
```bash
cd backend
./mvnw spring-boot:run
```
Requires Java 21 and a running PostgreSQL + Redis instance (or start them with `docker compose up postgres redis`).

### Frontend
```bash
cd frontend
npm install
npm run dev
```
The dev server runs on Vite's default port with hot module replacement.

**Available scripts:**
```bash
npm run dev       # Start dev server
npm run build     # Type-check + production build
npm run preview   # Preview the production build
npm run lint      # Run ESLint
```

## 🔐 Authentication

The API uses **JWT-based authentication** via `POST /api/auth/login`, returning access and refresh tokens. Access is gated by **role-based permissions** (e.g. Admin, Receptionist, and other clinical roles). Default demo accounts are provisioned through the seed migrations — be sure to change all credentials before any real deployment.

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
