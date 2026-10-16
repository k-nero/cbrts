# Brief: request review (Flow 1, feasibility)

Source: shape item 1 of 12. Spec: `docs/CBRTS-core-flows.docx` Flow 1 part 1, rules BR-F1-01 and BR-F1-04. Context: staff workspace split, and the critique's double-booking finding.

## 1. Job and audience
- **Yến, logistics manager.** Works in the staff workspace. She opens a request from the Overview review queue and decides whether EquiFreight can take the job, before any price exists. Mode: Operate. A few requests a day; each decision needs to be quick and must be defensible later.
- **The customer (Saigon Turf Club)** is on the receiving end when a request comes back with a question. Mode: Operate. This is the priority audience.

## 2. Outcome and proof
Yến reaches exactly one of four outcomes:
- start the quotation (goes to the builder, item 2);
- ask for information (INFO_REQUIRED; a note is required);
- reject (REJECTED; a reason is required; the customer may copy the request into a new draft);
- grant or refuse a lead-time express override (recorded on the request).

Each check is stated with its evidence, so the decision explains itself. The customer sees the note as one owed item with a date derived from the lead-time rule. Once they resubmit, both versions stay visible to both sides.

## 3. Selected direction
The established EquiFreight world is unchanged: staff shell, tracking page model, one gold action, status given as a tone plus a word, deadlines stated twice, and the seven-stage vocabulary.

**Staff · Request review** (REQ-2026-0193), drawn as Yến on Mon 28 Sep 2026, 09:40:
- **Header:**
  - "Review queue" back link.
  - Route title "Ho Chi Minh City → Bangkok".
  - Meta: `REQ-2026-0193` and "Saigon Turf Club · 2 horses · road, shared load · departs 30 Oct 2026 ±3 d".
  - Stage chip "Request · 1 of 7".
  - The review deadline, stated twice: "Due today / 28 Sep".
- **Feasibility checks** (left column): one row per check, each with its evidence:
  - Route served: OK. VN → KH → TH via Mộc Bài – Bavet and Poipet – Aranyaprathet; catalogs pinned.
  - Lead time: OK. 34 days, 21 required.
  - Blackout: OK. None between 27 Oct and 2 Nov.
  - Capacity: Info, pending.
    - What the system knows: 2 shared-load trailers with a climate stall on HCMC → BKK in the window.
    - The hand-off: "Asked Khôi to confirm, 09:32 · waiting".
  - Horses: Bad, conflict. Shadowfax and Nightfall are on CBRT-2026-041, arriving in Phnom Penh on 18 Oct. Nightfall and Shadowfax are also on quotation Q-2026-0188, with pre-export isolation in Phnom Penh from 6 Nov.
- **What the customer sent** (below the checks): horses, service, route, dates with flexibility, instructions, and the estimate range they saw ($11,300 – $16,100), at version v1.
- **Decision** (right column). The one gold action follows from the checks. Here it is "Send to customer" in an "Ask for information" composer, with a note drafted from the failed check (editable, required): "Shadowfax and Nightfall will be in Phnom Penh from 18 Oct (job CBRT-2026-041). Should we collect them in Phnom Penh, move the date, or choose other horses?" The other two outcomes stay available but not gold:
  - "Start quotation": Secondary, carrying a warning line that 1 check is failing.
  - "Reject": Ghost, which opens a reason field.
- **History:** submitted 26 Sep 09:14; lead time checked automatically; Khôi asked 28 Sep 09:32.

**Staff · Request review · Override** (REQ-2026-0190), the same layout in a different state:
- Hanoi Riding Club, Hanoi → Vientiane, 1 horse, departs 20 Oct.
- The lead-time check fails: 24 days, 30 required for VN → LA. The system blocked submission unless an express override is granted.
- The decision panel leads with "Grant express override". The reason is required and is recorded on the request, and the button stays inactive until a reason is entered. "Refuse override" (which rejects with that reason) sits beside it.
- A second note: the rate catalog has 2 missing rates on HAN → VTE, so quoting will need Lan. This is shown as a fact with an owner, not as a blocker to the review.

**Tracking · Info required** (customer, REQ-2026-0193, Mon 28 Sep 2026, 10:05), on the tracking page model:
- **Owed item:** "Answer Yến's question".
  - The reason is her note, verbatim.
  - Deadline, stated twice: "Reply by 9 Oct / to keep 30 Oct" (the last day that still meets the 21-day lead time).
  - Gold "Edit and resubmit".
  - Secondary "Withdraw request". Cancellation is allowed before approval, which also closes the critique's "can't withdraw" gap.
- **Where it stands:** Request is current ("Returned to you 28 Sep with a question"), then the rest collapses into "+6".
- **Versions:** v1 submitted 26 Sep, returned 28 Sep with a note. "Your changes become v2; you and Yến both keep v1."
- **History.**

## 4. Scope and boundaries
- **Three new frames:**
  - "Staff · Request review" and "Staff · Request review · Override", at the end of the staff row;
  - "Tracking · Info required", in the tracking row after "In review".
- **Overview:** the review queue's REQ-0193 and REQ-0190 rows get "Open" affordances pointing at these frames. No other change.
- **Anti-goals:**
  - no live fleet tracking, and no invented messaging beyond the note-with-request the spec defines;
  - no price on the review page except the customer's estimate range;
  - no new components unless a check row can't be built from existing parts.

## 5. States and data ranges
- **Checks:** 5 rows. Each is OK, Info (pending), Warn or Bad, with a word and an evidence line.
- **The note:** 1–3 sentences.
- **Versions:** 1–3.
- **Queue context:** 4 requests awaiting review (matches the Overview).

## 6. Interaction and layout
- Staff frames: 1440 staff shell. Checks and the request on the left; the decision panel on the right (about 380 wide) with the composer inline, not in a modal.
- Only one outcome's composer is open at a time.
- "Start quotation" is always reachable, but a failing check is named beside it.
- Customer frame: the tracking layout at 1200 content.

## 7. Constraints and open decisions
- The desktop-only scope holds.
- Everything is built through the plugin source (a new file or `05-admin.js` / `06-tracking.js`), mock-tested, and added to Figma.
- **Invented data I'll use unless you correct it:**
  - a 30-day minimum lead time for VN → LA;
  - the two-trailer availability figure;
  - Yến's review timestamps.
