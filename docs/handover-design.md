# Handover and trip acceptance (Flow 6)

Status: in progress. Built: recording the handover at the destination (US-F6-01, #66) the customer's answer (US-F6-02, #67), and the deposit and final invoices with payments (US-F6-03, #68). PRODUCT.md lists Flow 6's detail as undecided; the rules below are what the tickets asked for, built the smallest way that fits the schema in `docs/database/database-design.md` (Domain I, handovers) and the Handover pages in `DESIGN.md`. Each is open to change. A drawn signature and PDF downloads are left for later: the receiver confirms by name and a tick on the tablet.

## Recording the handover (US-F6-01)

- **Who:** the escort on the cab, or the coordinator from the office trip page, once the job's horses are delivered (the job's part is `DELIVERED`, stage `HANDOVER`). It is recorded once.
- **What it holds:** one `HANDED_OVER` trip record carrying:
  - each horse's condition on arrival (`condition_logs`: Sound, Watch or Concern, an optional note and up to eight photos), for every horse of the job delivered on that trip and only those (not one moved on or left in care);
  - what was handed over (the record's text: passports, head collars, feed);
  - the receiver's name, and their confirmation on the tablet that they received the horses in the condition recorded. Both are required.
- **The handover row** (`handovers`) points at that record (`handover_record_id`) and keeps the time (`handed_over_at`), the receiver (`receiving_name`) and the confirmation (`receiver_confirmed`). The customer's answer is due 2 days later (`confirm_due_at`).
- **Append-only:** the record, its conditions and photos are append-only already (`trip_records`, `condition_logs`, `condition_log_files`). On the handover row, the trigger `handovers_handover_fixed` refuses any change to the time, the record, the receiver or the confirmation once handed over, and `handovers_handed_over_check` requires all of them together. After the handover the cab takes notes only.
- **Screens:** the cab and the office trip page show "Hand over {job}" in place of the checkpoint form's old Handed over choice: a row per horse (condition, note, photos), what was handed over, received by, the time, the receiver's confirmation, and one gold action naming the time it records. Every view of the trip, the customer's included, then shows the Handover panel: who received the horses and when, what was handed over, and each horse's condition with its photos, quoted from the one stored record. The customer sees their own horses only.

## The customer's answer (US-F6-02)

- **Who and when:** the job's club, on tracking, once the horses are handed over and until it answers. It answers once.
- **Accept:** the handover is `CONFIRMED_SOUND`, with who accepted it and when (`confirmed_by`, `confirmed_at`). The manager who approved the job and its coordinator hear it (`HANDOVER_ACCEPTED`).
- **Raise a discrepancy:** with a description (required, up to 1000 characters, kept as written in `handovers.discrepancy`). The handover is `PROBLEM_REPORTED`, and an incident of kind `CUSTOMER_REPORT` opens on the job (`handovers.discrepancy_incident`): the logistics manager who owns the job's incidents and the coordinator are alerted at once (`INCIDENT_RAISED`), and it is weighed, decided and closed like any other incident (Flow 5).
- **No answer:** the handover is due 2 days after it was recorded (`confirm_due_at`). The default is said up front, on the customer's owed item: "If you don't reply by …, the handover is taken as accepted." Every hour `HandoverConfirmationJob` takes the overdue ones as accepted (`accepted_by_default`, audited as the System), except while an incident on the job is still open or decided: then it waits until that is resolved.
- **The record says it:** the Handover panel shows the answer in words ("Accepted 21 Oct, 09:12 by Saigon Turf Club", "Taken as accepted …", or "Problem reported …" quoting the customer), with an Accepted or Problem reported chip.
- **Rules in the database:** an answer needs its time, and a discrepancy its description (`handovers_outcome_check`).

## Invoices and payments (US-F6-03)

Two invoices per job, generated, never typed (database-design.md, section 13A). Both are due 7 days after they are issued, carry no tax (`tax_pct` 0) and are coded `INV-YYYY-NNNN`. An issued invoice is never edited; voiding, replacing and credit notes are not built yet.

- **The deposit invoice** is issued as the customer accepts the quotation (`CustomerQuotationService.accept`): one `DEPOSIT` line, the quotation's `deposit_pct` of its total. It has no job yet (the job is created at approval). The club is told (`INVOICE_ISSUED`).
- **The final invoice** is the logistics manager's, once the handover is settled: accepted, taken as accepted, or a discrepancy whose incident is resolved. The Invoices page lists those jobs under "Ready for the final invoice"; preparing one makes a draft holding, in order:
  - every line of the accepted quotation as quoted (`QUOTED`);
  - each estimated line priced per unit (not overridden) at its actual quantity once the manager sets it (`ACTUALISED`), with the reason, which is required when the quantity differs and which the customer reads;
  - the quotation's total rows (the volume break as a deduction, then arrival window, fuel, insurance, contingency, service fee) as quoted, or worked out again in the quotation's fixed order on the actual amounts (`QuotationPricing.totalsWith`, on the quotation's pinned catalog), marked actual when they moved;
  - each cost approved on an incident that the customer pays (`job_charges`, an `ADJUSTMENT` line, US-F5-03);
  - the late-arrival credit (`LATE_PENALTY_CREDIT`), with a window: the minutes the horses were delivered after it closed, less the minutes an incident stopped the clock; the quotation's % per started hour (10% until the rate is confirmed), capped (30%), of the quotation total. `handovers.late_minutes` and `penalty_amount` keep it;
  - the deposit invoice's total, deducted (`DEPOSIT_DEDUCTION`).
  Issuing it makes it due in 7 days and tells the club; a final invoice the deposit already covers is issued as paid.
- **Payments** are recorded by hand on the invoice page (amount, prefilled with what is owed; bank transfer or card; the bank reference; the day received): never more than is owed, never dated ahead, never edited. The invoice becomes part paid or paid in the same transaction, and the club is told (`PAYMENT_RECORDED`). Refunds are not built.
- **Screens:** the logistics manager's Invoices (sidebar): the ready jobs, then the list with To be paid, Overdue, Paid and All tabs, soonest due first; the invoice page with its lines (each tagged As quoted or Actual, an actual line raised with its reason and the quoted figure beside it), the gold "Issue the invoice" on a draft, Record a payment and the payments. The customer finds a move's invoices on its request page and opens each under it (`/requests/{id}/invoices/{invoiceId}`): the one owed item ("Pay INV-…", by when), the lines, how to pay (bank transfer with the invoice code as the reference; the bank details are a placeholder) and the payments. No PDF yet.

## Closing the job (US-F6-04)

- **Who and when:** a logistics manager, from the job's Trip tab ("Close the job"), once the horses are delivered, the handover is recorded, and no incident on the job is open or decided. Until then the panel says what holds it, in words ("the handover isn't recorded", "an incident is still open: Customer report"). The final invoice and its payment don't hold the closing.
- **What it records:** the stage becomes `CLOSED` with when and by whom (`transport_jobs.closed_at`, `closed_by`), and whether the horses arrived on time (`on_time`, `late_minutes`). With an arrival window, late is the minutes delivered after it closed, less the minutes an incident stopped the clock (the same count as the late-arrival credit, `LateArrival`). Without a window, the planned arrival on the confirmed route, plus 30 minutes' tolerance, stands in for its close (the same rule as the on-time rate, US-R-03). The database requires all three on a closed job (`transport_jobs_closed_check`). The closing is audited (`CLOSE_JOB`), and a closed job takes no more trip records.
- **The boards:** a closed job leaves every active view of Jobs and is listed under its own Closed tab. Its page shows "Closed" with On time or how late, and against what.
