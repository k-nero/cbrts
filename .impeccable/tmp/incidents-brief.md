# Brief: incidents (Flow 5, optional)

Source: shape item 8 of 12. Spec: `docs/CBRTS-core-flows.docx` names Flow 5 (incidents, re-routing) only by reference: a HELD crossing escalates to the Logistics Manager (step 214); an incident re-route changes the travel dates and re-evaluates every document (§3.4.3, US-F2-10); the Logistics Manager is the escalation point. Everything else here is design-level invention on top of those rules.

## 1. Job and audience
- **Yến, logistics manager**, is the one owner of every incident. She needs the facts in one place, the options with their cost, and a decision that is recorded and told to the people affected. Mode: Operate, under pressure (a horse on a trailer, a clock running).
- **A customer** reporting a problem after delivery. Mode: Operate, possibly upset; the form must be quick and must say what happens next.

## 2. Outcome and proof
- A held crossing ends with one recorded decision (wait, re-route, return), its consequences stated before it is made (time, documents, the horse's time on the trailer), and a message to the customer.
- A customer report pauses the handover default, lands with Yến beside the escort's arrival record, and gets a reply with a next step and a date.
- Every incident appears in the job history, and the customer's page says it in plain words.

## 3. Selected direction
The established world: staff shell, tone plus word, deadlines stated twice, one gold action, option cards for choices (as on the Trip tab). An incident page is a job-level page with a Bad "Held" or "Open" chip and a running clock.

**Staff · Incident · Held** (Yến, Tue 29 Sep 2026, 09:10), job **CBRT-2026-040**, Phnom Penh → Ho Chi Minh City, 1 horse (Mekong Star, gelding), shared load, departed 05:30:
- **Header:** back "Jobs"; title "Held at Bavet – Mộc Bài"; meta `CBRT-2026-040` and "Phnom Penh → Ho Chi Minh City · Mekong Star · shared load"; chips "Trip · 6 of 7" and Bad "Held"; "Held for 58 min / since 08:12".
- **What the escort recorded** (Tùng, driver, 08:12): "Mộc Bài closed to vehicles over 10 t until 16:00 for a bridge inspection. Horse settled, watered 08:40." Horse's time on the trailer: "3 h 40 min · unload by 11:30" (the 6-hour limit), stated twice and in the warn tone.
- **Options**, three option cards, each with time, documents and welfare:
  1. **Wait for Mộc Bài** to reopen at 16:00: arrives about 19:30; the horse must be unloaded at the Bavet holding yard at 11:30 (fee applies); documents unchanged.
  2. **Re-route via Xa Mát – Trapeang Phlong** (selected): +95 km, +2 h 10 min, arrives about 15:40; the horse rests unloaded at the Xa Mát border yard at 11:10, inside the 6 hours; **documents re-checked for the new crossing:** 1 new item, a customs value declaration for Xa Mát (one per crossing), which Lan can file electronically in about 1 h.
  3. **Return to Phnom Penh:** back by 11:00; a new departure date is needed, and every document is re-checked against it.
- **Decision composer** for the selected option: what happens (Lan files the Xa Mát declaration; the escort gets the new route; the customer is told), the message to the customer (editable, required), gold "Re-route via Xa Mát".
- **Right column:** the clock (on trailer, unload-by), the people (Tùng, driver; Lan; the customer contact), and the incident timeline.

**Tracking · Report a problem** (customer of **CBRT-2026-036**, Bangkok → Ho Chi Minh City, 3 horses, delivered Thu 24 Sep 16:05; shown on Thu 24 Sep 2026, 17:40):
- Reached from the Delivered page's "Report a problem" (Secondary on the owed item).
- **Header:** the request's route title, its REQ reference, chips "Handover · 7 of 7" and Warn "Handover not confirmed".
- **The form:** which horse (3 option cards, one selected: Golden Lotus); what's wrong (select: Injury); where and what ("A cut about 6 cm on the left hind cannon, still bleeding a little when she came off the trailer."); photos (2 thumbnails attached); gold "Send to Yến".
- **What happens next:** "Yến, logistics manager, replies within 2 hours. Your handover isn't confirmed while this is open: the 26 Sep default is paused." The escort's arrival record for the horse is shown beside it, so the customer sees what was logged.

**Staff · Incident · Customer report** (Yến, Thu 24 Sep 2026, 18:05), the same case on her side:
- **Header:** "Golden Lotus · cut on arrival"; `CBRT-2026-036`; chips "Handover · 7 of 7" and Bad "Open"; reply due "In 1 h 35 min / by 19:40" (the 2-hour promise).
- **Side by side:** the customer's report with the two photos, and the escort's arrival record for Golden Lotus ("Sound" at 16:10 by Hạnh, groom; loading and trip log with a welfare stop at Siem Reap). The mismatch is named: "Logged sound at 16:10; reported cut at 17:32."
- **Reply and next step:** vet visit booked for 25 Sep 09:00 (the club's vet, cost pending the investigation); the insurer (PVI) notified under the transit policy; the escort asked for a statement by 25 Sep 12:00. Reply to the customer (editable, required). Gold "Send reply".
- **Right column:** the handover default paused, the people, the timeline.

## 4. Scope and boundaries
- **Three new frames:** "Staff · Incident · Held" and "Staff · Incident · Customer report" at the end of the staff row; "Tracking · Report a problem" after "Tracking · Closed".
- The report frame uses its own customer name in the header (not Saigon Turf Club).
- **Anti-goals:** no insurance claim workflow; no chat; no map; no vet's report form; no fault or liability judgement on screen; no "Concern at a welfare stop" frame.

## 5. States and data ranges
- Incident kinds: border held, horse concern en route, customer report. States in words: Open, Held, Decided, Resolved.
- Options per held crossing: 2–3. Photos per report: 0–6.

## 6. Interaction and layout
- Staff frames: 1440 shell, facts and options left, clock and people right (400).
- Customer frame: tracking layout at 1200; form left, "what happens next" and the escort's record right.

## 7. Constraints and open decisions
**Invented demo data** (the spec leaves Flow 5 open):
- CBRT-2026-040's horse (Mekong Star), driver (Tùng), the Mộc Bài closure and the Xa Mát – Trapeang Phlong alternative (+95 km, +2 h 10 min);
- a 6-hour limit on time in the trailer without unloading;
- CBRT-2026-036's customer (Chao Phraya Racing Stables), horses (Golden Lotus and two others), groom (Hạnh) and the Siem Reap welfare stop;
- the 2-hour reply promise, the vet visit and the PVI notification.

## 8. As built
- Frames: Staff · Incident · Held (84:5800) and Staff · Incident · Customer report (84:6059) at the end of the staff row; Tracking · Report a problem (84:6288) after Tracking · Closed.
- CBRT-2026-040's owner is Sokha Stables (invented); the report frame's header shows Chao Phraya Racing Stables.
- Record panels stack the heading above its chip so long headings never collide.
