# Brief: document upload and versions (Flow 2, customer)

Source: shape item 3 of 12. Spec: `docs/CBRTS-core-flows.docx` Flow 2 part 1 (steps 203–205), the automatic validity check (§3.4), and rules BR-F2.

## 1. Job and audience
**Saigon Turf Club** (customer), working through the documents owed on job CBRT-2026-041. Mode: Operate. Customers are the priority audience. The anxious moment is uploading and not knowing whether it will pass; the product's promise is that they find out immediately, before any human looks at it.

## 2. Outcome and proof
- The customer uploads a file with its issue date, expiry (when printed) and issuing body.
- The system answers at once, against the travel dates:
  - **GREEN:** accepted, and goes to Lan for review.
  - **AMBER:** accepted, but it won't clear. The screen shows the date a replacement is needed by.
  - **RED:** refused on the spot, with the value found, the limit, and the earliest value that passes. Nothing is saved.
- Every version stays visible, and so does every refused attempt.

## 3. Selected direction
The established world: the tracking page model, one gold action at most, status as a tone plus a word, deadlines stated twice, and the seven-stage vocabulary.

**Tracking · Document upload** (Nightfall · EIA (Coggins) test), Fri 2 Oct 2026, 10:15, just after a passing upload:
- **Header:**
  - A "Your documents" back link.
  - Title "Nightfall · EIA (Coggins) test" (Fraunces).
  - Meta: `REQ-2026-0162` and "job CBRT-2026-041 · Ho Chi Minh City → Phnom Penh · departs 18 Oct 2026".
  - Chip: "Documents · 4 of 7".
- **The rule, in words:** "Sampled within 60 days of departure. For your departure on 18 Oct, the test must be sampled on 19 Aug or later." Source: the regulation catalog VN → KH v7, pinned to this job.
- **Upload:**
  - The file: `EIA_Nightfall_2026-10-01.pdf · 412 KB` with a Replace link.
  - Fields: sample (issue) date 1 Oct 2026; issuing body "NAVETCO Laboratory, Ho Chi Minh City"; result Negative; expiry "not printed on this document".
- **Instant result (OK):** "Passes: sampled 1 Oct, 17 days before departure; the limit is 60." Then: "Sent to Lan, transport specialist, for review. You'll see her decision here." No gold action, because nothing more is owed on this document.
- **Versions** (right):
  - v2, 2 Oct: In review (Info).
  - A refused attempt, 27 Sep: "sampled 20 Jul, 90 days old at departure", not saved.
  - v1, 4 Aug: Expires in transit (Warn), kept.
- **Who checks it:** Lan, transport specialist.

**Tracking · Document upload · Refused**, the same page on Sun 27 Sep 2026, 16:40:
- The file `EIA_Nightfall_2026-07-20.pdf`, sample date 20 Jul 2026.
- **Instant result (Bad):** "Refused: sampled 20 Jul, which is 90 days before your 18 Oct departure and already 69 days old today; the limit is 60 days. A test sampled on 19 Aug or later passes. Nothing was saved."
- **Why 20 Jul, not 10 Aug:** per spec §3.4.1 a test that is valid today but ages out before departure is AMBER (kept, won't clear), not RED. Only a test already past 60 days today is refused at upload.
- **Gold "Choose another file".** The deadline is stated twice: "Due in 7 days / 4 Oct".
- **Versions:** v1 only, plus "this attempt was not saved".

**Tracking · All documents** (the customer's full list), Sat 26 Sep 2026, 11:20:
- **Header:** the job's route title, with the summary "23 documents · 14 cleared · 4 with you · 5 with the authorities".
- **Filter tabs:** All · 23, With you · 4, With the authorities · 5, Cleared · 14.
- **Rows** are grouped by Shadowfax, Nightfall, Copper King, Silver Bell and Shipment. Each row has:
  - the document and its rule;
  - the status as a word chip;
  - who holds it (You / Lan, transport specialist / Vet authority / Cambodia's GDAHP);
  - a two-line due or done date;
  - an open arrow.
- The Documents needed page's dead "Show 14 cleared documents" link becomes "See all 23 documents" and points here.

## 4. Scope and boundaries
- **Three new customer frames** in the tracking row, inserted after "Tracking · Documents needed". The frames after them shift right.
- **Anti-goals:**
  - no reading dates out of the file (OCR);
  - no staff approval UI (item 4);
  - no drag-and-drop animation spec;
  - AMBER is described in the rule text but not drawn as its own frame.

## 5. States and data ranges
- Upload results: GREEN (drawn), RED (drawn), AMBER (in copy).
- Versions: 1–3 per document, plus refused attempts.
- The list: 23 items in 5 groups.

## 6. Interaction and layout
- Tracking layout, 1200 content width. The document page puts the rule and the upload on the left and versions and the checker on the right (about 400 wide).
- The instant result sits directly under the upload fields, so cause and effect read together.

## 7. Constraints and open decisions
**Invented demo data:**
- the refused attempt on 27 Sep;
- NAVETCO as the lab;
- the passing sample date of 1 Oct and its upload on 2 Oct;
- the file names and sizes.

## 8. As built
- Frame order is by date: All documents (26 Sep), Document upload · Refused (27 Sep), Document upload (2 Oct).
- v1 shows as "Replaced" on 2 Oct (superseded by v2), and as "Expires in transit" on 27 Sep.
- The rule panel lists all three outcomes with that day's date ranges, so AMBER is visible without its own frame.
