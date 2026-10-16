# Brief: handover and closing (Flow 4 end, both sides)

Source: shape item 7 of 12. Spec: `docs/CBRTS-core-flows.docx` Flow 4 (journey to delivery; referenced from Flows 1–2), BR-F2-05 (no version is ever deleted: the full history is the legal evidence). Already drawn: "Tracking · Delivered" (18 Oct 12:50, owed item "Confirm handover and condition", due 20 Oct) and the Trip tab (item 6).

## 1. Job and audience
- **Hoa, groom**, at Phnom Penh Equestrian Centre on 18 Oct, handing the horses and their papers to **Sophea, receiving groom**, and recording their condition on arrival. Mode: Operate, quick, standing in a yard.
- **Saigon Turf Club** (customer, priority audience), confirming the handover and afterwards keeping the job as a closed record. Mode: Operate, then Read.

## 2. Outcome and proof
- Delivery is recorded once: arrival time, each horse's condition, what was handed over, and who received it (name and signature).
- The customer confirms or reports a problem within 2 days. If they don't reply by 20 Oct, the handover is taken as accepted on the escort's record; this is stated upfront on the owed item, and Yến is told.
- A closed job reads as a record, not a task: nothing owed, everything kept (condition, route as recorded, 23 documents with every version, the full history).

## 3. Selected direction
The established world: the Trip tab (touch-sized, route strip shared with the customer), the tracking page model, tone plus word, deadlines stated twice, the seven stages. Handover is stage 7.

**Trip · Delivery** (Hoa, Sun 18 Oct 2026, 12:48, Phnom Penh Equestrian Centre):
- Header as the Trip tab ("Trip · 6 of 7", gate Clear); strip with every stop done and Phnom Penh current, "arrived 12:41".
- **Hand over the horses** (the one task):
  - Condition on arrival, one row per horse (Sound / Watch / Concern, a note): all Sound; Nightfall "Slight sweat at unloading, settled within 10 min."
  - Handed over, ticked: 4 horses; 4 equine passports; the Cambodia import permit and 4 export health certificates; the trip log.
  - **Received by:** "Sophea, receiving groom · Phnom Penh Equestrian Centre", with a signature box signed on the tablet.
  - Gold "Record handover at 12:48" (full width, 56 high).
- **Right column:** this stop (arrived 12:41, planned 12:30, 11 min late); "What happens next": Saigon Turf Club is asked to confirm by 20 Oct, stated twice; if they don't, the handover is taken as accepted on this record.
- Trip log below.

**Tracking · Delivered** (existing, small edit): the owed item's reason gains the default: "…Confirm receipt, or report a problem. If you don't reply by 20 Oct, the handover is taken as accepted on Hoa's record."

**Tracking · Closed** (Saigon Turf Club, Mon 19 Oct 2026, 09:20):
- **Header:** "Ho Chi Minh City → Phnom Penh", `REQ-2026-0162` and "job CBRT-2026-041 · 4 horses · delivered 18 Oct 2026, 12:41"; chips "Handover · 7 of 7" and Ok "Closed".
- **Lead block** (no gold): "Closed. Nothing more is needed." "You confirmed the handover on 19 Oct at 09:14. This page stays as the record of the move." Secondary "Download the record (PDF)".
- **Summary facts:** delivered 12:41 (11 min after plan); 240 km; both border posts cleared without a hold; no incidents; 23 documents kept.
- **Arrival condition** (as on Delivered) with "Received by Sophea, 12:48 · confirmed by you, 19 Oct 09:14".
- **Route as recorded:** every checkpoint with its recorded time.
- **Documents:** "23 documents, every version kept" with "See all 23 documents" (the All documents page from item 3).
- **Stages:** all seven done, collapsed. **History:** "Show all 38 events".
- **My requests:** the request moves to the Past tab (named in the brief, not redrawn).

## 4. Scope and boundaries
- **Two new frames:** "Trip · Delivery" after "Trip · Welfare stop" (Operations row); "Tracking · Closed" after "Tracking · Delivered" (tracking row).
- **One edit** to the existing "Tracking · Delivered" owed-item reason (Figma and source).
- **Anti-goals:** no invoicing or balance payment (out of scope in the spec); no rating or review prompt; no "report a problem" frame (that is item 8, incidents); no staff close-out summary.

## 5. States and data ranges
- Handover: recorded / confirmed by the customer / accepted by default after 2 days / disputed (item 8).
- Condition words as on the Trip tab.

## 6. Interaction and layout
- Trip · Delivery: task left, context right (400), touch sizes.
- Tracking · Closed: tracking layout at 1200; the lead block is the "nothing owed" component, the rest reads top to bottom as a record.

## 7. Constraints and open decisions
**Invented demo data:**
- Sophea's workplace (Phnom Penh Equestrian Centre, already on Delivered) and her on-tablet signature;
- the confirmation time, 19 Oct 09:14;
- the 38-event history count;
- the PDF record download.

## 8. As built
- Frames: Trip · Delivery (82:5705) after Trip · Welfare stop; Tracking · Closed (82:5986) after Tracking · Delivered.
- Tracking · Delivered's owed item now states the 20 Oct default (Figma and source).
- The Trip tab's condition row is now one function (`conditionRow`) shared by the welfare stop and the delivery; delivery rows omit the drinking and eating ticks.
