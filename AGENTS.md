# AGENTS.md

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
- **`.impeccable/`**: the design tooling's working files. `design.json` holds the colour tokens with their Light values; `critique/`, `decision/`, `surfaces/`, `review/` and `tmp/` hold past design reviews and page briefs. Use them as background, not as rules; `DESIGN.md` wins where they differ.

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
- **UI language** is English only (see Write everything in English).

## Write everything in English

Everything that goes into the repository or the product is written in English, even when you were asked in another language:

- **Code:** identifiers, comments, Javadoc and JSDoc, log messages, exception and error messages, and test names.
- **Product text:** every label, heading, button, helper text, empty state, validation message, toast, email and notification the app shows, plus the Figma frames and the generator copy.
- **Data and config:** seed and demo data descriptions, enum labels, API documentation (SpringDoc summaries), and comments in SQL migrations and config files.
- **Project writing:** commit messages, branch names, PR titles and descriptions, issue text, and the docs in `docs/`, `AGENTS.md`, `PRODUCT.md` and `DESIGN.md`.

Proper nouns keep their own spelling: people (Vũ Hải Yến), places and border crossings (Mộc Bài – Bavet), clubs and authorities. If existing code or text you touch is in another language, translate it in the same change.

## Reuse before you build

Look for what already exists before writing anything new, and follow the pattern the codebase already uses. Consistency matters more than a locally neater solution: a second way of doing the same thing is a bug the next person has to untangle.

1. **Search first.** Before creating a component, hook, helper, endpoint or table, search the repo for something that already does the job or nearly does. Read one or two places that solve the same kind of problem and copy their shape.
2. **Extend, don't duplicate.** If an existing piece almost fits, add a prop, a variant or an option to it rather than making a near-copy beside it. A sibling such as `HorseCard2`, `MyChip` or a page-local re-implementation is not acceptable.
3. **Build new only when nothing fits,** and say why in the PR. Put the new piece where its kind lives, in the same file style and naming as its neighbours, and export it the same way.
4. **Follow the nearest example.** When adding a page, endpoint or migration, start from the most similar one that exists and keep its structure, naming and error handling.

Where to look in the frontend (`FE/src/`):

- **`components/ui`**: the design-system components, one per Figma component, exported from `components/ui/index.ts`. They include Button, Chip, Callout, OptionCard, Tabs, Steps, StatTile, Progress, Panel, FactCell, Deadline, StageMark, Nameplate, HorseCard, OwedItem, QuoteLine, EstimateCard, DocumentRow, ClearanceGate, StallTile, LoadItem, TimelineStop, RouteStrip, Perforation, PhotoPanel, Toast and Icon.
  - Compose pages from these and don't restyle Ant Design to imitate them.
  - A new design-system component also goes into `components/ui/index.ts` and onto the `/design-system` page, matching its Figma component.
- **Forms:** `components/form` (`FormWrapper`, `FormField`, `fields/*`).
- **Tables:** `components/table`.
- **Modals:** `components/modal/BaseModal`.
- **Row actions:** `components/buttons` (`EditButton`, `DeleteButton`).
- **Staff menu:** `components/menu/StaffMenu`.
- **Data:** `apis/crudFactory.ts` (`makeCrudApi`) and `hooks/crud.ts` (`useCrudResource`, `useReadOnlyResource`). Add a domain file next to `apis/user.ts` and `hooks/user.ts` rather than calling axios from a page.
- **Helpers:** `lib/utils` (time, number, file, path, rbac) and `constant/`. Check them before writing a formatter or date helper.
- **Page templates:** `pages/staff/users` (a list with an add/edit modal) and `pages/customer/home` (a composed customer page).

Where to look elsewhere:

- **Backend (`BE/`):** follow the controller → service → repository → DTO shape of `controller/admin/UserController` and `service/UserService`. Reuse `BaseEntity`, the exceptions in `exception/` and `ApiError`; don't add a new error format or response wrapper.
- **Database:** new tables and columns follow `docs/database/database-design.md` and the naming of the existing migrations.
- **Figma generator:** reuse the helpers in `docs/figma-plugin/src/` (`panel`, `chip`, `btn`, `input`, `tbl`, `tableBlock`, `pageHeader`, `draftPass`, `jobMap` and the rest) instead of drawing from scratch. A design change that needs a new pattern also gets its rule in `DESIGN.md`.

## Backend conventions (`BE/`)

- **Packages** live under `com.equifreight`: `controller` (with `controller/admin` for staff admin), `service`, `repository`, `entity` (`entity/enums`), `model` (request and response DTOs per area), `exception`, `configuration`, `job`.
- **Entities** extend `BaseEntity`, which provides a UUIDv7 `id`, `createdAt` and `updatedAt`. Use Lombok `@Getter`/`@Setter`.
- **Enums** are stored as `varchar` with a `CHECK (col IN (...))` constraint matching the Java enum. Adding an enum value always needs a new Flyway migration that drops and recreates that check. Changing only the Java enum makes inserts fail at runtime, and DB-free tests will not catch it.
- **Flyway.** Migrations are in `src/main/resources/db/migration` (`V1` … `V13` today). Never edit a migration that has been merged; add the next `V{n}__description.sql`.
- **Logging.** Use Lombok `@Log4j2`, not slf4j `LoggerFactory`.
- **Injection.** Use constructor injection.
- **Errors.** Throw the exceptions in `exception/` (`BusinessException`, `ConflictException`, `ResourceNotFoundException`, `UnauthorizedException`). `ControllerAdvise` turns them into `ApiError`. Use the one that matches: not signed in or not allowed is `UnauthorizedException`, not `BusinessException`. Error messages name the rule, the value found and the fix, e.g. "The earliest departure is 17 Oct 2026."
- **APIs** live under `/api/v1/...`. Staff admin endpoints live under `/api/v1/admin/**`, and role access is enforced in `ApplicationConfiguration`.
- **Lists** take a Spring `Pageable` (page size 20) and return a `Page`, including inboxes and queues. Sortable fields must be real entity fields, because joined or derived DTO columns fail at runtime.
- **Permissions are exactly what the story and `PRODUCT.md` say.** If a story says "only the transport specialist reviews", no other role may, not even the logistics manager "for convenience". Declare role checks once, with `@PreAuthorize` on the controller method or in `ApplicationConfiguration`, not with hand-rolled role loops in services.
- **Records belong to someone.** Customer endpoints (`/api/v1/customer/**`) only read or change records of the signed-in user's club; check ownership in the service and answer 404 for anyone else's record. Never trust an id in the path to belong to the caller.
- **Mirror the database's rules.** When `database-design.md` puts a rule in a check constraint or trigger (append-only versions, one review decision, required reasons), the service enforces the same rule first, with a clear message. Never write code that relies on the database to reject it, and never contradict it.
- **Validate, then write.** Check every rule before saving anything; don't save a change and throw afterwards.
- **Audit every decision.** Each state change a person makes (approve, reject, issue, publish, record a payment, override) writes an `audit_log` row in the same transaction, with the action code, a one-line summary and the entity code (BR-F1-08).
- **Dates are local calendar days.** Business rules that count days (validity windows, lead time, due dates, "in 5 days") work on dates in the business time zone, `Asia/Ho_Chi_Minh`, never UTC: a 06:00 departure on 18 Oct is still 17 Oct in UTC. Keep one shared constant for the zone instead of scattering `ZoneOffset.UTC`.
- **Tests.** Every business rule (`BR-…`) a change implements gets a unit test, including the refusals: the wrong role is refused, a missing reason is refused, a RED document can't be approved. Name tests after the behaviour, in English.
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
- **Data fetching** goes through TanStack Query hooks in `hooks/<domain>.ts` (`useQuery` and `useMutation`, invalidating the affected queries on success), never `useState` plus `useEffect` calling an API from a page. Pages own no server data state of their own.
- **No fake data, no swallowed errors.** No hard-coded ids, mock records or "demo fallback" branches in app code; demo data belongs in `DataSeeder`. A failed request shows an error state or the server's `ApiError` message, never an empty list that looks like success. Every list has a loading, an empty and an error state.
- **Styling uses the tokens.** Text uses the `type-*` utilities and colours use the token classes from `index.css`; no arbitrary values such as `text-[13px]`, `p-[7px]` or hex colours. Import design-system components from `@/components/ui`, not from their individual files.
- **Real inputs.** A file is chosen with a file picker and uploaded, never pasted as a file id; a date uses a date field, and a choice from a fixed set uses a select or option cards.
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

- **Work from a story.** Every PR names the stories it implements (`Closes #36`) and keeps their acceptance criteria as a checklist in the description, each one ticked or explained. Keep a PR to one story or a few closely related ones, so it can be reviewed; split a whole epic into several PRs.
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
- Don't give a role a permission its story doesn't, or let a customer reach another club's records.
- Don't save first and validate after, or skip the audit entry for a decision.
- Don't count calendar days in UTC.
- Don't fetch data in a page with `useEffect`, hard-code ids or mock data, or hide a failed request.
- Don't present demo figures as real data.
- Don't write code comments, UI text, commit messages or docs in any language other than English.
- Don't create a new component, hook, helper or pattern when an existing one does the job or can be extended to.
