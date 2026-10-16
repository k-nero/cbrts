# Brief: quotation builder (Flow 1, EPIC-F1B)

Source: shape item 2 of 12. Spec: `docs/CBRTS-quotation-builder-section.docx`, sections 4.3–4.6: the cost model, the calculation order, and rules BR-Q-01 to BR-Q-09.

## 1. Job and audience
**Yến, logistics manager**, in the staff workspace. After a request passes review, she builds the itemised quotation from the pinned rate catalog, overrides what the catalog can't know (always with a reason), and issues it. Mode: Operate. This task was error-prone in a spreadsheet; the screen exists so that the arithmetic is never hers to get wrong.

## 2. Outcome and proof
- A version is issued, and it is itemised, totalled by the system, in one currency and with a validity date. Issuing moves the request to Quotation (stage 2 of 7).
- Every quantity shows where it came from. Every percentage shows its base. Overrides show the catalog value and the reason. The total is never typed.
- If a rate is missing, issuing is refused, the gaps are listed, and they are reported to the catalog owner (BR-Q-08).

## 3. Selected direction
Unchanged: the EquiFreight world, the staff shell, the seven-stage vocabulary, and one gold action per screen. The ledger rows are the same Quote line component the customer sees, so both sides read one document.

**Staff · Quotation builder** (Q-2026-0188 v2, a draft), shown as Yến on Wed 23 Sep 2026, before issue:
- **Header:**
  - A back link to "REQ-2026-0179".
  - The route title "Phnom Penh → Hong Kong (Sha Tin)".
  - Meta: `Q-2026-0188` and "v2 draft · Saigon Turf Club · 2 horses · air, business class · departs 20 Nov 2026".
  - Chips: "Quotation · 2 of 7" and "Rates v12 pinned".
- **Lines** (left): groups A–H, the same lines as the customer quotation. Basis text shows each derivation ("2 × 48 in = 96 in = 1 position", "2 ÷ 3, rounded up = 1", "per day · 14 days").
  - **Line G, inline override, open.** The catalog value $300.00 is struck through. The new amount is $180.00. The required reason reads "Shares the truck with a second consignment on the same flight". The actions are Secondary "Save override" and Ghost "Remove override". The strip carries the focus or selection accent only.
  - **Line H** is marked Estimated, with its reason.
- **Totals** (below the lines): the same computed order as the customer page. Subtotal, then the volume break on air and ground lines, fuel on the discounted air lines, insurance on declared value, contingency, and the service fee. Each row names its base. No typed total.
- **Issue panel** (right, about 380 wide):
  - The total, and the deposit at 30%.
  - Validity: 7 days, shown as "Valid until 30 Sep 2026" twice (time left and date).
  - Currency: USD, with FX pinned at issue.
  - A readiness line: "All 13 lines priced · 1 override · 1 estimated".
  - Gold "Issue quotation v2".
  - Secondary "Preview as the customer sees it".
- **Changed since v1:**
  - Departure moved 12 Nov → 20 Nov.
  - The rate catalog moved v11 → v12, re-pinned on re-issue.
  - The air stall line moved from its v11 rate to $16,800.
  - The total moved v1 → v2, computed.
  - The other lines are unchanged.
- **Versions:** v1 issued and then superseded (departure moved); v2 draft.

**Staff · Quotation builder · Blocked** (REQ-2026-0190, v1 draft), on Tue 29 Sep, after Yến granted the express override on 28 Sep:
- Hanoi → Vientiane, 1 horse, road with a private trailer.
- Two lines show "No rate" instead of an amount:
  - road transfer, about 700 km, rate missing;
  - border documentation at Cầu Treo – Nam Phao, rate missing.
- **Missing-rates panel:** lists both entries against rate catalog v12, corridor HAN → VTE, and says "Reported to Lan, transport specialist, 29 Sep 09:05 · waiting".
- **Totals:** no total. It reads "Can't be totalled until every line has a rate".
- **Issue panel:** gold "Issue quotation" disabled, with the reason "2 lines have no rate". A note that the override is on the request (granted 28 Sep, with its reason).

## 4. Scope and boundaries
- **Two new frames** at the end of the staff row, drawn in the staff shell as Yến.
- **Anti-goals:**
  - no carrier negotiation, live capacity, invoicing or FX hedging (all out of scope in the spec);
  - no typed total anywhere;
  - no new visual language;
  - no dialog for the override.

## 5. States and data ranges
- About 13 lines across 8 groups, 0–2 overrides, 1 estimated line, and 0–2 missing rates.
- **Validity:** 7 days by default. It's a setting (BR-Q-09), shown but not edited here.
- **Change summary:** 2–5 changed items.

## 6. Interaction and layout
- Lines sit on the left and fill the width. The right column is fixed at about 380.
- Only one line's override editor is open at a time. The total and readiness line change live.
- The preview opens the customer quotation page as it will look once issued.

## 7. Constraints and open decisions
**Figures I'll compute or assume:**
- The v1 air stall rate (catalog v11). I'll pick $17,400, so the change summary has a real delta, and compute the v1 total from it.
- For REQ-0190, the road distance (about 700 km) and the non-missing lines at catalog-style rates.
