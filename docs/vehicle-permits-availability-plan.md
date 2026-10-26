# Plan: vehicle permits and operating corridors, in planning (and later in incidents)

Status: model settled on 26 Oct 2026 (see Decisions). PR 1 covers permits, operating corridors and trip planning; incident availability waits for a later PR. Nothing is built yet.

## Scope

A vehicle is based in one country, holds permits for others, and works a list of **operating corridors**: the routes the company runs it on. Whether a vehicle may join a road trip is checked from three things: the trip's corridor is one of its operating corridors, the vehicle is in the country the trip starts in when it starts, and it is free.

1. **Vehicle permits and operating corridors.** Each vehicle has a **home country**, zero or more **permitted countries**, and one or more **operating corridors**. A corridor is assigned to a vehicle only when the vehicle holds a permit for every country on it. Corridors gain an **origin country** and a **destination country**.
2. **Trip planning respects them.** Every way a vehicle joins a road trip checks it:
   - choosing or changing a trailer on the Load plan tab;
   - adding a trailer to a convoy;
   - the default trailer pick;
   - booking it for a job on the fleet calendar;
   - confirming the load plan.

   The pickers show which vehicles may run the trip and why the others may not.
3. **Later: availability on incident options.** When the coordinator proposes an option that needs another vehicle, the system lists the vehicles that can do it. Not in PR 1.

**Out:** empty repositioning drives (a vehicle that isn't where a trip starts is not available for it); handing a trip over to another vehicle at a border (a journey that changes vehicles is a chain of trips, US-F3-16); partner carriers; live vehicle positions; permits per border crossing rather than per country.

## The model

### Data

- **Vehicle:** `homeCountry` (required); `permittedCountries` (zero or more foreign countries; the home country is never listed again); `operatingCorridors` (road corridors it runs).
- **Corridor:** `originCountry` and `destinationCountry` (new, required), plus its ordered border crossings (`corridor_crossings`, already in the catalog). Each crossing knows its `fromCountry` and `toCountry`.
- **A corridor's countries**, in order: the origin country, then each crossing's `toCountry`. For example:

| Corridor | Countries |
|---|---|
| RD HCM → PNH | VN, KH |
| RD HCM → BKK | VN, KH, TH |
| RD BKK → HCM | TH, KH, VN |
| RD HCM → HAN | VN only (domestic) |

Each direction is its own corridor, so a vehicle that runs both ways has both.

### Assigning an operating corridor

A road corridor can be added to a vehicle's operating corridors only when every one of the corridor's countries is the vehicle's home country or one of its permitted countries. This includes a corridor that neither starts nor ends in the home country (decision 1): a VN vehicle with TH and MY permits may run RD BKK → KUL. Air corridors are never operating corridors: no vehicle flies.

Refusals: "TX-447 has no permit for Thailand, so it can't run RD HCM → BKK."

### Planning a road trip (`Vehicle.refusalFor(Trip)`)

A vehicle may join a road trip when all of these hold, checked in this order:

1. **Status:** the vehicle is `ACTIVE` (unchanged).
2. **Corridor:** the trip's corridor is one of its operating corridors. "TX-447 doesn't run RD BKK → KUL."
3. **Location:** it is in the trip's origin country when the trip starts. Where a vehicle is at a time is worked out from its own bookings: the destination country of its last trip booking that ends at or before that time, or its home country when it has none. "TX-447 will be in Vietnam on 14 Oct; this trip starts in Thailand." A vehicle that isn't there is not available, like one in maintenance: there are no empty repositioning drives.
4. **Free:** no other booking overlaps the trip's span (the existing fleet-calendar check). "TX-447 is booked until 18 Oct 14:00."

Air trips carry no vehicle (multi-trip design: the flight takes the trailer's place), so they are unchecked.

Examples, for a VN vehicle with KH and TH permits that runs RD HCM → BKK and RD BKK → HCM:

| Trip | Vehicle's last trip before it | Result |
|---|---|---|
| RD HCM → BKK, 10 Oct | none (home, VN) | allowed |
| RD BKK → HCM, 14 Oct | RD HCM → BKK, ends 12 Oct (TH) | allowed: the return load |
| RD BKK → HCM, 14 Oct | none (home, VN) | refused: it is in Vietnam |
| RD HKG → Sha Tin, after a flight | anything | refused: not an operating corridor, and it isn't in Hong Kong |

A road corridor with no vehicle assigned can't be planned: "No vehicle runs RD BKK → KUL yet. Assign one on the Vehicles page."

### Consistency of the corridor catalog

The origin and destination countries must agree with the crossings. For a corridor with crossings:
- the origin country is the first crossing's `fromCountry`;
- the destination country is the last crossing's `toCountry`;
- each crossing starts where the previous one ended.

A corridor without crossings and with two different countries is only valid for AIR. `CorridorService.create` already checks this for a corridor added on the Routes page; a test over the seeded catalog checks the seeded ones.

## Behaviour

### Vehicles page

- Adding or editing a vehicle sets the home country (`SelectField`), the permitted countries (multi-select) and the operating corridors (multi-select of road corridors). Corridors the vehicle has no permits for are refused with the sentence above.
- The Vehicles list gets a Countries column ("VN · KH, TH": home, then permits) and a Corridors column (the corridor codes, or a count when there are many).
- **Removing a permit is refused while one of the vehicle's operating corridors needs that country**; remove the corridor first. **Removing an operating corridor (or changing the home country) is refused while the vehicle is on an undelivered trip on that corridor.** The refusal names the trip: "TX-447 is on TRP-2026-014 (RD HCM → BKK), leaving 18 Oct; take it off that trip first."
- Every change writes an audit row.

### Routes page

- A new road corridor starts with no vehicles. Its row says "No vehicle yet" until one is assigned, and it can't be planned until then. The New route form gains no fields: `CorridorService.create` already works out the two countries from the cities' places and now stores them.

### Trip planning (Load plan tab, fleet calendar)

- The trailer pickers list vehicles that may join the trip first. The others are shown disabled with the refusal sentence as the reason ("Not available: in Vietnam on 14 Oct"), so nobody thinks the truck is missing.
- The backend refuses at every entry point with the same sentence. Today all three Load plan paths (create plan, change vehicle, add trailer) go through one check, `LoadPlanService.activeVehicle(...)`. It becomes `usableVehicle(vehicle, trip, use)`, which applies the four checks above.
- `createLoadPlan` without a vehicle currently picks "the first active vehicle". It changes to the first vehicle that may join the trip; if there is none, the refusal is the corridor's ("No vehicle runs …") or "No vehicle that runs RD HCM → BKK is free and in Vietnam on 10 Oct".
- A fleet-calendar booking made for a job (`VehicleService.book` with `jobId`) is checked against that job's trip.
- **Confirming the load plan** rechecks every trailer, in case permits, corridors or earlier trips changed after the trailer was chosen.
- **Location depends on earlier trips.** When a vehicle's earlier trip is cancelled, moved or taken off it, a later trip it is on may now start where it isn't. The confirm recheck catches this before departure; the Load plan tab also shows the refusal on the trailer row so the coordinator sees it early.
- **Joining a trip** (US-F3-13) needs no new rule: jobs on a trip share its corridor. **Trip chains** (US-F3-16): each road trip of the chain is checked on its own corridor and start country, so the leg after a flight needs a vehicle that works that corridor and is there.

## Decisions

1. **Third-country carriage. Settled: allowed** when the vehicle holds a permit for every country on the corridor; it is enforced when the corridor is assigned to the vehicle.
2. **Removing a permit or corridor that's in use. Settled: refused**, naming what needs it (an operating corridor, or an undelivered trip).
3. **Who edits.** Settled: the fleet coordinator and the logistics manager, the same roles that create vehicles. Each change writes an audit row (AGENTS.md, Audit every decision).
4. **Countries list for the vehicle form. Settled: already built.** `GET /api/v1/staff/countries` (`RouteStopCatalogController`) is readable by every staff role.
5. **A new corridor. Settled:** it starts with no vehicles and can't be planned until one is assigned.
6. **A vehicle that isn't where the trip starts. Settled:** not available, with no empty repositioning drive.
7. **Design. Settled:** no Figma frame covers permits, operating corridors or disabled vehicles in pickers. The UI follows the nearest existing pages, and the PR adds its rules to DESIGN.md.
8. **Open, for the incident PR:** the availability window and whether a busy vehicle may be proposed.

## What it touches (PR 1)

Paths are relative to `BE/src/main/java/com/equifreight/` and `FE/src/` unless written in full. "New" is a new file; "Edit" changes an existing one.

| Layer | File | Change | Size |
|---|---|---|---|
| DB | `BE/src/main/resources/db/migration/V27__vehicle_permits_corridors.sql` | New. Details below. A SQL migration, not seed code, so it reaches existing databases. | M |
| Entity | `entity/Vehicle.java` | Edit. `homeCountry` (`@ManyToOne`), `permittedCountries` and `operatingCorridors` (`@ManyToMany Set`). | S |
| Entity | `entity/Corridor.java` | Edit. `originCountry` and `destinationCountry` (`@ManyToOne`); `List<Country> countries()`; `isRoad()`. | S |
| Domain | `entity/Vehicle.java` | Edit. `Optional<String> refusalToRun(Corridor)` (permits, for assigning a corridor) and the planning checks that need no repository. Location and overlap come from bookings, in the service. | S |
| Service | `service/VehicleAvailability.java` | New. `refusalFor(vehicle, trip)`: the four planning checks in order, with the location from bookings. One place for every entry point. | M |
| Seed | `configuration/CatalogSeeder.java`, `configuration/DataSeeder.java` | Edit. Seeded corridors get their countries. Seeded vehicles get home countries, permits and operating corridors that cover every seeded road corridor, including a Hong Kong vehicle for the leg after a flight, plus one vehicle whose corridors don't fit so the pickers show a refusal. | S–M |
| Repo | `repository/VehicleRepository.java` | Edit. Load vehicles with their countries and corridors in one query (`@EntityGraph`); vehicles that run a corridor. | S |
| Repo | `repository/VehicleBookingRepository.java` | Edit. A vehicle's last trip booking ending at or before a time; undelivered trips of a vehicle on a corridor. | S |
| DTO | `model/fleet/CreateVehicleRequest.java`, `UpdateVehicleRequest.java` | Edit. `homeCountryId`, `permittedCountryIds`, `operatingCorridorIds`. | S |
| DTO | `model/fleet/VehicleResponse.java`, `FleetMapper.java` | Edit. Home and permitted countries (code, name), operating corridors (id, code). | S |
| DTO | `model/route/CorridorResponse.java`, `RouteMapper.java` | Edit. Origin and destination country codes, the ordered country list, and the number of vehicles that run it. | S |
| Service | `service/CorridorService.java` | Edit. `create` stores the origin and destination countries it already works out. | S |
| Service | `service/VehicleService.java` | Edit. Resolve countries and corridors; refuse a corridor without permits; refuse removing a permit a corridor needs, or a corridor an undelivered trip needs; audit rows; `book` for a job checks the trip. | M |
| Service | `service/LoadPlanService.java` | Edit. `activeVehicle(vehicle, use)` becomes `usableVehicle(vehicle, trip, use)` at its three call sites; the default pick and `confirmLoadPlan` use it too. | M |
| API | `controller/staff/VehicleController.java` | Edit. `GET /active` takes an optional `tripId` and returns each vehicle with `available` and `reason`, so pickers can show disabled rows. Write endpoints gain the new fields. | S |
| FE types and API | `interfaces/vehicle.ts`, `Corridor` in `interfaces/job.ts`, `apis/vehicle.ts`, `hooks/useVehicle.ts`, a `useCountries` hook | Edit. The new fields; `useActiveVehicles(tripId?)`. | S |
| FE form | `pages/staff/vehicles/ViewAddEdit/AddVehicleModal.tsx`, `schema.ts` | Edit. Home country, permitted countries and operating corridors, with Zod rules (home not in permits; at least one corridor). | M |
| FE list | `pages/staff/vehicles/useGeneratedColumn.tsx` | Edit. Countries and Corridors columns; the row edit shows the in-use refusals. | S |
| FE routes | `pages/staff/corridors/` | Edit. "No vehicle yet" on a corridor nobody runs. | S |
| FE planning | `pages/staff/jobs/ViewAddEdit/LoadPlanTab.tsx`, `pages/staff/vehicles/ViewAddEdit/BookVehicleModal.tsx` | Edit. Pickers pass the trip, list available vehicles first and the rest disabled with the reason; show the backend refusal. | M |
| Tests | `VehicleTest` (new), `VehicleAvailabilityTest` (new), `VehicleServiceTest` (new), new `LoadPlanServiceTest`, a catalog consistency test (new), `DataSeederTest`; fixtures in `Flow3ServiceTest`, `RouteJobStopsTest`, `ConvoyTest`, `TripServiceTest`, `TripLeavingServiceTest`, `JobTripServiceTest` | Every rule and refusal sentence; the return-load and after-a-flight cases; corridor assignment refused without permits; in-use removals refused; each planning entry point refuses; confirm rechecks; air trips unchecked. A shared `vehicleFor(corridor)` fixture helper keeps the six existing classes to one line each. | M–L |

**Migration V27:**

- `vehicles.home_country_id` (FK `countries`). Backfilled to VN, then set `not null`.
- `vehicle_countries (vehicle_id, country_id)`, PK on both. Backfilled with every country except VN, for every vehicle.
- `vehicle_corridors (vehicle_id, corridor_id)`, PK on both. Backfilled with every road corridor, for every vehicle, so planning behaves as today until staff narrow the lists.
- `corridors.origin_country_id` and `destination_country_id` (FK `countries`). Backfilled from the first crossing's `from_country_id` and the last crossing's `to_country_id`; the rest (corridors without crossings) from their places' countries, with a guard that fails the migration if any row is still null; then `not null`.
- Location needs no column: it is worked out from `vehicle_bookings`.

Rough size: **5–7 developer-days** with tests.

### Docs

- `DESIGN.md`: the Vehicles page, the Routes page's "No vehicle yet", and the Load plan tab's trailer picker.
- `docs/database/database-design.md`: the new columns and tables, and the consistency rule.
- `docs/multi-trip-jobs-design.md`: each road trip of a chain is checked on its own corridor and start country.
- `PRODUCT.md` (Region): a corridor names its countries; vehicles carry permits and operating corridors.

## Later: incident availability (PR 2)

When the coordinator proposes "Send a second vehicle", the select lists candidates for the incident's trip: **Ready** (passes every planning check above and has enough stalls), **Busy until …**, and **Can't run this trip** (hidden, with a count and the main reason). It reuses `VehicleAvailability`. The window and whether a busy vehicle may be proposed are decided then.

## Risks

- **Location from bookings.** It is only as good as the bookings: a vehicle moved without a trip (for repairs, say) is still where its last trip ended. A maintenance booking doesn't move it. If this proves wrong in practice, a manual "current country" override is the follow-up.
- **Earlier trips changing.** Cancelling or moving a trip can make a vehicle's later trip start where it isn't. The confirm recheck stops it before departure, and the Load plan tab shows it on the trailer row.
- **Backfill too generous.** "VN, permitted everywhere, runs every road corridor" keeps today's behaviour but says nothing until staff narrow it. Existing vehicles also all start "in Vietnam", so a road trip that starts abroad is refused until a vehicle based there, or one whose last trip ends there, exists. The seeders cover this for demo data; an existing database needs its foreign-based vehicles set after the migration.
- **Test fixtures.** Six test classes build vehicles and put them on trips; each needs vehicles whose corridors and location fit. The shared helper keeps that small.
- **Corridor data quality.** The consistency test over the seeded catalog and the migration's null guard catch a bad corridor; corridors added on the Routes page are already checked by `CorridorService.create`.
