# Brief: owner portal vs staff workspace

Source: critique 2026-09-26 (P1 "one product, three shells, no role boundary"), plus folded-in P1 data alignment and the P2 Clearance approve fix.

## 1. Job and audience
- **Customers** (club and owner staff) use the owner portal. They must never see staff tools or approve their own documents. Mode: Operate (Home stays Persuade).
- **Staff** (Logistics Manager, Transport Specialist, Fleet & Route Coordinator) use one workspace and work job by job. Mode: Operate.
- The Driver/Escort is out of scope; that role is phone-first and gets its own brief later.

## 2. Outcome and proof
- **Customer:** the header shows only what the customer owns.
- **Staff:** a staff member opens a job and finds everything they own for it in one place, with the owner of each tab named.
- **Proof:** no owner screen links to Clearance, Load plan or Route. Every staff screen names the signed-in person and role. The same job shows the same facts in the owner and staff views.

## 3. Selected direction
The existing EquiFreight world (DESIGN.md) is unchanged: tokens, type, components, one gold action per view.

- **Owner header** (App header / Desktop component):
  - Nav: Home · My horses · My requests.
  - "Request transport" becomes a Secondary SM button with a plus icon on the header's right, before the account chip.
  - The Ops divider, Load plan and Clearance are removed.
  - Wizard and quotation pages highlight "My requests"; "Quotes" is gone.
- **Staff shell:** the admin sidebar shell, renamed "Staff".
  - The brand row shows a STAFF tag. The signed-in name and role sit in the sidebar footer. "Back to operations" is removed.
  - Nav sections by role:

    | Role | Sections |
    |---|---|
    | Logistics Manager (Yến) | Overview (with the review queue), Jobs, People |
    | Transport Specialist (Lan) | Jobs, Catalogs (Regulations, Rates) |
    | Fleet & Route Coordinator | Jobs |

  - Each frame is drawn as the role that owns it.
- **Jobs list (new):** every CBRT job, one row each. Columns:
  - code;
  - route (Fraunces place names);
  - horses;
  - stage chip;
  - departure, as a two-line deadline;
  - blocking reason in words ("Departure locked · 8 documents outstanding");
  - owner of the next step.

  Sorted by departure, blocked jobs first. Filter chips: All · Needs me · Blocked · In transit.
- **Job page (restructured from the existing screens):**
  - One job header: route title, code, horses, departure, stage chip and the clearance gate.
  - Tabs: Clearance · Authorities · Load plan · Route. Each tab names its owner: Lan for the first two, the coordinator for the last two.
  - The current "Clearance · Checklist", "Load plan" and "Clearance · Route plan" frames become the Clearance, Load plan and Route tabs of CBRT-2026-041, rebuilt inside the staff shell.

## 4. Scope and boundaries
**Replaced in place** (same frame names and positions; the user approved replacement):
- Load plan
- Clearance · Checklist, and its Light copy
- Clearance · Route plan
- Admin · Regulation catalog
- Admin · Rate catalog
- Admin · Overview
- Admin · Users and roles

**New:** "Staff · Jobs", in the staff row.

**Owner screens:** they only receive the new header, through the component. Their content does not change.

**Untouched:** the customer tracking screens (except the header), Home content, the design system tokens, the mobile frames, and the Cover and Foundations pages (except text that references the old nav).

**Anti-goals:**
- No second visual language for staff.
- No role switcher widget; the role comes from the signed-in person.
- No invented features: no messaging, notifications UI or fleet management.

## 5. States and data (one canonical fixture, fixes the P1 contradictions)
**CBRT-2026-041** (as of 26 Sep 11:20):
- 21 checklist items: 13 cleared, 4 owed by the customer, 4 export health certificates due from the vet authority 8–14 Oct.
- Silver Bell's proof of ownership was rejected on 24 Sep and is awaiting re-upload. It is not "in review".
- Shadowfax's EIA was approved on 21 Sep.
- Clearance is expected 14 Oct; departure 18 Oct 06:00.

**Review queue:** remove the duplicate REQ-2026-0185. REQ-2026-0193 is the customer's request in review, due Mon 28 Sep.

**Clearance per-row approve:** Secondary buttons, plus at most one gold "Approve N in review" batch action. Where nothing is in review, there is no gold button.

**Jobs list fixture:** 5–7 jobs covering Documents (blocked), Clearance, Ready to depart, In transit, Delivered awaiting handover and Closed. Each job uses route pairs from the demo region.

## 6. Interaction and layout
- The sidebar is fixed at 248 px. Its content column follows the existing admin grid.
- The job header stays the same across tabs; the tab row sits under it with an owner label per tab.
- The Jobs list row is the tap target for its job.
- Blocked jobs show the reason in words, with the red tone as the second signal.

## 7. Constraints and open decisions
- Desktop 1440 only. Built through the plugin source (`03-pages.js`, `05-admin.js`), mock-tested, and replaced in Figma the same way as the tracking rebuild. The Light copy of Clearance is regenerated.
- **Coordinator name:** no name exists yet for the Fleet & Route Coordinator. I'll use a placeholder first name in the same demo style and flag it.
- **Out of this brief (later steps):** the quotation rebuild, the warn colour moving to orange, and the unified seven-stage vocabulary.
