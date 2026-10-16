# Brief: authorities tab (Flow 2, staff)

Source: shape item 5 of 12. Spec: `docs/CBRTS-core-flows.docx` Flow 2 main flow (compile the dossier per authority, record submission and reference, record the outcome, book and record quarantine), B3/B4, BR-F2-03 and BR-F2-06, US-F2-05, US-F2-06, US-F2-07.

## 1. Job and audience
**Lan, transport specialist**, on job CBRT-2026-041's Authorities tab. She files a dossier with each authority on the route, records the reference and the expected response, chases late ones, and records quarantine. The work happens outside the system (portals, phone, paper); the tab is where it becomes a record anyone can read. Mode: Operate. **Yến, logistics manager**, is the reader when something is late: she decides whether the departure holds.

## 2. Outcome and proof
- Every authority on the route has one dossier card with a state in words, what it contains, its reference, and its expected response stated twice.
- A dossier can only be submitted once its own documents are cleared; the card says what it is waiting for otherwise.
- A response past its expected date is highlighted, Yến is alerted, and the card states what it puts at risk (the last day that keeps the departure).
- Quarantine is recorded against the destination minimum; a shorter period is refused.

## 3. Selected direction
The established world: the job shell (header, clearance gate, tabs with the tab's owner), Lan's role nav, one gold action, tone plus word, deadlines stated twice, the seven-stage vocabulary. Dossier cards follow the Owed item logic turned to staff: what it is, who holds it, when it's due.

**Clearance · Authorities** (CBRT-2026-041, Lan, Sat 26 Sep 2026, 11:20; matches every other 26 Sep frame):
- **Job header** with the Authorities tab active; gate Locked with the existing 26 Sep body.
- **Summary strip:** "3 dossiers · 1 with an authority · 1 ready to file · 1 waiting on documents · quarantine booked".
- **Dossier cards**, one per authority:
  1. **Cambodia GDAHP · import permit.** Info "With the authority". Filed 15 Sep, ref `KH-IP-2026-3381`. Expected "In 15 days / 11 Oct" (the date GDAHP quoted at filing). Contents: the import application and 4 passports.
  2. **Mộc Bài border customs (VN) · export and entry declaration.** Ok "Ready to file". **Inline recording form open:** authority (prefilled), submitted on 26 Sep 2026, reference `HQ-MB-2026-18842`, expected response "3 business days · 30 Sep" prefilled from the catalog and editable, documents included (customs value declaration v1, 4 equine passports), all ticked. Gold "Record submission"; Ghost "Cancel". The card then becomes "With the authority".
  3. **Vietnam Dept. of Animal Health · export health certificates (×4).** Neutral "Not ready". Waiting on: 4 customer items (named, with their due dates) and the start of quarantine on 10 Oct. Planned filing 8 Oct, certificates expected 8–14 Oct.
- **Pre-export quarantine** section: facility "Củ Chi pre-export quarantine station", booked 10–17 Oct (7 days), Cambodia's minimum 7 days: Ok "Meets the minimum". Inspection results: "Recorded on 17 Oct by the station vet" (upcoming). A helper line states the rule: "A period shorter than 7 days can't be saved."
- **History** below.

**Clearance · Authorities · Overdue** (same tab, Mon 12 Oct 2026, 09:30):
- **Gate body** updated for 12 Oct: "3 things must clear first: the Cambodia import permit (overdue), 4 export health certificates (with DAH, expected 14 Oct) and quarantine (ends 17 Oct)."
- **GDAHP card, first and highlighted in the bad tone:** Bad "Overdue by 1 day / was due 11 Oct". Callout inside: "Clearance is planned for 14 Oct. If the permit isn't back by 16 Oct, the 18 Oct departure can't hold." A follow-up log: "12 Oct 09:10 · Lan phoned GDAHP Phnom Penh: in final signature, promised for 13 Oct." A line: "Yến, logistics manager, alerted 12 Oct 00:05 (response overdue)." Gold "Log a follow-up"; Secondary "Record the decision".
- **DAH card:** Info "With the authority", filed 9 Oct, ref `DAH-XK-2026-0917`, expected "In 2 days / 14 Oct".
- **Customs card:** Ok "Approved" 30 Sep, ref `HQ-MB-2026-18842`, with its clearance number.
- **Quarantine:** Info "In progress · day 3 of 7", 10–17 Oct.

## 4. Scope and boundaries
- **Two new frames** in the Operations row, inserted right after "Clearance · Checklist" (the job tabs stay together); later frames shift right.
- The Jobs list and the other job tabs are unchanged.
- **Anti-goals:** no integration with authority portals; no document upload by staff; no rescheduling UI (that is Yến's decision, reached from the alert); the ADDITIONAL_INFO_REQUIRED and BLOCKED states are named in the card vocabulary but not drawn.

## 5. States and data ranges
- Dossier states in words: Not ready, Ready to file, With the authority, Overdue, More information asked, Approved, Refused.
- 2–5 authorities per job; 0–5 follow-ups per dossier.
- Quarantine: booked, in progress (day n of m), done with results.

## 6. Interaction and layout
- 1440 staff shell. Dossier cards full width of the content, stacked in the order that needs Lan first (overdue, ready to file, with the authority, not ready, approved).
- Only one inline form open at a time; the expected response date recalculates from the submission date and the catalog SLA.

## 7. Constraints and open decisions
**Invented demo data:**
- the customs authority and its reference `HQ-MB-2026-18842`, 3 business-day SLA;
- GDAHP's quoted response date of 11 Oct (a Sunday, so the breach shows on Monday 12 Oct);
- the DAH filing on 9 Oct with ref `DAH-XK-2026-0917`;
- the quarantine facility (Củ Chi) and Cambodia's 7-day minimum;
- the follow-up call and the 16 Oct last-safe date.

## 8. As built
- Frames: Clearance · Authorities (78:5172) and Clearance · Authorities · Overdue (78:5484), right after Clearance · Checklist in the Operations row.
- The 12 Oct frame's stage chip reads Clearance · 5 of 7: by then every customer document is cleared and the dossiers are with the authorities.
- `jobScreen` now takes `{ today, gate, stage }` so later job-tab frames can show other dates.
