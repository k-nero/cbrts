# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Spring Boot (Java) backend with a React single-page frontend, the same stack the team used on its previous SWP391 project. `README.md` lists versions and how to run it; `AGENTS.md` lists the conventions.

## Users

**Primary: customers**, meaning racing clubs and horse owners who need racehorses moved by road or air, often across a border. They request transport, supply horse details, accept or decline quotations, upload the legal and veterinary documents for each horse, and follow the trip until handover. When a trade-off comes up, the customer-facing surfaces win.

Secondary, internal staff, each with a distinct job:

- **Logistics Manager**: reviews incoming requests for feasibility, builds and issues quotations, gives final approval, handles escalations, and watches revenue, cost and on-time performance.
- **Transport Specialist**: owns documentation and clearance. Verifies each document, files dossiers with authorities, tracks quarantine, and maintains the regulation and rate catalogs.
- **Fleet & Route Coordinator**: plans routes, assigns vehicles and stall positions, and records trip progress by leg.
- **Driver / Escort**: follows the assigned schedule, records status at each checkpoint, and logs each horse's condition.

## Product Purpose

The product turns a customer's enquiry into a legally movable, priced, staffed transport job, then carries that job through clearance, planning, the journey and handover. It exists because moving racehorses across borders depends on paperwork that is only valid inside time windows relative to the travel dates, and on quotes whose cost drivers are easy to get wrong by hand.

Success means:

- no horse departs without complete, valid clearance;
- customers know at every point what they owe and by when;
- quotes are itemised and explainable line by line.

## Positioning

- **Documents are checked against the job's travel dates, not today.** Each document type carries a machine-evaluable validity rule (window before departure, valid until, booster window, or presence only). Each rule returns GREEN, AMBER or RED and re-runs whenever the dates, the catalog or the horse list change.
- **Clearance is a hard gate.** Departure cannot be recorded until the dossier reaches CLEARANCE_READY.
- **Quotations are built from a versioned rate catalog in a fixed calculation order.**
  - Space is priced by stall width, not headcount.
  - Grooms are one per three horses, rounded up.
  - Quarantine cost depends on each horse's sex.
  - Insurance is a percentage of declared value.
- **Arrival is a window, never an exact hour.** By default a move gets an expected arrival time and dates that can move by ±3 days. A road customer can instead buy an arrival window of at least 3 hours: it needs a private trailer, costs a catalog surcharge (20% of the ground lines), and if the horses arrive after the window closes EquiFreight pays the contract penalty (10% of the job total per started hour late, up to 30%), credited on the final invoice. The clock stops while a border authority holds the trailer or a vet stops it for a horse's welfare, so a deadline never cuts a welfare stop or a border check. Air arrival follows the airline's schedule and has no window. The figures are placeholders, like every price in the demo.

## Operating Context

- **Six flows.** Four are required: request and approval; legal documents and customs clearance; route planning and fleet coordination; trip status and journey log. Two are optional: incident handling and re-routing; handover and trip acceptance.
- **Authorities have no API.** Every interaction with veterinary, customs and quarantine authorities happens offline and is recorded by hand by the Transport Specialist. TRACES is an external system the specialist works in, not a document type.
- **Catalogs are versioned and pinned.** The Country Regulation Catalog is pinned to each job and the rate catalog to each quotation. A later change never silently alters an in-flight case or an issued quote.
- **Nothing is overwritten.** Re-uploading a document creates a new version, because the history is the legal evidence for a border crossing.
- **Region.** The demo data and launch region are Vietnam, Cambodia, Thailand, Laos, Malaysia and Hong Kong, by road and air. The region is catalog data, not a limit of the product: countries, places, border crossings, corridors, rates and each country's regulation catalog are all data, so a new country (the United States for a Hong Kong → New York move, say) is added by giving it a regulation catalog, its places and the corridors and rates that reach it, with no change to the flows. Only routes in the catalog (a corridor with its border crossings and rates) can be estimated or quoted; a customer may still name any city, and a route we don't run is shown as such, with the nearest route we run and a way to ask.

## Capabilities and Constraints

- **Codes.** Jobs use `CBRT-YYYY-NNN`, unique and never reused. Requests use `REQ-YYYY-NNNN` and quotations `Q-YYYY-NNNN`.
- **Request lifecycle.** SUBMITTED → UNDER_REVIEW → INFO_REQUIRED / REJECTED / QUOTED → CUSTOMER_ACCEPTED / EXPIRED → APPROVED.
  - The default lead time is 21 days for cross-border moves and 3 days domestic.
  - Quotation validity defaults to 7 days.
  - Price and horse list lock at APPROVED.
- **Customer estimate.** Before a quotation exists, the customer sees an instant estimate. It is always a range, never a single number, and is never stored or acceptable.
- **Permissions.** Only the Logistics Manager approves or rejects requests. Only the Transport Specialist approves or rejects documents; customers upload or replace.
- **Invoicing (in scope since 2 Oct 2026).** Two generated invoices per job, never typed: a deposit invoice when the customer accepts the quotation, and a final invoice after handover that settles the accepted quotation against what actually happened (actual quantities on estimated lines, the late-arrival credit, minus the deposit). Staff record payments received by bank transfer or card; an issued invoice is never edited, only voided and replaced or corrected with a credit note.
- **Out of scope.** Online payment collection (no payment gateway), a tax engine, dunning and accounting export.
- **UI language.** English only.
- **Undecided.** Notifications beyond in-app and email; incident handling (Flow 5) and handover (Flow 6) detail.

## Brand Commitments

- **Name.** The working product name is **EquiFreight**, from the team's Figma Make draft, used on the formal system name *Cross-Border Racehorse Transport System (CBRTS)*. It has not been confirmed as final.
- **Voice.** Plain, specific and operational. Errors name the rule, the value found and the fix, for example "The earliest departure is 17 Oct 2026". Status is always stated in words, never by colour alone.

## Evidence on Hand

- `docs/requirement.txt`: the course requirement (translated into English), covering actors, responsibilities and flows.
- `docs/CBRTS-core-flows.docx` and `docs/diagrams/`: the detailed spec for Flows 1 and 2, the quotation builder, business rules and user stories.
- `docs/CBRTS-quotation-builder-section.docx`: the standalone quotation section.
- `docs/database/database-design.md`: the database design, derived from the Figma design.
- The Figma design file https://www.figma.com/design/FDnnrfMqRcLa2LFYvHCBWv (desktop scope) and its generator in `docs/figma-plugin/`.
- The original Figma Make draft: https://www.figma.com/make/cCg6p3UOq2HH1XobptP5Pt

**Absences.** There are no real customers, testimonials, partner logos, press or operating statistics. The figures on the design's home page are placeholders ("4,200+ horses moved", "99.2% on-time", and the like), as are the horse, staff and club names in the demo data. None of them may be presented as real. The price ranges in the spec are sanity-check indications, not a price list.

## Product Principles

1. **The customer always knows the next step.** Every customer-facing state shows what happens next, who owns it, and what the customer owes and by when.
2. **Legality is enforced by the system.** Anything that makes a move illegal, such as expired paperwork or an incomplete dossier, is a hard block with the reason stated, not a warning to click past.
3. **Prices are explainable.** Every figure traces to a catalog line, a quantity and a basis. Estimates are ranges, and lines that may change on the final invoice are marked before acceptance.
4. **History is evidence.** Documents, quotations and catalogs are versioned; nothing is silently replaced.
5. **One accountable owner per step.** Each flow step has a named role, and the product makes hand-offs between roles explicit.
