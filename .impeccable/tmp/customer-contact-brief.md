# Brief: customer contact (notes on a request)

Source: shape item 11 of 12. Spec: Flow 1 and 2 name the note-with-request (INFO_REQUIRED, rejection reasons) and the notification centre; the critique ruled out chat. Built without a confirmation round at the user's request; decisions below are mine, for review.

## 1. Job and audience
- **Saigon Turf Club** has a question that doesn't fit a fixed step ("the insurer issues the extension a day late; is that a problem?"). They need to know who will answer and by when.
- **Lan, transport specialist**, answers the notes routed to her across jobs, and can act on the answer (move a deadline, with a reason) from the same place.

## 2. Outcome and proof
- A note is attached to a request, not a free chat: the customer picks what it's about, the page names who answers (Documents → Lan; dates, price or changes → Yến; the trip → Khôi before departure, the escort during it) and the reply time (1 business day), stated twice.
- Every note and reply stays on the request's history for both sides.
- A reply can carry an action (moving a customer deadline, with the reason shown to the customer).

## 3. Selected direction
The tracking page model on the customer side; the staff shell with a list-and-detail page on Lan's side. One gold action per view.

**Tracking · Ask a question** (Saigon Turf Club, REQ-2026-0162, Sat 26 Sep 2026, 11:30), after "Tracking · All documents":
- Header as the request page, back "Back to the request".
- **Composer:** "What is it about?" as option cards (Documents · Dates, price or changes · The trip), Documents selected; "Which item" select: "Transit insurance · due 30 Sep"; the note ("PVI can only issue the extension to 20 Oct on 1 Oct, a day after it's due. Is that a problem?"); attach a file (the insurer's email). Routing line: "Goes to Lan, transport specialist · replies within 1 business day · by Mon 28 Sep". Gold "Send to Lan".
- **Right:** earlier notes on this request (one answered by Khôi about hay on board), and "Who answers what".

**Staff · Customer notes** (Lan, Mon 28 Sep 2026, 09:15), at the end of the staff row:
- Breadcrumb Staff / Jobs / Notes. **List** (left, 420): 4 open notes routed to Lan across jobs, each with customer, job, item, received, reply due stated twice; the Saigon Turf Club note selected; one due today in the warn tone.
- **Detail** (right): the note in full with its attachment; the item it's about (Transit insurance, Expires in transit, due 30 Sep); **reply composer** with the reply, a ticked action "Move the due date to 2 Oct" with its reason ("The insurer issues the extension on 1 Oct; filing is 14 Oct, so there is room"), and gold "Send reply". Helper: the customer sees the reply and the new date on the request page; Yến can read every note.

## 4. Scope and boundaries
- Two new frames. No chat, no read receipts, no attachments preview, no notification settings.

## 7. Invented demo data
PVI's 1 Oct issue date; the hay question answered by Khôi on 21 Sep; the other three notes in Lan's list.

## 8. As built
- Frames: Tracking · Ask a question (97:6311) after Tracking · All documents; Staff · Customer notes (97:6444) at the end of the staff row.
- Built without a confirmation round, as the user asked; review with the rest.
