# AGENT.md

Instructions for AI coding agents working in this repository. Read this before changing code, specs or the design generator. `README.md` covers running the stack; this file covers the rules, conventions and sources of truth.

## What this is

**EquiFreight**, the Cross-Border Racehorse Transport System (CBRTS), is the SWP391 group project. Racing clubs request road or air transport for their horses across Vietnam, Cambodia, Thailand, Laos, Malaysia and Hong Kong. Staff turn each request into a legally movable, priced and staffed job, then carry it through clearance, planning, the trip and handover.

- `BE/`: Spring Boot 4 REST API (Java 25, Gradle, PostgreSQL, Flyway, Spring Security with JWT, SpringDoc).
- `FE/`: React 19 SPA (Rsbuild, Ant Design 6, Tailwind 4, React Router 7, TanStack Query, React Hook Form with Zod).
- `docs/`: requirement, specs, database design, diagrams, and the Figma design generator.

## Sources of truth

When sources disagree, the higher one wins. Raise the conflict in your PR rather than silently picking one.

1. **`docs/requirement.txt`**: the course requirement (actors, responsibilities, flows).
2. **GitHub issues in `k-nero/cbrts`**: the backlog. Epics are `[EPIC-…]`, stories are `[US-xx-nn]` sub-issues with acceptance criteria. Implement against the story.
3. **`docs/CBRTS-core-flows.docx`** and **`docs/diagrams/`**: detailed spec for the flows, business rules and the quotation builder.
4. **`docs/database/database-design.md`**: every table, column, check constraint and the decisions behind them. Migrations must follow it; if you need to deviate, update the doc in the same PR.
5. **The Figma file** (`https://www.figma.com/design/FDnnrfMqRcLa2LFYvHCBWv`, desktop only) and its generator in **`docs/figma-plugin/src/`**: what every page looks like and says. Frame names match page names, e.g. `Tracking · Invoice` or `Logistics manager · Invoices · Record payment`.

Two root files carry the product and design context:

- **`PRODUCT.md`**: who the users are, the product principles, the domain rules and what is in or out of scope.
- **`DESIGN.md`**: the design system and how every page is built: tokens, typography, components, page patterns, and the rules behind them. Read the sections for the pages you touch before building UI; it is long, so search it rather than reading it whole.

## Domain rules the code must enforce

These are product decisions, not suggestions. Enforce them on the backend; the frontend only mirrors them.

- **Codes.** Requests `REQ-YYYY-NNNN`, quotations `Q-YYYY-NNNN`, jobs `CBRT-YYYY-NNN`, invoices `INV-YYYY-NNNN`, staff `EF-NNN`. They are unique, never reused, and issued from `code_counters`. A customer's REQ code stays the same from submission to handover.
- **Request lifecycle.** The flow is `DRAFT → SUBMITTED → UNDER_REVIEW → INFO_REQUIRED / REJECTED / QUOTED → CUSTOMER_ACCEPTED / EXPIRED → APPROVED`, with `CANCELLED` possible. Only the logistics manager approves or rejects.
- **Lead time.** 21 days for cross-border moves, 3 days for domestic ones. Quotations are valid for 7 days. Price and horse list lock at `APPROVED`.
- **Estimates are ranges.** Before a quotation exists the customer sees an indicative range, never a single price. It is never acceptable as a price. The range shown at submission is kept only to compare the quotation against.
- **Routes come from the catalog.** Only a corridor in the catalog (with its border crossings and rates) can be estimated or quoted. A request without a corridor can exist only as a `DRAFT`; the customer is told it is a route we don't run.
- **Documents are checked against the job's travel dates, not today.** Each document type has a machine-evaluable validity rule that returns GREEN, AMBER or RED. The rule re-runs whenever the dates, the catalog or the horse list change.
- **Clearance is a hard gate.** Departure cannot be recorded until the dossier is `CLEARANCE_READY`. Anything that makes a move illegal is a block with the reason stated, never a warning to click past.
- **Nothing is overwritten.** Documents, quotations, route plans and catalogs are versioned. A re-upload is a new version, the regulation catalog is pinned to the job, and the rate catalog is pinned to the quotation.
- **Quotations.** Quotations are built from the rate catalog in a fixed calculation order. Space is priced by stall width, not headcount. Grooms are one per three horses, rounded up. Insurance is a percentage of declared value. Every figure traces to a catalog line, a quantity and a basis.
- **Arrival window (road only).** A window is at least 3 hours and needs a private trailer. It adds a catalog surcharge. If the horses arrive late, EquiFreight pays a contract penalty: 10% of the job total per started hour, up to 30%, credited on the final invoice. The penalty clock stops for authority holds and welfare stops; this rule is still awaiting the teacher's confirmation.
- **Invoices.** Two are generated per job, never typed: a deposit invoice at acceptance and a final invoice after handover. Staff record payments by bank transfer or card. An issued invoice is never edited, only voided and replaced or corrected with a credit note. A recorded payment is never edited either; a mistake is reversed with a refund entry. There is no payment gateway, tax engine or dunning.
- **One owner per step.**
  - Logistics manager: requests, quotations, approval, incidents, invoices, users and the audit log.
  - Transport specialist: documents, authorities and catalogs.
  - Fleet & route coordinator: routes, vehicles and stalls.
  - Escort: checkpoints and horse condition.
- **Audit log** is append-only.
- **UI language** is English only.

## Backend conventions (`BE/`)

- **Packages** live under `com.equifreight`: `controller` (with `controller/admin` for staff admin), `service`, `repository`, `entity` (`entity/enums`), `model` (request and response DTOs per area), `exception`, `configuration`, `job`.
- **Entities** extend `BaseEntity`, which provides a UUIDv7 `id`, `createdAt` and `updatedAt`. Use Lombok `@Getter`/`@Setter`.
- **Enums** are stored as `varchar` with a `CHECK (col IN (...))` constraint matching the Java enum. Adding an enum value always needs a new Flyway migration that drops and recreates that check. Changing only the Java enum makes inserts fail at runtime, and DB-free tests will not catch it.
- **Flyway.** Migrations are in `src/main/resources/db/migration` (`V1` … `V13` today). Never edit a migration that has been merged; add the next `V{n}__description.sql`.
- **Logging.** Use Lombok `@Log4j2`, not slf4j `LoggerFactory`.
- **Injection.** Use constructor injection.
- **Errors.** Throw the exceptions in `exception/` (`BusinessException`, `ConflictException`, `ResourceNotFoundException`, `UnauthorizedException`). `ControllerAdvise` turns them into `ApiError`. Error messages name the rule, the value found and the fix, e.g. "The earliest departure is 17 Oct 2026."
- **APIs** live under `/api/v1/...`. Staff admin endpoints live under `/api/v1/admin/**`, and role access is enforced in `ApplicationConfiguration`.
- **Lists** take a Spring `Pageable` (page size 20). Sortable fields must be real entity fields, because joined or derived DTO columns fail at runtime.
- **Spring AOT.** The Docker image runs with Spring AOT, so `@Profile` and `@ConditionalOnProperty` are decided at build time, not from runtime properties.
- **Seed data.** `DataSeeder` creates one account per role. The password is `SEED_PASSWORD`, which defaults to `changeme123!`.

## Frontend conventions (`FE/`)

- **Package manager:** Bun (`bun.lock` is committed). Use `bun install`, `bun run <script>` and `bunx`; don't add an npm or yarn lockfile.
- **Layout:**
  - `apis/`: one file per domain. Use `makeCrudApi` from `apis/crudFactory.ts` for CRUD resources.
  - `hooks/`: TanStack Query hooks per domain.
  - `interfaces/`: types and enums.
  - `router/route.config.ts`: every page with its roles and a route `name`. Navigate with `useCustomRouter().paths.get('<name>')`, never a literal path.
- **Enums** are split into a value and a type: `export const XEnum = { ... } as const;` plus `export type X = (typeof XEnum)[keyof typeof XEnum];`. Use `XEnum.FOO` for values and `z.enum(XEnum)` in Zod schemas.
- **Forms** use React Hook Form and Zod through `components/form` (`FormWrapper`, `FormField`, `fields/*`). Put conditional rules in `.superRefine`.
- **UI components.** Build pages from the design-system components in `components/ui` (`import { … } from '@/components/ui'`) before reaching for Ant Design. Ant Design is for forms, tables, menus and overlays.
  - Don't style an AntD `<Button>` with Tailwind; its runtime CSS overrides Tailwind classes. Use the `ui` Button or a native `<button>`.
  - Tokens live in `src/index.css`: `@theme` is Dark, `[data-theme='light']` is Light. Light is the default theme.
  - `constant/color.ts` mirrors the tokens for AntD.
  - The `/design-system` route shows every component variant; use it to check visuals.
- **Checks.** Run `bun run typecheck`, `bun run format` and `bun run build`. `bun run lint` currently crashes because TypeScript 7 isn't supported by typescript-eslint, so rely on typecheck and Prettier until TypeScript is pinned back.

## Design rules (when building UI)

- **Gold** is for the one primary forward action on a view (the Primary button), never for status.
- **Status** is always shown in words plus a tone (ok, warn, bad, info, neutral), never colour alone.
- **Three typefaces:**
  - Fraunces for places, horse names and headings.
  - Outfit for prose, people's names and labels.
  - DM Mono for codes, dates, times, counts, distances and money.
- **Sentence case** everywhere. Uppercase is only for the small mono chip and column-header styles.
- **Next step.** Every customer-facing state says what happens next, who owns it, and what the customer owes and by when.
- **Demo data.** All figures, names and statistics are demo placeholders; never present them as real.
- **Match the frame.** When a Figma frame exists for the page you are building, match its structure, copy and states. Don't invent new patterns when one already exists in `components/ui` or the generator.

## Figma generator (`docs/figma-plugin/`)

- **What it is.** `src/*.js` generates the Figma file. `bash docs/figma-plugin/build-mcp.sh` bundles one script per Figma call and runs them all against a mock (`test/run-mcp.js`). It needs Bun.
- **Size limit.** Each bundle must stay under 50,000 characters; the build fails with `TOO BIG` otherwise. Split an entry function in two when that happens.
- **Keep source and Figma in step.** A design change made in Figma must also land in `src/`, and the reverse.
- **Scope.** The design is desktop only (1440 wide). Never delete existing Figma screens, including the mobile and Dark ones, unless the team asks.

## Git and GitHub workflow

- **Flow:** issue, then branch, then PR. Branch from `main` with a type prefix: `feat/`, `fix/`, `style/`, `chore/`, `docs/`, `design/`. Never commit straight to `main`; check `git branch --show-current` before you commit or push.
- **Commits** use the conventional form: `feat(be): …`, `fix(fe): …`, `docs: …`. Say what changed and why. Don't add tool-generated trailers or footers to commits or PR descriptions.
- **Project board.** Add every new issue and PR to GitHub Project #4: `gh project item-add 4 --owner k-nero --url <issue-or-pr-url>`.
- **No CI build or test gate.** A green check does not mean it compiles. Before opening or approving a PR, run `./gradlew test` in `BE/`, and `bun run typecheck` and `bun run build` in `FE/`.
- **Secrets.** Never commit `.env`, secrets, API keys or JWT secrets. `.env.example` holds placeholders only.

## Don't

- Don't push to `main`, force-push shared branches, or rewrite merged history.
- Don't edit a merged Flyway migration, or change an enum without its check-constraint migration.
- Don't show a single price before a quotation exists, or let a customer quote a route that is not in the catalog.
- Don't overwrite a document, quotation, invoice, payment or catalog version. Create a new version or a correcting entry.
- Don't weaken a legality block into a warning.
- Don't present demo figures as real data.
