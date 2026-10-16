# Brief: first run (a new customer)

Source: shape item 12 of 12. Spec: Flow 1 preconditions (a registered, active account) and step 68 (the horse list: name, passport number, age, sex, height and weight, foal at foot, temperament, special needs). Built without a confirmation round at the user's request; decisions below are mine, for review.

## 1. Job and audience
**Đà Lạt Highland Stables** (invented), a new customer who has just signed in for the first time. Nothing exists yet: no horses, no requests. They need to know the order of things (horses first, then a request), what to have to hand, and to finish the first horse without guessing what each field is for.

## 2. Outcome and proof
- The empty My requests page is a first-run page, not a blank table: three steps in order, what to have ready, and one gold action ("Add your first horse").
- The add-horse form says why each group of fields is asked and what it feeds (stall plan, quotation, border checks). Passport-backed fields are marked as checked later against the passport.

## 3. Selected direction
Owner portal world; header shows the new customer's name; one gold action per view; the Option card and Input components.

**First run · My requests** (Sun 27 Sep 2026):
- Page head "My requests" with "0 requests · Đà Lạt Highland Stables".
- **Welcome panel:** "Start with your horses" and three numbered steps: 1 Add your horses (name, microchip, size, temperament; about 3 minutes each) · 2 Request transport (instant estimate, a range) · 3 We review it within 1 business day and send an itemised quotation. Gold "Add your first horse"; Secondary "See how a request works" (Home's stages).
- **Have these ready:** each horse's passport (microchip number and date of birth), height and weight, a declared value for insurance, and any handling needs.
- The empty table appears as its column header with "Your requests appear here".

**First run · Add a horse** (the same day):
- Page head "Add a horse" with "1 of 1 · you can add more after saving".
- **Identity** (checked against the passport later): name, microchip (15 digits; helper "From the passport. We check it at the border."), sex (select), breed, date of birth, coat.
- **Size and weight:** height (hh), weight (kg); size class worked out and shown: "Size M · 32 in, from 16.0 hh", helper "Decides the stall width and the air position."
- **Temperament and needs:** option cards (Calm · Nervous · Aggressive), ticks for climate-controlled stall, box stall only, mare with foal at foot; handling notes.
- **Declared value** with "Used for insurance if you insure through us (1.5%)."
- **Right column:** "Why we ask" in three short blocks, and "Passport and documents come later: we ask for them per trip, checked against your travel dates."
- Footer: Cancel · gold "Save horse".

## 4. Scope and boundaries
- Two new frames at the end of the owner row (after "Request · 4 Review"). No sign-up or sign-in screens (account creation is outside the design), no tour overlay, no staff first-run.

## 7. Invented demo data
The customer name; the horse being added (Langbiang Star, a gelding, 16.0 hh, 505 kg, calm); "about 3 minutes each".

## 8. As built
- Frames: First run · My requests (98:6387) and First run · Add a horse (98:6612), at the end of the owner row after Request · 4 Review.
- The header account chip shows the new customer (Đà Lạt Highland Stables, DH).
- Built without a confirmation round, as the user asked; review with the rest.
