# Brief: document review (Flow 2, staff)

Source: shape item 4 of 12. Spec: `docs/CBRTS-core-flows.docx` Flow 2 main flow step 206 ("verifies each accepted document against the destination-country rules and either approves it or rejects it with a reason"), US-F2-04, and §3.4 (only GREEN + approved counts toward the gate).

## 1. Job and audience
**Lan, transport specialist**, in the staff workspace. Every file that passes the automatic check lands with her. The machine has already checked the dates against the travel plan; her job is what the machine can't see: that the paper says what the customer typed, that it is the right horse, and that it is signed. Mode: Operate. Dozens of documents a week, each decision must be defensible to a border vet later.

## 2. Outcome and proof
- One of two decisions per version: **Approve** (the item counts toward the clearance gate) or **Reject with a reason** (the item returns to REQUIRED, the version is kept, the customer sees the reason verbatim).
- Lan can see, side by side, the file and what the customer entered, and ticks what she verified. Approving is only possible once every check is ticked; rejecting needs a reason.
- The effect on the gate is stated before she decides ("Approving clears 15 of 23").

## 3. Selected direction
The established world: staff shell as Lan, the job header of CBRT-2026-041, one gold action, status as a tone plus a word, deadlines stated twice, the seven-stage vocabulary. The page mirrors the customer's document page (item 3): same rule sentence, same versions list, so both sides read one record.

**Staff · Document review** (Nightfall · EIA (Coggins) test v2), Lan on Fri 2 Oct 2026, 10:40:
- **Header:** back link "Clearance checklist"; title "Nightfall · EIA (Coggins) test"; meta `CBRT-2026-041` and "REQ-2026-0162 · Saigon Turf Club · departs 18 Oct 2026"; chips "Documents · 4 of 7" and Info "In review"; review due stated twice: "Due in 1 business day / 5 Oct".
- **Left, the file:** a drawn certificate on a paper surface: NAVETCO Laboratory header and accreditation number, "Equine Infectious Anaemia · AGID (Coggins) test", horse Nightfall, mare, Thoroughbred, microchip 250 259 600 223 311, owner Saigon Turf Club, sampled 01/10/2026, tested 02/10/2026, result NEGATIVE, veterinarian's signature and stamp. A thin toolbar above: file name, "Page 1 of 1", "Open original".
- **Right (about 400 wide):**
  - **Automatic check:** Ok "Passes": "Sampled 1 Oct, 17 days before departure; the limit is 60 (Cambodia catalog v7)."
  - **Your checks** (checkbox list, all ticked here): sample date on the paper matches the entered 1 Oct; laboratory is on Cambodia's approved list; result is negative; microchip matches Nightfall's passport (…223 311); signed and stamped by the veterinarian.
  - **Decision:** gold "Approve" (full width). Effect line: "Clears Nightfall's EIA test: 15 of 23 cleared. The gate still waits for 8." Ghost "Reject with a reason".
  - **Versions:** v2 (this one) In review; refused attempt 27 Sep; v1 Replaced.
- **History** below: uploaded 10:12, automatic check passed, assigned to Lan.

**Staff · Document review · Reject** (Silver Bell · Proof of ownership), Lan on Thu 24 Sep 2026, 15:58:
- Header as above for Silver Bell; review due "Due today / 24 Sep".
- **Left, the file:** a drawn bill of sale: seller Hoàng Gia Stud, Đà Lạt; buyer Saigon Turf Club; horse Silver Bell, mare, Lipizzan, microchip; price line; two signature boxes, the seller's empty. The empty box carries a bad-tone outline and a small label "Not signed" (a review mark, not a customer-facing annotation).
- **Right:**
  - **Automatic check:** Ok "Present": "Proof of ownership has a presence-only rule, so the system can't check a signature."
  - **Your checks:** horse and microchip match ✓; buyer is Saigon Turf Club ✓; signed by both parties ✗ (unticked, bad tone "Seller's signature is missing").
  - **Decision, reject composer open:** reason field filled: "The bill of sale is not signed by the seller (bottom left, page 1). Upload a copy signed by both Hoàng Gia Stud and Saigon Turf Club." Helper: "Required. Saigon Turf Club sees it exactly as written; the item returns to Required and this version is kept." New version due, stated twice: "Due tomorrow / 25 Sep" (the checklist deadline). Gold "Reject and notify customer". "Approve" is disabled with the reason "1 check isn't ticked".
  - **Versions:** v1 (this one).
- This produces exactly what the customer already sees on "Tracking · Documents needed" ("Rejected 24 Sep by Lan: the bill of sale is unsigned", due 25 Sep).

## 4. Scope and boundaries
- **Two new frames** at the end of the staff row, drawn as Lan in the job shell (Clearance tab active in the breadcrumb).
- **Anti-goals:** no OCR or automatic reading of the paper (the certificate is a picture Lan reads); no annotation or markup tools; no authority submission (item 5); no bulk approve.

## 5. States and data ranges
- Checks: 3–5 per document type; each ticked, unticked, or failing with a word.
- Decision: Approve (enabled only when all checks are ticked) or Reject (reason required, 1–3 sentences).
- Versions: 1–3 plus refused attempts.

## 6. Interaction and layout
- 1440 staff shell. The file takes the flexible left column; the decision column is fixed at about 400, so the paper and the checks read side by side.
- Only one decision composer open at a time; opening Reject turns the gold onto "Reject and notify customer".

## 7. Constraints and open decisions
**Invented demo data:**
- Nightfall's microchip 250 259 600 223 311 and Silver Bell's 203 098 100 554 120;
- the NAVETCO accreditation number and certificate number;
- the seller, Hoàng Gia Stud, Đà Lạt;
- review due 5 Oct (1 business day after a Friday upload).

## 8. As built
- Frames: Staff · Document review (76:4941) and Staff · Document review · Reject (76:5202), at the end of the staff row.
- The paper is a Light-mode frame inside the dark shell, so it reads as a scanned document in both themes.
- The sidebar shows Lan's role nav (Operations, Catalogs) with Jobs active.
