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

- **Codes.** Requests `REQ-YYYY-NNNN`, quotations `Q-YYYY-NNNN`, jobs `CBRT-YYYY-NNN`, invoices `INV-YYYY-NNNN`, staff `EF-NNN`. They are unique, never reused, and issued from `code_counters`; seed data that writes a code directly also advances its counter, so a real code never collides with it. A customer's REQ code stays the same from submission to handover.
- **Request lifecycle.** The flow is `DRAFT → SUBMITTED → UNDER_REVIEW → INFO_REQUIRED / REJECTED / QUOTED → CUSTOMER_ACCEPTED / EXPIRED → APPROVED`, with `CANCELLED` possible. Only the logistics manager approves or rejects.
- **Lead time.** 21 days for cross-border moves, 3 days for domestic ones. Quotations are valid for 7 days. Price and horse list lock at `APPROVED`.
- **Estimates are ranges.** Before a quotation exists the customer sees an indicative range, never a single price. It is never acceptable as a price. The range shown at submission is kept only to compare the quotation against.
- **Routes come from the catalog.** Only a corridor in the catalog (with its border crossings and rates) can be estimated or quoted. A request without a corridor can exist only as a `DRAFT`; the customer is told it is a route we don't run.
- **Documents are checked against the job's travel dates, not today.** Each document type has a machine-evaluable validity rule that returns GREEN, AMBER or RED. The rule re-runs whenever the dates, the catalog or the horse list change: code that changes a job's planned departure or arrival calls `ClearanceService.recheckJobDocuments`.
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
- **Helpers:** `lib/utils` (time, number, file, path, rbac, error) and `constant/`. Check them before writing a formatter or date helper.
  - General-purpose utilities (debounce, throttle, deep equality, cloning, grouping, picking, sorting by key and the like) come from `lodash-es`, with named imports: `import { debounce, isEqual } from 'lodash-es'`. Use `lodash-es`, not `lodash`, so the bundle keeps only what is imported. `lib/utils` holds what is specific to EquiFreight (its wording, formats and rules), built on lodash where a general utility is needed.
  - Replace a hand-written general-purpose helper with its lodash equivalent when you touch it.
- **Page templates:** `pages/staff/users` (a list with an add/edit modal), `pages/staff/jobs` (a list whose rows open a detail page with tabs) and `pages/customer/home` (a composed customer page). See "Frontend pages" below.

Where to look elsewhere:

- **Backend (`BE/`):** follow the controller → service → repository → DTO shape of `controller/admin/UserController` and `service/UserService`. Reuse `BaseEntity`, the exceptions in `exception/` and `ApiError`; don't add a new error format or response wrapper. Shared services own cross-cutting work:
  - `AuditService.recordDecision` writes audit rows; never build an `AuditLog` by hand.
  - `FileService.requireAttachable` checks an upload before a record points at it (the caller's own file, not attached anywhere yet); never look a file up with `StoredFileRepository.findById` to attach it.
  - `ClearanceService.evaluateClearanceGate` derives the dossier status, and `ClearanceService.recheckJobDocuments` re-runs validity after a date change.
- **Database:** new tables and columns follow `docs/database/database-design.md` and the naming of the existing migrations.
- **Figma generator:** reuse the helpers in `docs/figma-plugin/src/` (`panel`, `chip`, `btn`, `input`, `tbl`, `tableBlock`, `pageHeader`, `draftPass`, `jobMap` and the rest) instead of drawing from scratch. A design change that needs a new pattern also gets its rule in `DESIGN.md`.

## Backend conventions (`BE/`)

- **Packages** live under `com.equifreight`: `controller` (with `controller/admin` for staff admin), `service`, `repository`, `entity` (`entity/enums`), `model` (request and response DTOs per area), `exception`, `configuration`, `job`.
- **Entities** extend `BaseEntity`, which provides a UUIDv7 `id`, `createdAt` and `updatedAt`. Use Lombok `@Getter`/`@Setter`.
- **Models are records with `@Builder`.** Every request and response DTO in `model/` is a Java `record` annotated with Lombok `@Builder`; never a class with `@Getter`/`@Setter`/`@Data`. Build them with `X.builder()…build()` (or the canonical constructor for a short one), and read them with the record accessors (`x.name()`, not `x.getName()`).
  - A default for a missing JSON field goes in the compact constructor (`stops = stops == null ? List.of() : stops;`); `@Builder.Default` and field initialisers don't work on records.
  - Request records use wrapper types (`Short`, `Integer`, `Boolean`), never primitives: Jackson 3 refuses a body that leaves out a primitive record component with a 400. Give the wrapper its default in the compact constructor when the field is optional. Response records may use primitives.
  - To change one field of an existing record, add `toBuilder = true` and use `x.toBuilder().field(v).build()`; never add a setter or a mutable wrapper.
  - Validation annotations go on the components (`@NotBlank String name`); nested request parts are nested records.
  - A record component is its JSON name: `boolean isOverdue` is sent as `isOverdue` (a Lombok getter made it `overdue`). Name components after the JSON the frontend reads.
  - Mappers (`XMapper`) stay `final` classes with static methods; they are not models.
- **Map in the model's mapper.** Turning an entity into a response belongs in its area's mapper in `model/<area>/` (`RoleMapper`, `ClearanceMapper`, `RequestMapper`, …), never in a service, controller or job.
  - A mapper is a `final` class with a private constructor and `public static` methods named `toResponse`, `toSummary` or `to<Part>Response`. It reads only what it is given: no repositories, services or clock.
  - Services and controllers call the mapper. They never build a response from entity fields with `X.builder()`, and response records carry no `of(Entity)` factory.
  - Values a service works out, such as counts, conflicts, a lead-time check or a nested response from another area, are passed to the mapper as parameters. See `RequestMapper.toResponse(request, route, leadTime, blockers)`.
  - Add the method to the area's existing mapper. A new area gets one `XMapper`; don't start a second one beside it.
  - A response that comes from no entity, such as `TokenResponse` or `ApiError.of(...)`, can be built where it is made.
- **Enums** are stored as `varchar` with a `CHECK (col IN (...))` constraint matching the Java enum. Adding an enum value always needs a new Flyway migration that drops and recreates that check. Changing only the Java enum makes inserts fail at runtime, and DB-free tests will not catch it.
- **Flyway.** Migrations are in `src/main/resources/db/migration` (`V1` … `V18` today). Never edit a migration that has been merged; add the next `V{n}__description.sql`.
- **Formatting.** Spotless with palantir-java-format (4 spaces, 120 columns) formats the Java sources, whatever IDE you use. Run `./gradlew spotlessApply` in `BE/` before committing a backend change, and `./gradlew spotlessCheck` to verify; `./gradlew check` runs it too.
  - It ratchets from `origin/main`: only the Java files your branch changes are checked and formatted, so run `git fetch origin` first if your `origin/main` is old.
  - It never touches `src/main/resources/db/migration`. If you use IntelliJ's Reformat Code on a directory, exclude `db/migration` (or reformat only the files you changed), because Flyway checksums every merged migration and even a whitespace change makes validation fail on databases that already ran it.
  - IntelliJ users can install the palantir-java-format plugin so Reformat Code matches Spotless. The root `.editorconfig` sets indent, line length and line endings for every editor.
- **Logging.** Use Lombok `@Log4j2`, not slf4j `LoggerFactory`.
- **Injection.** Use constructor injection.
- **JSON is Jackson 3.** Spring Boot 4 registers `tools.jackson.databind.json.JsonMapper`; inject that. Jackson 2's `com.fasterxml.jackson.databind.ObjectMapper` is on the classpath through other libraries, so code that injects it compiles and passes mocked tests, but the application fails to start.
- **Errors.** Throw the exceptions in `exception/` (`BusinessException`, `ConflictException`, `ResourceNotFoundException`, `UnauthorizedException`). `ControllerAdvise` turns them into `ApiError`. Use the one that matches: not signed in or not allowed is `UnauthorizedException`, not `BusinessException`. Error messages name the rule, the value found and the fix, e.g. "The earliest departure is 17 Oct 2026."
- **APIs** live under `/api/v1/...`. Staff admin endpoints live under `/api/v1/admin/**`, and role access is enforced in `ApplicationConfiguration`.
- **Lists** take a Spring `Pageable` (page size 20) and return a `Page`, including inboxes and queues. Sortable fields must be real entity fields, because joined or derived DTO columns fail at runtime.
- **Permissions are exactly what the story and `PRODUCT.md` say.** If a story says "only the transport specialist reviews", no other role may, not even the logistics manager "for convenience". Declare role checks once, with `@PreAuthorize` on the controller method or in `ApplicationConfiguration`, not with hand-rolled role loops in services.
- **Records belong to someone.** Customer endpoints (`/api/v1/customer/**`) only read or change records of the signed-in user's club; check ownership in the service and answer 404 for anyone else's record. Never trust an id in the path to belong to the caller.
- **Mirror the database's rules.** When `database-design.md` puts a rule in a check constraint or trigger (append-only versions, one review decision, required reasons), the service enforces the same rule first, with a clear message. Never write code that relies on the database to reject it, and never contradict it.
- **Validate, then write.** Check every rule before saving anything; don't save a change and throw afterwards.
- **One writer per status.** Each derived status has one place that sets it, and everything else asks that place to re-evaluate instead of writing the column:
  - `transport_jobs.dossier_status` and `clearance_ready_at`: only `ClearanceService.evaluateClearanceGate`, which also leaves a departed job alone.
  - The job stage moves to `TRIP` only when the departure is recorded (`TripService`), never at planning or sign-off.
  - A change to a plan that was signed off (route, load or crew) clears the sign-off.
- **Transactions.**
  - A read-only transaction (`@Transactional(readOnly = true)`) and a `GET` endpoint never create data; a missing record is created by an explicit `POST`.
  - Hibernate flushes inserts before deletes. To replace rows covered by a unique constraint in one transaction, delete them with a bulk `@Modifying @Query` (it runs at once), not `deleteAll(entities)` or a derived `deleteBy…`.
  - To turn a constraint violation into a 409, write with `saveAndFlush` inside the `try`; a plain `save` flushes later, outside it, and the client gets a 500.
- **Missing dates are refused, not guessed.** When a rule needs a date that isn't set yet (a booking or an overlap check needs the planned departure and arrival), refuse with what to do first ("confirm the route plan first"); never fall back to `now()` or "now plus two days".
- **Audit every decision.** Each state change a person makes (approve, reject, issue, publish, record a payment, override, assign, confirm, sign off) writes an `audit_log` row in the same transaction, through `AuditService.recordDecision`, with the action code, a one-line summary, the entity type, id and code (BR-F1-08).
- **Dates are local calendar days.** Business rules that count days (validity windows, lead time, due dates, "in 5 days") work on dates in the business time zone, `Asia/Ho_Chi_Minh`, never UTC: a 06:00 departure on 18 Oct is still 17 Oct in UTC. Keep one shared constant for the zone instead of scattering `ZoneOffset.UTC`.
- **Tests.** Every business rule (`BR-…`) a change implements gets a unit test, including the refusals: the wrong role is refused, a missing reason is refused, a RED document can't be approved. Name tests after the behaviour, in English.
- **Spring AOT.** The Docker image runs with Spring AOT, so `@Profile` and `@ConditionalOnProperty` are decided at build time, not from runtime properties.
- **Seed data.** `DataSeeder` creates one account per role. The password is `app.seed.default.password` (env `APP_SEED_DEFAULT_PASSWORD`), `changeme123!` in the dev profile and in compose. Demo records it creates follow every rule real ones do: codes advance `code_counters`, and statuses satisfy the check constraints.
- **No N+1 queries.** A request runs a fixed number of queries, however many rows it returns. Never call a repository, or touch a lazy relation, inside a loop or a `stream().map(...)` over results; that is one query per row.
  - Load what a response needs in the query that loads the rows: a `join fetch` in a `@Query` (see `TransportJobRepository`, `join fetch j.request r join fetch r.club c`) or an `@EntityGraph`. A paged `join fetch` query needs its own `countQuery`.
  - For a collection on a page of rows, fetch the page first, then load the children for all the page's ids in one query (`findAllByJobIdIn(ids)`), and group them in memory.
  - Counts, sums and "has any" per row come from one grouped query (`select x.id, count(y) … group by x.id`) or a subquery, never from `.size()` on a lazy collection or a `count` call per row.
- **Joins happen in SQL.** Any join between tables is written in the query (JPQL `join`, a `Specification` with `root.join(...)`, or a native query), so the database filters, sorts and pages the joined result. Never load two lists and match them in Java, and never filter or sort a joined field in memory after fetching.
- **Check the queries.** For a new or changed list or detail endpoint, run it with `spring.jpa.show-sql=true` (or Hibernate statistics) against seeded data and confirm the query count stays the same for 1 row and for 20.

## Frontend conventions (`FE/`)

- **Package manager:** Bun (`bun.lock` is committed). Use `bun install`, `bun run <script>` and `bunx`; don't add an npm or yarn lockfile.
- **Layout:**
  - `apis/`: one file per domain. Use `makeCrudApi` from `apis/crudFactory.ts` for CRUD resources.
  - `hooks/`: TanStack Query hooks per domain.
  - `interfaces/`: types and enums.
  - `router/route.config.ts`: every page with its roles and a route `name`. Navigate with `useCustomRouter().paths.get('<name>')`, never a literal path.
- **One component per file.** A `.tsx` file holds one component, named like the file (`SentPanel.tsx` exports `SentPanel`). A second component is allowed only when it is declared inside another component's body. Sibling panels, cards, tables, modals and form fields each get their own file in the page's folder, and what they share (option lists, a column helper, a refusal helper) goes in a plain `.ts` module beside them, such as `editorOptions.ts`. An older file that holds several components is split when you next change it.
- **Enums** are split into a value and a type: `export const XEnum = { ... } as const;` plus `export type X = (typeof XEnum)[keyof typeof XEnum];`. Use `XEnum.FOO` for values and `z.enum(XEnum)` in Zod schemas.
- **Forms** use React Hook Form and Zod through `components/form` (`FormWrapper`, `FormField`, `fields/*`). Put conditional rules in `.superRefine`.
  - Zod schemas live in a `schema.ts` beside the form, never in a component file. It exports each schema with its `z.infer` type (`noteSchema` and `NoteForm`), and a folder with several forms keeps all of their schemas in that one file, along with field lists a schema is built from (`rates/schema.ts` holds `POLICY_FIELDS`).
- **UI components.** Build pages from the design-system components in `components/ui` (`import { … } from '@/components/ui'`) before reaching for Ant Design. Ant Design is for forms, tables, menus and overlays.
  - Don't style an AntD `<Button>` with Tailwind; its runtime CSS overrides Tailwind classes. Use the `ui` Button. A native `<button>` belongs only inside a `components/ui` component, never in a page.
  - Tokens live in `src/index.css`: `@theme` is Dark, `[data-theme='light']` is Light. Light is the default theme.
  - `constant/color.ts` mirrors the tokens for AntD.
  - The `/design-system` route shows every component variant; use it to check visuals.
- **Data fetching** goes through TanStack Query hooks in `hooks/<domain>.ts` (`useQuery` and `useMutation`, invalidating the affected queries on success), never `useState` plus `useEffect` calling an API from a page. Pages own no server data state of their own.
- **No fake data, no swallowed errors.** No hard-coded ids, mock records or "demo fallback" branches in app code; demo data belongs in `DataSeeder`. A failed load goes to the error boundary (see "Frontend pages"); a failed action shows the server's `ApiError` message (`apiErrorMessage` from `lib/utils`), never an empty list or Axios's generic "Request failed with status code 400". Every list has a loading and an empty state.
- **Styling uses the tokens.** Text uses the `type-*` utilities and colours use the token classes from `index.css`; no arbitrary values such as `text-[13px]`, `p-[7px]` or hex colours. Import design-system components from `@/components/ui`, not from their individual files.
- **Real inputs.** A file is chosen with a file picker and uploaded, never pasted as a file id; a date uses a date field, and a choice from a fixed set uses a select or option cards.
- **Files from the API need the token.** Never link to `/api/...` with `<a href>` or `<img src>`: the browser sends no access token and gets 401. Show a stored file with `useFileBlobUrl` (`hooks/file.ts`) and open one with `fileApi.viewFile`, which opens the tab inside the click (a `window.open` after an `await` is dropped by popup blockers).
- **Retries are idempotent.** When an endpoint takes a client reference (`clientRef`), create it once per user action, keep it until the request succeeds, and send the same one on retry; a new one per attempt records the action twice.
- **Checks.** Run `bun run typecheck`, `bun run format` (or `bun run format:check` to verify without writing) and `bun run build`. `bun run lint` currently crashes because TypeScript 7 isn't supported by typescript-eslint, so rely on typecheck and Prettier until TypeScript is pinned back.

## Frontend pages: follow users and jobs

`pages/staff/users` and `pages/staff/jobs` are the reference pages. Every new page copies their structure, and a page you touch is brought in line with them. A pull request that hand-builds what these pages get from shared components is sent back.

- **No plain HTML controls.** Never build a control or widget out of raw elements and Tailwind. Use the component that exists:

  | Need | Use | Never |
  | --- | --- | --- |
  | Button, link button | `ui` `Button`, or AntD `Button` without Tailwind | `<button>`, a clickable `<div>` or `<span>` |
  | Text, number, date, choice in a form | `components/form` fields (`TextField`, `SelectField`, `DatePickerField`, …) | `<input>`, `<select>`, `<textarea>` |
  | Search box or filter outside a form | AntD `Input.Search`, `Select` | `<input>`, `<select>` |
  | List of records | `Table` from `@/components/table` | `<table>`, a grid of `<div>` rows |
  | In-page views of a list | `Tabs` from `@/components/ui` (with `count`) | buttons styled as tabs |
  | Sections of one record | AntD `Tabs` with `items` | CSS tabs, a row of buttons |
  | Dialog | `BaseModal` (`components/modal`) | a positioned `<div>` overlay |
  | Row actions | `TableActionDropdown`, `EditButton`, `DeleteButton` | a hand-made menu |
  | Status, tone, stage | `Chip`, `StageMark`, `Callout` from `@/components/ui` | a coloured `<span>` |

  Plain elements (`div`, `span`, `p`, `h1`–`h4`, `label`, `ul`) are for layout and text only. If nothing in the table fits, extend a `components/ui` component or add one there (see "Reuse before you build"); don't invent one inside a page.
- **Every Figma component is already built.** Each component in the Figma file has its implementation in `components/ui`, exported from `components/ui/index.ts` and shown on `/design-system`: Button, Callout, Checkbox, Chip, ClearanceGate, Deadline, DocumentRow, DraftPass, EstimateCard, FactCell, HorseCard, Icon, LoadItem, Nameplate, NavItem, OptionCard, OwedItem, Panel, Perforation, PhotoPanel, Progress, QuoteLine, RouteStrip, StageMark, StallTile, StatTile, Steps, Tabs, TimelineStop and Toast. When a frame shows one, import it from `@/components/ui`. Never rebuild it in a page, copy its markup, or make a look-alike with Tailwind, even if you need only part of it; add a prop to the `ui` component instead.
- **Plain HTML is the last resort.** Choose in this order, and go to the next step only when the one before has nothing that fits:
  1. A `components/ui` component (anything drawn from a Figma component).
  2. A shared kit component: `components/form`, `components/table`, `components/modal`, `components/buttons`, `PageHeader`.
  3. An Ant Design component (`Select`, `Input`, `DatePicker`, `Tabs`, `Skeleton`, `Tooltip`, `Dropdown`, `Avatar`, `Badge`, `Empty`, `Flex`, `Space`, `Divider` and the rest). Search the AntD docs before deciding there is none.
  4. Plain HTML, only for layout and text, or when steps 1–3 have no equivalent. Say in the PR which AntD component you looked for and why it didn't fit.
- **Files.** A list page is `index.tsx` (the page shell), `XList.tsx` (the table), `useGeneratedColumn.tsx` (a `useGeneratedXColumn` hook returning the columns) and `ViewAddEdit/` (the add/edit modal and its Zod schema, or the detail page). Copy the folder you're closest to; don't put the table, columns and shell in one file.
- **Data.** The API is `makeCrudApi` in `apis/<domain>.ts` and the hook wraps `useCrudResource` in `hooks/<domain>.ts` (`useUsers`, `useJobList`). Paging, sorting and search are server-side through `pageState`, `setPageState` and `setSearch`; never filter or sort a fetched page in the browser.
- **Page shell.** `Flex vertical gap={28}`, then:
  1. `PageHeader` with `title`, `summary` and the page's one primary action in `right`.
  2. The view `Tabs`; changing a tab or filter resets `pageState.number` to 0.
  3. Search (`Input.Search`, width 360) and filters, each with a visible `<label>`.
  4. The count line: "6 accounts", the sort in words ("Sorted by name, A to Z"), and "Reset order" while a sort is set.
  5. The list component.
- **Table.** Pass the shared `Table` `loading={isPending || isFetching}`, `onRefresh` and `refreshing`, a controlled `sorter` from `pageState.sort`, `pagination` with `showTotal` ("1–20 of 46 jobs", singular for one), an `emptyText` that says what to do next, and an `onChange` that writes `pageState`. Only real entity fields are `sorter: true`. A row that opens a record uses `onRow` and navigates.
- **Detail page.** As in `jobs/ViewAddEdit`: the open tab lives in the URL (`?tab=route`), the tabs are AntD `Tabs` with `items` and `destroyOnHidden`, and the tab's owner sits in `tabBarExtraContent`.
- **Loading and errors belong to the shell, not the page.**
  - A failed load, offline included, goes to `ErrorBoundaryHandling`. The query client throws a load that fails before any data arrives, so a page never checks `isError`, `navigator.onLine` or `isPaused`, and never draws its own "couldn't load" or offline message.
  - A table shows its own spinner through `loading`. A page or section waiting for data renders AntD `<Skeleton active />` in the shape of what's coming; never "Loading…" text or a `Spin` in the page.
  - Errors from actions (save, delete, upload, export) stay where the action is: a `Callout` with `apiErrorMessage` in the form or panel, or a toast.

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
- **AI-generated images are drafts.** A generated picture is saved with a `draft-` prefix (as in `docs/design-assets/` and `FE/src/assets/photos/`) and is replaced with a licensed photograph before anything is shown outside the team. Never generate a picture of a real person, logo or brand.
- **Match the frame.** When a Figma frame exists for the page you are building, match its structure, copy and states. Don't invent new patterns when one already exists in `components/ui` or the generator.
- **Compare with Figma before and after coding.** Every UI change is checked against its Figma frame twice:
  1. **Before you code,** open the frame of the same name (and its states: empty, error, each tab) and the page's section in `DESIGN.md`. Write down what it shows: layout, components, columns, copy, tabs, actions. Build to that list, not from memory or a description.
  2. **After you code,** run the page with real seeded data at 1440 wide, in the Light theme, and put a screenshot beside the frame. Go through the same list: every block, column, label, tab, button and state is there, in the same order, using the same component and copy.
  3. **Fix what differs, or say why it stays.** A difference that remains (the API doesn't return a field yet, the frame is out of date) is listed in the pull request with the reason. If the frame is wrong, update Figma and `docs/figma-plugin/src/` in the same change rather than leaving them apart.
  - The pull request names the frame and attaches the after screenshot. A page with no frame says so and follows `DESIGN.md` and the nearest existing page.

## Figma generator (`docs/figma-plugin/`)

- **What it is.** `src/*.js` generates the Figma file. `bash docs/figma-plugin/build-mcp.sh` bundles one script per Figma call and runs them all against a mock (`test/run-mcp.js`). It needs Bun.
- **Size limit.** Each bundle must stay under 50,000 characters; the build fails with `TOO BIG` otherwise. Split an entry function in two when that happens.
- **Keep source and Figma in step.** A design change made in Figma must also land in `src/`, and the reverse.
- **Scope.** The design is desktop only (1440 wide). Never delete existing Figma screens, including the mobile and Dark ones, unless the team asks.

## Git and GitHub workflow

- **Work from a story.** Every PR names the stories it implements and keeps their acceptance criteria as a checklist in the description, each one ticked or explained. Write `Closes #36` only when every criterion of #36 is met, because GitHub closes the issue on merge; otherwise write `Part of #36` and list what is still open. Keep a PR to one story or a few closely related ones, so it can be reviewed; split a whole epic into several PRs.
- **Flow:** issue, then branch, then PR. Branch from `main` with a type prefix: `feat/`, `fix/`, `style/`, `chore/`, `docs/`, `design/`. Never commit straight to `main`; check `git branch --show-current` before you commit or push.
- **Commits** use the conventional form: `feat(be): …`, `fix(fe): …`, `docs: …`. Say what changed and why. Don't add tool-generated trailers or footers to commits or PR descriptions.
- **Project board.** Add every new issue and PR to GitHub Project #4: `gh project item-add 4 --owner k-nero --url <issue-or-pr-url>`.
- **CI runs format checks, typecheck and unit tests only.** `.github/workflows/checks.yml` runs `./gradlew spotlessCheck test` in `BE/`, and `bun run typecheck` and `bun run format:check` in `FE/`, on every pull request. A green check does not mean the app starts or the FE builds. Before opening or approving a PR, run `./gradlew check` in `BE/`, and `bun run typecheck` and `bun run build` in `FE/`. For a backend change, also start the app (`docker compose up --build db storage backend`) and call the endpoints you changed: migrations, entity mappings, JPQL queries, bean wiring and check constraints only fail at startup or against a real database, never in mocked unit tests.
- **Secrets.** Never commit `.env`, secrets, API keys or JWT secrets. `.env.example` holds placeholders only. Never paste them into an AI chat either.

## Don't

- Don't push to `main`, force-push shared branches, or rewrite merged history.
- Don't edit a merged Flyway migration, or change an enum without its check-constraint migration.
- Don't show a single price before a quotation exists, or let a customer quote a route that is not in the catalog.
- Don't overwrite a document, quotation, invoice, payment or catalog version. Create a new version or a correcting entry.
- Don't weaken a legality block into a warning.
- Don't give a role a permission its story doesn't, or let a customer reach another club's records.
- Don't save first and validate after, or skip the audit entry for a decision.
- Don't write a status another service owns (the dossier status, the trip stage), or create data from a `GET` or a read-only transaction.
- Don't inject Jackson 2's `ObjectMapper`, or attach a file without `FileService.requireAttachable`.
- Don't default a missing business date to `now()`.
- Don't count calendar days in UTC.
- Don't write N+1 queries (a repository call or lazy load per row), or join, filter or sort related tables in Java instead of SQL.
- Don't fetch data in a page with `useEffect`, hard-code ids or mock data, hide a failed request, or link to `/api/...` files directly.
- Don't present demo figures as real data.
- Don't write code comments, UI text, commit messages or docs in any language other than English.
- Don't create a new component, hook, helper or pattern when an existing one does the job or can be extended to.
- Don't hand-write a general-purpose utility (debounce, throttle, deep equality, grouping) that `lodash-es` already has.
- Don't build a control out of plain HTML (`<button>`, `<input>`, `<select>`, `<table>`, CSS tabs, `<div>` overlays) in a page, or lay out a list page differently from `pages/staff/users` and `pages/staff/jobs`.
- Don't re-create a Figma component that `components/ui` already has, or write plain HTML where an Ant Design component does the job.
- Don't put two sibling components in one file, or a Zod schema in a component file.
- Don't draw a page's own loading text, spinner, error or offline state; the table, `Skeleton` and the error boundary own those.
- Don't start or finish a UI change without comparing it with its Figma frame, or open a UI pull request without the frame's name and a screenshot of the result.
