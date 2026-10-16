# Brief: escort checkpoint log (Flow 4, on the road)

Source: shape item 6 of 12. Spec: `docs/CBRTS-core-flows.docx` Flow 2 step 214 (each border crossing recorded per leg as CLEARED or HELD; HELD escalates to the Logistics Manager, Flow 5), BR-F2-03 / US-F2-08 (departure only after CLEARANCE_READY). Customer side already drawn: "Tracking · In transit" (18 Oct 08:41) and "Tracking · Delivered".

## 1. Job and audience
**Minh, driver, and Hoa, groom**, the escort on trailer TX-447, using a tablet mounted in the cab on 18 Oct. They record what happened at each checkpoint and how each horse is, in a few taps, with gloves on and one eye on the road schedule. Mode: Operate, under time pressure and poor signal. Their records are the only source of the customer's route positions ("never a guess") and the arrival condition.

## 2. Outcome and proof
- Each checkpoint gets one record: arrived/departed time, and for a border CLEARED or HELD with what was shown.
- At a welfare stop, each horse gets a condition word (Sound / Watch / Concern), drinking and eating ticks and an optional note.
- The customer's In transit page updates from these records only; the screen says so.
- A HELD crossing or a Concern on any horse routes to the incident flow (item 8), named but not drawn.

## 3. Selected direction
The staff shell and job header, with a new **Trip** tab (owner "Minh, driver"), drawn desktop at 1440 per the desktop-only rule but with touch-sized controls: 56-high option cards and buttons, big type for times. The route runs across the top as the same Route stop strip the customer sees, so both sides read one route.

**Trip · Checkpoint** (Minh, Sun 18 Oct 2026, 08:34, at Mộc Bài – Bavet):
- **Job header:** stage "Trip · 6 of 7"; clearance gate **Clear** ("Departure unlocked 17 Oct 16:20 by Lan"); tabs Clearance, Authorities, Load plan, Route, **Trip** (active).
- **Route strip:** Ho Chi Minh City departed 06:05 (Done) → Mộc Bài – Bavet (Current) → Svay Rieng welfare stop exp. 09:30 → Phnom Penh exp. 12:30.
- **Record this checkpoint** (left, the one task):
  - Checkpoint "Mộc Bài – Bavet · border crossing", arrived 07:58 (recorded).
  - Outcome: two large option cards, **Cleared** (selected) and **Held** ("Escalates to Yến, logistics manager, at once").
  - Documents shown at the border, ticked: Cambodia import permit KH-IP-2026-3381, 4 export health certificates, customs clearance TK-2026-300915.
  - Time 08:34 (now, editable). Optional note.
  - Gold "Record: cleared at 08:34". Helper: "Saved on this tablet first and sent as soon as there is signal."
- **Right column:** "Next: Svay Rieng welfare stop, planned 09:30 (in 56 min)"; the load (4 horses and their stalls from the load plan); the crew (Minh, driver; Hoa and Tuấn, grooms); "What the customer sees": the last recorded checkpoint, never an estimate between checkpoints.
- **Trip log** below: 06:05 departed Phú Thọ; 06:02 loaded without incident (Minh); 07:58 arrived at the border.

**Trip · Welfare stop** (Hoa, groom, Sun 18 Oct 2026, 09:40, at Svay Rieng):
- Same header and strip, with Svay Rieng current ("arrived 09:36").
- **Condition of each horse** (the one task): four rows, Shadowfax, Nightfall, Copper King, Silver Bell, each with its stall, a three-way Sound / Watch / Concern control, Drinking and Eating ticks, and a note field.
  - Nightfall: **Watch**, "Light sweat on the neck again; drank about 8 L; settled within 10 minutes." The others: Sound.
  - Rule line: "Concern on any horse opens an incident report and alerts Yến."
- Gold "Save condition log". Beside it: "Planned stop 45 min · leave by 10:21", stated twice.
- **Right column:** the checkpoint record for this stop (arrived 09:36), next stop Phnom Penh exp. 12:30, and the previous log (08:40 at the border, Hoa).

## 4. Scope and boundaries
- **Two new frames** at the end of the Operations row, after "Clearance · Route plan".
- **Trip tab added** to the job tab list (source and the existing job-tab frames in Figma get the extra tab label; nothing else on them changes).
- **New shell users:** Minh, driver, and Hoa, groom, with Operations › Jobs only.
- **Anti-goals:** no live GPS or map; no HELD or incident frame (item 8); no chat; no offline-sync state frame (the helper line covers it); no phone frames.

## 5. States and data ranges
- Checkpoint kinds: pickup, border, welfare stop, delivery. Border outcome: Cleared / Held.
- Condition per horse: Sound / Watch / Concern; 1–8 horses.
- Times: recorded (mono), planned ("exp."), and time left, stated twice where they're deadlines.

## 6. Interaction and layout
- Left: the one task, full height; right: fixed about 400 for context.
- Controls at touch size; the gold action is the full width of the task card.

## 7. Constraints and open decisions
**Invented demo data:**
- arrival at the border 07:58;
- the second groom, Tuấn (the load needs 2 grooms for 4 horses);
- full names: Trần Văn Minh (driver), Lê Thị Hoa (groom);
- Nightfall's 09:36 note and the 8 L figure;
- the tablet's store-and-send behaviour.

## 8. As built
- Frames: Trip · Checkpoint (80:5401) and Trip · Welfare stop (80:5755), after Clearance · Route plan in the Operations row.
- A "Trip" tab label was added to the six existing job-tab frames (Checklist and its Light copy, both Authorities, Load plan, Route plan).
- Condition rows put the horse and the Sound / Watch / Concern control on one line, and the ticks with the note on the next, so everything fits the task column.
- Only a focused field takes the gold border, so filled notes use the neutral border.
