# Plan: vehicle country permits, in planning and in incidents

Status: draft for discussion, 26 Oct 2026. Nothing is built yet.

## Scope

A vehicle is based in one country and may hold permits for others. Whether it may run a trip is **worked out** from the trip's corridor and the countries that corridor passes through. Nobody keeps a list of vehicles per corridor.

1. **Vehicle permits.** Each vehicle has a **home country** and zero or more **permitted countries**. Corridors gain an **origin country** and a **destination country**.
2. **Trip planning respects permits.** Every way a vehicle joins a trip checks `vehicle.mayRun(trip.corridor)`:
   - choosing or changing a trailer on the Load plan tab;
   - adding a trailer to a convoy;
   - the default trailer pick;
   - booking it for a job on the fleet calendar;
   - confirming the load plan.
   
   The pickers show which vehicles may run the corridor and why the others may not.
3. **Availability on incident options.** When the coordinator proposes an option that needs another vehicle, the system lists the vehicles that can do it: they may run the trip's corridor, have enough stalls, and are free for the window. It shows when each busy one is next free, and warns when none fits.

**Out (later, if at all):** a "waiting for a vehicle" state with care, then a new trip; partner carriers; live vehicle positions or travel-time estimates; permits per border crossing rather than per country.

## The model

### Data

- **Vehicle:** `homeCountry` (required) and `permittedCountries` (zero or more foreign countries; the home country is never listed again).
- **Corridor:** `originCountry` and `destinationCountry` (new, required), plus its ordered border crossings (`corridor_crossings`, already in the catalog). Each crossing knows its `fromCountry` and `toCountry`.
- **A corridor's countries**, in order: the origin country, then each crossing's `toCountry`. For example:

| Corridor | Countries |
|---|---|
| RD HCM → PNH | VN, KH |
| RD HCM → BKK | VN, KH, TH |
| RD HCM → HAN | VN only (domestic) |

### The rules (`Vehicle.mayRun(Corridor)`)

1. **Air corridor:** always allowed, with no check. Road vehicles on an air trip only do the airport legs, which are domestic at each end. (Permits for airport legs are a possible follow-up.)
2. **Domestic road corridor** (origin country equals destination country, and no crossings): only vehicles whose **home country** is that country. A foreign truck doesn't carry a job inside another country, even if it holds a permit to enter it.
3. **Cross-border road corridor:** every one of the corridor's countries must be the vehicle's home country or one of its permitted countries.

Each refusal says why, in one sentence:

- "TX-447 (Vietnam) has no permit for Thailand."
- "TX-447 is based in Vietnam and can't run a domestic Thailand route."

| Vehicle | Permits | RD HCM → HAN (VN) | RD HCM → PNH (VN, KH) | RD HCM → BKK (VN, KH, TH) | RD BKK → KUL (TH, MY) |
|---|---|---|---|---|---|
| VN truck | none | yes | no | no | no |
| VN truck | KH | yes | yes | no | no |
| VN truck | KH, TH, MY | yes | yes | yes | yes, unless decision 1 says no |
| TH truck | MY | no | no | no | yes |

### Consistency of the corridor catalog

The origin and destination countries must agree with the crossings. For a corridor with crossings:
- the origin country is the first crossing's `fromCountry`;
- the destination country is the last crossing's `toCountry`;
- each crossing starts where the previous one ended.

A corridor without crossings and with two different countries is only valid for AIR. A test over the seeded catalog checks these, so a bad corridor is caught before it reaches planning.

## Behaviour

### Vehicles page

- Adding or editing a vehicle sets the home country (`SelectField`) and the permitted countries (multi-select), both from the countries catalog.
- The Vehicles list gets a Countries column: "VN · KH, TH" (home, then permits).
- **Removing a permitted country (or changing the home country) is refused while the vehicle is on an undelivered trip whose corridor needs that country.** The refusal names the trip: "TX-447 is on TRP-2026-014 (RD HCM → BKK), leaving 18 Oct; take it off that trip first".
- **Backfill:** existing vehicles get home country VN and permits for every other country in the catalog. Behaviour doesn't change on the day this ships; staff narrow the permits afterwards. The list marks vehicles still on the backfilled "all countries" set, so they're easy to find.

### Trip planning (Load plan tab, fleet calendar)

- The trailer pickers list **vehicles that may run the corridor** first. The others are shown disabled, with the refusal sentence as the reason, so nobody thinks the truck is missing.
- The backend refuses at every entry point with the same sentence. Today all three Load plan paths (create plan, change vehicle, add trailer) go through one check, `LoadPlanService.activeVehicle(...)`. It becomes `usableVehicle(vehicle, trip, use)`, which checks status, then `mayRun`.
- `createLoadPlan` without a vehicle currently picks "the first active vehicle". It changes to the first active vehicle that **may run the corridor**. If there is none, the refusal is "No active vehicle may run RD HCM → BKK".
- A fleet-calendar booking made for a job (`VehicleService.book` with `jobId`) is checked against that job's trip corridor.
- **Confirming the load plan** rechecks every trailer, in case permits changed after the trailer was chosen.
- **Joining a trip** (US-F3-13) needs no new rule: jobs on a trip share its corridor. **Trip chains** (US-F3-16) also need none: each trip of the chain is checked on its own corridor when its trailers are chosen. A VN truck can run the domestic leg to the airport even when the chain's next trip is a flight.

### Incident option, "Send a second vehicle"

The "Second vehicle" select no longer lists every active vehicle. It lists **candidates** for the incident's trip, in three groups:

- **Ready.** The vehicle is active, may run the trip's corridor, has at least as many stalls as the horses leaving, and has no booking overlapping the window.
- **Busy until …** The vehicle may run the corridor and is big enough, but has a booking in the window. It shows "free from 18 Oct 14:00" and can still be picked with a warning.
- **Can't run this route.** These are hidden, with a count and the main reason: "3 vehicles have no permit for Cambodia".

If nothing is Ready, a Warn callout says so and names the earliest "free from". The coordinator's own delay estimate stays; the system shows the fleet's figure next to it.

For **Return to origin** and **Unload, continue later**, the new trip is planned later on the job's corridor (`JobTripService.newTripFor`), and its trailers go through the planning check above. The modal shows the candidate summary as information only.

When the manager **approves** an option, a second vehicle that has since become busy or can no longer run the corridor is refused, with the reason and the earliest free time.

## Decisions needed before building

1. **Third-country carriage.** May a vehicle run a corridor that neither starts nor ends in its home country? For example, a VN truck with TH and MY permits on RD BKK → KUL. Permits often don't allow this. If not allowed, rule 3 gains: "the corridor starts or ends in the vehicle's home country". It's one line, but it changes who is eligible, so confirm it with the domain owner.
2. **Removing a permit that's in use.** Proposed: refuse while the vehicle is on an undelivered trip that needs that country. The alternative is to allow it with a warning and flag the trip.
3. **The incident availability window.** Proposed: from now until the moving trip's planned arrival plus the option's `delayMinutes`. It's an approximation, labelled "by the fleet calendar".
4. **Can a "Busy" vehicle be picked for an incident option?** Proposed: yes, with a warning on proposal and a refusal on approval if it's still busy.
5. **Who edits permits.** Proposed: the fleet coordinator and the logistics manager, the same roles that create vehicles. A permit change writes an audit row (AGENTS.md, Audit every decision).
6. **The countries list for the vehicle form.** `GET /staff/regulations/countries` is limited to the transport specialist and the logistics manager. Proposed: a small `GET /staff/countries` (id, code, name) that every staff role can read, rather than exposing the regulations endpoint.
7. **Design.** DESIGN.md and the Figma frames don't cover permits, disabled vehicles in pickers, or the incident candidate list. A design pass, or at least DESIGN.md rules, comes before the UI.

## What it touches

Paths are relative to `BE/src/main/java/com/equifreight/` and `FE/src/` unless written in full. "New" is a new file; "Edit" changes an existing one.

### Part 1: vehicle permits and corridor countries

| Layer | File | Change | Size |
|---|---|---|---|
| DB | `BE/src/main/resources/db/migration/V26__vehicle_country_permits.sql` | New. Details below. Must be a SQL migration, not seed code, so it reaches existing databases. | M |
| Entity | `entity/Vehicle.java` | Edit. `homeCountry` (`@ManyToOne`), `permittedCountries` (`@ManyToMany Set<Country>`). | S |
| Entity | `entity/Corridor.java` | Edit. `originCountry` and `destinationCountry` (`@ManyToOne`); `List<Country> countries()` (origin, then each crossing's `toCountry`); `isDomestic()`. | S |
| Domain | `entity/Vehicle.java` | Edit. `Optional<String> refusalFor(Corridor)` returns the refusal sentence, or empty when allowed; `mayRun(Corridor)` is `refusalFor(...).isEmpty()`. The three rules live here and only here. | S |
| Seed | `configuration/CatalogSeeder.java`, `configuration/DataSeeder.java` | Edit. Every seeded corridor gets its origin and destination countries: `DemoCorridor` gains two country codes, and `createCorridorIfAbsent` takes them. The 3 seeded vehicles get home countries and a deliberate mix of permits, so pickers and incidents show allowed, refused and busy cases. On a fresh database the seeders run after Flyway, so they, not the migration, fill these. | S–M |
| Repo | `repository/VehicleRepository.java` | Edit. Load vehicles with their countries in one query (`@EntityGraph`), for pickers and candidates. | S |
| Repo | `repository/TripVehicleRepository.java` (or `VehicleBookingRepository.java`) | Edit. "Undelivered trips of this vehicle", for the refusal on permit removal. | S |
| DTO | `model/fleet/CreateVehicleRequest.java`, `UpdateVehicleRequest.java` | Edit. `homeCountryId`, `permittedCountryIds`. | S |
| DTO | `model/fleet/VehicleResponse.java`, `FleetMapper.java` | Edit. Home and permitted countries (code, name), and an "all countries (backfilled)" flag. | S |
| DTO | `model/route/CorridorResponse.java`, `RouteMapper.java` | Edit. Origin and destination country codes, and the ordered country list. | S |
| Service | `service/VehicleService.java` | Edit. Resolve the countries; refuse unknown ones; drop the home country from permits; refuse a change that breaks an undelivered trip; write an audit row. | M |
| API | `controller/staff/VehicleController.java` | Edit. `GET /active` takes an optional `corridorId` and returns each vehicle with `mayRun` and `reason`, so pickers can show disabled rows. Write endpoints only gain new fields. | S |
| API | `controller/staff/CountryController.java` (new) | New. `GET /api/v1/staff/countries`, read-only, for every staff role (decision 6). | S |
| FE types | `interfaces/vehicle.ts`, `Corridor` in `interfaces/job.ts` | Edit. Vehicle countries; `mayRun` and `reason` on the active list; corridor countries. | S |
| FE API | `apis/vehicle.ts`, `hooks/useVehicle.ts`, a `useCountries` hook | Edit. Fields pass through; `useActiveVehicles(corridorId?)`. | S |
| FE form | `pages/staff/vehicles/ViewAddEdit/AddVehicleModal.tsx`, `schema.ts` | Edit. Home country select and permitted countries multi-select, with Zod rules (home not in permits). | S |
| FE list and edit | `pages/staff/vehicles/useGeneratedColumn.tsx` | Edit. Countries column with the backfill marker; the row edit (`useUpdateVehicle`) sets the countries and shows the in-use refusal. | S |
| Tests | `VehicleTest` (new, unit tests of `refusalFor`), `VehicleServiceTest` (new: none exists today), `DataSeederTest`, a catalog consistency test (new) | Every rule and refusal sentence (domestic, cross-border, air; plus third-country if decision 1 adds it); create and update with countries; in-use removal refused; seeded corridors are consistent with their crossings. | M |

**Migration V26:**

- `vehicles.home_country_id` (FK `countries`). Backfilled to VN, then set `not null`.
- `vehicle_countries (vehicle_id, country_id)`, PK on both. Backfilled with every country except VN, for every vehicle.
- `corridors.origin_country_id` and `destination_country_id` (FK `countries`). Backfilled as follows, then set `not null`:
  - corridors with crossings: from the first crossing's `from_country_id` and the last crossing's `to_country_id`;
  - the rest (today RD HCM → HAN, AIR SGN → HKG and AIR PNH → HKG): set by code, with a guard that fails the migration if any row is still null.

### Part 2: trip planning respects permits

| Layer | File | Change | Size |
|---|---|---|---|
| Service | `service/LoadPlanService.java` | Edit. `activeVehicle(vehicle, use)` becomes `usableVehicle(vehicle, trip, use)` at its three call sites (create plan, change vehicle, add trailer). The no-vehicle default picks the first vehicle that may run the corridor. `confirmLoadPlan` rechecks every trailer. | M |
| Service | `service/VehicleService.java` (`book`, ~line 140–190) | Edit. A booking for a job checks the job's trip corridor. | S |
| Service | `service/LoadPlanService.java` (private `book`, ~line 746) | No change: every vehicle reaching it has passed `usableVehicle`. A test pins this. | — |
| FE | `pages/staff/jobs/ViewAddEdit/LoadPlanTab.tsx` | Edit. Passes the trip's corridor to `useActiveVehicles`, lists allowed vehicles first and the rest disabled with the reason, and shows the backend refusal. | M |
| FE | `pages/staff/vehicles/ViewAddEdit/BookVehicleModal.tsx` | Edit. Shows the refusal when the job's corridor isn't allowed. | S |
| Tests | New `LoadPlanServiceTest` (none exists today); updated fixtures in `Flow3ServiceTest`, `RouteJobStopsTest`, `ConvoyTest`, `TripServiceTest`, `TripLeavingServiceTest`, `JobTripServiceTest` (the 6 classes that build vehicles) | Each entry point refuses a vehicle that may not run the corridor; the default pick skips one; confirm rechecks; an air corridor is unchecked; a chain's domestic leg accepts a home-country truck. Fixtures need vehicles with a home country and permits that fit their corridors; a shared helper keeps that to one line. This is the main hidden cost. | M |

### Part 3: availability on incident options

| Layer | File | Change | Size |
|---|---|---|---|
| Repo | `repository/VehicleBookingRepository.java` | Edit. Bookings for many vehicles overlapping a window (`vehicle.id in :ids`): one query instead of one per vehicle. | S |
| Service | `service/VehicleCandidates.java` (new) | New. `candidates(Trip, horses, from, to)`: active vehicles; `refusalFor(trip.corridor)`; stall count; overlapping bookings; "free from" as the latest overlapping booking's end. Returns Ready, Busy and CantRun (with the most common reason), plus a count. | M |
| DTO | `model/incident/VehicleCandidateResponse.java` (new) | New. Vehicle id, code, stalls, group, freeFrom, reason. | S |
| API | `controller/IncidentController.java` | Edit. `GET /api/v1/staff/incidents/{id}/vehicle-candidates?horses=n&delayMinutes=m`, for the coordinator and manager. | S |
| Service | `service/IncidentService.java` | Edit. Thin method behind the endpoint: the moving trip via `TripLeavingService.movingTrip`, the window from planned arrival plus delay. | S |
| Service | `service/TripLeavingService.prepare` | Edit. On a `SECOND_VEHICLE` proposal, a vehicle that may not run the corridor or is too small is refused; a busy one is accepted, with a warning. | S |
| Service | `service/IncidentService.decide` / `TripLeavingService.leave` | Edit. On approval, a second vehicle that is now busy or not allowed is refused, with the reason and the earliest free time. | S–M |
| DTO | Option response (~line 975 in `IncidentService`), `interfaces/incident.ts` | Optional. "Vehicle busy until …" on the option card, computed on read. | S |
| FE | `apis/incident.ts`, `hooks/incident.ts` | Edit. `useVehicleCandidates(incidentId, horses, delay)`. | S |
| FE | `pages/staff/incidents/AddOptionModal.tsx` | Edit. Replaces `useActiveVehicles` with candidates; grouped select (Ready, Busy until …); a Warn `Callout` when none is Ready; the info summary for Return and Unload. Refetches when the horses or delay change. | M |
| FE | `pages/staff/incidents/IncidentOptions.tsx` | Edit. Shows the vehicle's state on a second-vehicle option. | S |
| Tests | `TripLeavingServiceTest`, `IncidentServiceTest`, new `VehicleCandidatesTest` | Grouping (rules, stalls, overlap, free-from); proposal refusals; approval refused when the vehicle became busy. | M |

### Docs (all parts)

- `DESIGN.md`: the Vehicles page, the Load plan tab's trailer picker and the Incident option modal.
- `docs/database/database-design.md`: `vehicles.home_country_id`, `vehicle_countries`, `corridors.origin_country_id` and `destination_country_id`, and the consistency rule.
- `docs/incidents-design.md`: the candidate rule.
- `docs/multi-trip-jobs-design.md`: each trip of a chain is checked on its own corridor.
- `PRODUCT.md` (Region): a corridor now names its countries, and vehicles carry permits.

### Summary

- **Backend:** about 17 files edited and 4 new (migration, `CountryController`, `VehicleCandidates`, candidate DTO).
- **Frontend:** about 11 files edited, no new pages.
- **Tests:** 8–9 existing test classes extended or with updated fixtures, and 4–5 new ones.
- **Database:** one additive migration: two columns on `vehicles` and `corridors` with backfills, plus one join table. No change to the trips, bookings or incidents tables.
- **Not touched:** the trip, chain and handover state machines, `TripService`, `JobTripService` (beyond being read), the cab surface, and the request's corridor resolution and clearance (which already read crossings and keep doing so). Part 2 adds a check where a vehicle joins a trip, and Part 3 one at incident proposal and approval. Neither changes how trips move.

Rough size: **7–10 developer-days** with tests, plus the design pass:

| Part | Days |
|---|---|
| Part 1: permits, corridor countries, migration and seeders | about 2.5 |
| Part 2: planning | 2–3, mostly test fixtures and the Load plan picker |
| Part 3: incident availability | 3–4 |

## Order of work (two PRs)

1. **PR 1: country permits in planning (Parts 1 and 2).** These ship together, because permits nobody enforces only mislead. Thanks to the backfill, nothing changes for users until staff narrow a vehicle's permits.
2. **PR 2: incident vehicle candidates (Part 3).** Depends on PR 1.

## Risks

- **Test fixtures (Part 2).** Six test classes build vehicles and put them on trips. Each needs vehicles whose countries fit their corridors; a shared helper (`vehicleFor(corridor)`) keeps that to one line per test.
- **Corridor data quality.** The rules are only as good as the corridors' countries and crossings. The consistency test over the seeded catalog, and the migration's null guard, catch a bad corridor before it reaches planning. Corridors are seeded catalog data today (there is no corridor editor), so new corridors come through the seeders and get the same check.
- **Backfill too generous.** "VN plus every other country" keeps today's behaviour but means permits say nothing until staff narrow them. The list's backfill marker makes the unreviewed vehicles visible.
- **Approximate incident window.** "Free" means free on the booking calendar, not "can reach the horses in time". The UI must say "by the fleet calendar".
- **Third-country carriage (decision 1).** If it turns out to be forbidden and the rule is added later, some trucks that were eligible stop being eligible. Settle it before PR 1.
- **Air corridors.** Unchecked under rule 1. If the project later needs airport-leg permits, that's a follow-up.
