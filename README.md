# EquiFreight: Cross-Border Racehorse Transport System (CBRTS)

SWP391 project. Racing clubs request road or air transport for their horses across Vietnam, Cambodia, Thailand, Laos, Malaysia and Hong Kong. Staff turn each request into a legally movable, priced and staffed job, then carry it through clearance, planning, the trip and handover.

## Layout

| Folder | What it is |
|---|---|
| `BE/` | Spring Boot 4 REST API (Java 25, Gradle, PostgreSQL, Flyway, Spring Security with JWT, SpringDoc) |
| `FE/` | React 19 single-page app (Rsbuild, Ant Design 6, Tailwind 4, React Router 7, TanStack Query, React Hook Form with Zod). Layout: `apis/` + `hooks/` per domain, `router/route.config.ts` for pages and roles, `components/form` and `components/Table` as the base kits |
| `docs/` | The course requirement (`requirement.txt`), the core-flows spec and quotation builder (`.docx`), the diagrams, and the Figma design generator (`docs/figma-plugin/`) |

## Roles

| Role | Signs in to | Owns |
|---|---|---|
| Customer (racing club or owner) | `/app` | Requests, horses, uploads, accepting quotations |
| Logistics manager | `/staff/overview` | Request review, quotations, approval, incidents, users & roles, audit log |
| Transport specialist | `/staff/jobs` | Document checks, authority filings, regulation and rate catalogs |
| Fleet & route coordinator | `/staff/jobs` | Routes, vehicles, stall positions |
| Escort (driver, groom) | `/escort` | Checkpoints and horse condition on the trip |

## Running

### Docker

```bash
cp .env.example .env   # then set DB_PASSWORD and JWT_SECRET
docker compose up -d --build
```

This starts PostgreSQL, the API and the web app. Open `http://localhost:3000`. nginx serves the SPA and proxies `/api` and Swagger UI (`/swagger-ui.html`) to the backend. The API is also published on `http://localhost:8080`, and Postgres on `localhost:5433`.

The backend image runs on a JRE with two ahead-of-time steps that cut startup time:
- **Spring AOT:** `processAot` generates the bean-definition code at build time, and the app runs with `-Dspring.aot.enabled=true`. Beans are fixed at build time, so `@Profile` and `@ConditionalOnProperty` are decided at build time, not from runtime properties.
- **JDK AOT cache:** the build starts the app once against a throwaway Postgres and records `app.aot`, which the container loads with `-XX:AOTCache`. The cache is rebuilt with every image build, so nothing needs regenerating by hand.

### Local development

Prerequisites: JDK 25, PostgreSQL, and [Bun](https://bun.sh).

#### Backend

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

#### Frontend

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
