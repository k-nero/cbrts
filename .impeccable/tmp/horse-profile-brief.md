# Brief: horse profile (customer)

Source: shape item 10 of 12. Spec: `docs/CBRTS-core-flows.docx` Flow 1 step 68 (horse list: name, passport number, age, sex, height and weight, foal at foot, temperament, special needs), BR-F2 (documents per horse per trip; passports valid-until), and the existing "My horses" grid, whose cards open this page.

## 1. Job and audience
**Saigon Turf Club** looking at one horse, Nightfall. The profile is the source every other screen reads (stall plans, quotations, document checks), so the page shows what it feeds and what changing it would touch. Mode: Operate (keep the profile right) and Read (where is she, what does she owe).

## 2. Outcome and proof
- One page answers: what Nightfall needs to travel, what she owes now, which documents stay with her between trips, and which trips she is on.
- Fields fixed by her passport are locked and say so.
- An edit states its effect on open trips before it is saved, and names who is told.

## 3. Selected direction
The owner portal world (header with My horses active, the page header pattern, tone plus word, deadlines stated twice, one gold action). The Horse card's coat band and nameplate carry over as the page's identity strip so the card and the page read as one object.

**My horses · Nightfall** (Sat 26 Sep 2026, 11:20):
- **Header:** back "My horses"; a black coat band with the brass nameplate "Nightfall"; meta: microchip `250 259 600 223 311` and "Thoroughbred · mare · 4 y · black"; chips Warn "Nervous" and Info "Climate stall"; Secondary "Edit profile".
- **She owes** (the owed item from the tracking model, one row): "Upload a new EIA (Coggins) test" for job CBRT-2026-041, "Due in 8 days / 4 Oct 2026", gold "Upload test result".
- **What she needs to travel:** stall "Climate-controlled (heat-sensitive)"; loading "Slow and gentle, away from ramp noise"; size class M · 32 in; 478 kg; 16.0 hh; handling notes. Footnote: "Read by the load plan and by every quotation."
- **Documents that stay with her:** passport (valid until 14 Mar 2029; cleared; used on CBRT-2026-041 and REQ-2026-0179), influenza vaccination (given 2 Jul 2026; cleared), proof of ownership (on file). **Trip documents** (link out): EIA test on CBRT-2026-041 "Expires in transit · due 4 Oct"; export health certificate "Issued 8–14 Oct by the vet authority".
- **Right column, trips:** CBRT-2026-041 (Ho Chi Minh City → Phnom Penh, departs 18 Oct, "Documents · 4 of 7"); REQ-2026-0179 (Phnom Penh → Hong Kong, 20 Nov, "Quotation · 2 of 7"); REQ-2026-0193 (Ho Chi Minh City → Bangkok, 30 Oct, "Request · 1 of 7") with a Warn line: "Overlaps: she's in Phnom Penh from 18 Oct." **Declared value** $240,000 with "Used for insurance on quotations."

**My horses · Nightfall · Edit** (26 Sep, 11:40), the same page in edit mode:
- **Editable:** temperament tags (Nervous, plus a new "Kicks in the trailer"), handling notes (updated), weight, height, declared value.
- **Locked, with the reason:** name, microchip, sex, breed, date of birth: "From her passport. Ask Lan, transport specialist, to correct it."
- **Before you save** (the effect panel):
  - CBRT-2026-041 · load plan: "Needs a padded partition in stall 4. Khôi, fleet & route coordinator, re-checks the load plan." (Warn)
  - REQ-2026-0179 · quotation Q-2026-0188 v2: "Yến checks whether the air stall still fits. If the price changes you get v3; v2 stays valid until 30 Sep."
  - REQ-2026-0193: "No change; still in review."
- Gold "Save and tell Khôi and Yến"; Ghost "Cancel".

**Consistency fix** found while shaping: the document-review frames (item 4) used invented microchips for Nightfall and Silver Bell; they change to the My horses values (…223 311 and …554 120) in Figma and source.

## 4. Scope and boundaries
- **Two new frames** in the owner row, inserted after "My horses".
- **Anti-goals:** no medical record or vet history; no photo gallery; no ownership transfer; no staff view of the profile.

## 5. States and data ranges
- Trips per horse: 0–5 active plus past. Tags: 0–4. Carry-over documents: 3; trip documents per trip: 2–3.

## 6. Interaction and layout
- 1200 content: left column (needs, owed item, documents), right column 400 (trips, declared value).
- Edit mode keeps the layout; locked fields show a lock and their reason; the effect panel sits above the save action.

## 7. Constraints and open decisions
**Invented demo data:**
- the influenza date (2 Jul 2026, matching "108 days before departure");
- the new "Kicks in the trailer" tag and the padded partition;
- "no past trips" (Nightfall's first move with EquiFreight).

## 8. As built
- Frames: My horses · Nightfall (89:6202) and My horses · Nightfall · Edit (89:6413), after My horses.
- The EIA owed item uses the Upcoming urgency (8 days out), so its action is Secondary: the page has no gold until something is due soon.
- Document review frames now use the My horses microchips (4 text fixes in Figma, and source).
- Date of birth 14 Apr 2022 is invented.
