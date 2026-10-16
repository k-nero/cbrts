# Brief: request wizard, step 2 Service (Flow 1, customer)

Source: shape item 9 of 12. Spec: `docs/CBRTS-core-flows.docx` Flow 1 step 68 (special requirements: climate-controlled stall, veterinary escort, insurance level), the instant estimate (a range, never a price, minimum band width), the groom step function (⌈horses ÷ 3⌉) and the flight-vet rule (from 8 horses or a high declared value). Existing wizard frames: "Request · 1 Horses", "Request · 3 Route & dates (error)", "Request · 4 Review".

## 1. Job and audience
**Saigon Turf Club**, drafting REQ-2026-0193 (Shadowfax and Nightfall, Ho Chi Minh City → Bangkok). They choose how the horses travel and what extras they want, and see what each choice does to the estimate before choosing. Mode: Operate, with Persuade's clarity about cost: the risk is reading the estimate as a promise.

## 2. Outcome and proof
- The step ends with: a mode (road), a load (shared), the stalls each horse needs (Nightfall's climate stall is required by her profile), optional extras, and who insures the horses.
- Every option states its effect on the estimate as a range delta, or "Included", or why it isn't available.
- The estimate card on the right is the same component as steps 1, 3 and 4, and stays a range.

## 3. Selected direction
The established wizard: page head "Request transport", the four-step stepper (Horses done, **Service current**), option cards, the sticky Estimate card, Back and a gold Continue.

**Request · 2 Service** (Sat 26 Sep 2026, draft):
- **How they travel** (option cards, one chosen):
  - **Road** (selected): "Door to door by trailer · ~960 km · 2 border crossings." Meta "In the estimate".
  - **Air** (disabled): "Unavailable on this route: there is no equine air service Ho Chi Minh City → Bangkok. The nearest is via Hong Kong, 3 days longer."
- **Trailer** (option cards):
  - **Shared load** (selected): "Shares a trailer with other consignments on set departures." Meta "In the estimate".
  - **Private trailer**: "Your own trailer and departure time." Meta "+ $2,400 – $3,300".
- **Stalls, per horse** (rows, not choices):
  - Shadowfax · standard stall · "Included".
  - Nightfall · **climate-controlled stall** · "Required by her profile: heat-sensitive" · "+ $600 – $850, in the estimate". A lock icon, no toggle.
- **Extras** (checkboxes with effect):
  - Grooms: "1 groom (1 per 3 horses)", fixed, "Included".
  - Veterinary escort (unticked): "+ $1,800 – $2,400. We add one automatically from 8 horses or a declared value over $500,000."
- **Transit insurance** (option cards):
  - **Through EquiFreight**: "1.5% of the declared value ($325,000)". Meta "+ $4,875".
  - **Your own policy** (selected): "You upload it with your documents; it must cover the journey plus 2 days." Meta "In the estimate · no charge".
- **Footer:** Back; "Road · shared load · 1 climate stall · your own insurance"; gold "Continue".
- **Estimate card** (right): $11,300 – $16,100, horses 2, grooms 1 per 3 → 1, crossings 2, ~960 km (the same values steps 1, 3 and 4 show).

**Request · 4 Review** (existing, small edit): the summary gains an "Insurance" row, "Your own policy · upload it with your documents once the job is approved", so step 2's choice is visible at review.

## 4. Scope and boundaries
- **One new frame**, inserted after "Request · 1 Horses" in the owner row (later frames shift right).
- **One edit** to "Request · 4 Review" (source and Figma).
- **Anti-goals:** no price on this step (ranges only); no payment; no per-leg configuration; no stall map (that is the staff Load plan).

## 5. States and data ranges
- Option states: default, selected, disabled with a reason.
- Deltas: ranges for service choices; exact for percentage insurance, labelled as a percentage of the declared value.

## 6. Interaction and layout
- Same wizard layout as steps 1, 3, 4: form left, Estimate card right.
- Choosing an option updates the estimate card; the option's delta line is what moves into it.

## 7. Constraints and open decisions
**Invented demo data:**
- the private-trailer, climate-stall and vet-escort deltas;
- the $500,000 high-value threshold for a vet escort;
- the "no equine air service HCMC → Bangkok" reason.

## 8. As built
- Frame: Request · 2 Service (86:6086), after Request · 1 Horses in the owner row.
- Request · 4 Review gained an Insurance row (Figma and source).
