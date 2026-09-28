# EquiFreight: Cross-Border Racehorse Transport System (CBRTS)

SWP391 project. Racing clubs request road or air transport for their horses across Vietnam, Cambodia, Thailand, Laos, Malaysia and Hong Kong. Staff turn each request into a legally movable, priced and staffed job, then carry it through clearance, planning, the trip and handover.

The earlier coursework (`prj301/`, and the SWP391 parking management system in `swp391/`) lives on the `archive/prj301-swp391` branch.

## Layout

| Folder | What it is |
|---|---|
| `BE/` | Spring Boot 4 REST API (Java 25, Gradle, PostgreSQL, Flyway, Spring Security with JWT, SpringDoc) |
| `FE/` | React 19 single-page app (Rsbuild, Ant Design 6, Tailwind 4, React Router 7, TanStack Query, React Hook Form with Zod) |
| `docs/` | The core-flows spec and quotation builder (`.docx`), the diagrams, and the Figma design generator (`docs/figma-plugin/`) |
| `requirement.txt` | The course requirement (Vietnamese) |

## Roles

| Role | Signs in to | Owns |
|---|---|---|
| Customer (racing club or owner) | `/app` | Requests, horses, uploads, accepting quotations |
| Logistics manager | `/staff/overview` | Request review, quotations, approval, incidents, users & roles, audit log |
| Transport specialist | `/staff/jobs` | Document checks, authority filings, regulation and rate catalogs |
| Fleet & route coordinator | `/staff/jobs` | Routes, vehicles, stall positions |
| Escort (driver, groom) | `/escort` | Checkpoints and horse condition on the trip |

## Running

Prerequisites: JDK 25, PostgreSQL, and [Bun](https://bun.sh).

### Backend

```bash
createdb cbrtsdb
cd BE
./gradlew bootRun
```

The API listens on `http://localhost:8080`, and Swagger UI is at `/swagger-ui.html`. Flyway creates the schema.

The database defaults are `postgres` / `123456` on `localhost:5432`. Override them with `DB_URL`, `DB_USERNAME` and `DB_PASSWORD`. Set `JWT_SECRET` (at least 32 bytes) anywhere but local development.

On first start, `DataSeeder` creates the five roles and one account per role. Each account's password is `SEED_PASSWORD`, which defaults to `changeme123!`.

| Email | Role |
|---|---|
| `bookings@saigonturf.vn` | Customer |
| `yen.vu@equifreight.vn` | Logistics manager |
| `lan.nguyen@equifreight.vn` | Transport specialist |
| `khoi.do@equifreight.vn` | Fleet & route coordinator |
| `minh.tran@equifreight.vn` | Escort |

### Frontend

```bash
cd FE
bun install
bun run dev
```

The app runs on `http://localhost:5173` and proxies `/api` to the backend. Other scripts:
- `bun run typecheck`
- `bun run lint`
- `bun run format`
- `bun run build`
