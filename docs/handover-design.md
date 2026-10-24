# Handover and trip acceptance (Flow 6)

Status: in progress. Built: recording the handover at the destination (US-F6-01, #66). PRODUCT.md lists Flow 6's detail as undecided; the rules below are what the tickets asked for, built the smallest way that fits the schema in `docs/database/database-design.md` (Domain I, handovers) and the Handover pages in `DESIGN.md`. Each is open to change. A drawn signature and PDF downloads are left for later: the receiver confirms by name and a tick on the tablet.

## Recording the handover (US-F6-01)

- **Who:** the escort on the cab, or the coordinator from the office trip page, once the job's horses are delivered (the job's part is `DELIVERED`, stage `HANDOVER`). It is recorded once.
- **What it holds:** one `HANDED_OVER` trip record carrying:
  - each horse's condition on arrival (`condition_logs`: Sound, Watch or Concern, an optional note and up to eight photos), for every horse of the job delivered on that trip and only those (not one moved on or left in care);
  - what was handed over (the record's text: passports, head collars, feed);
  - the receiver's name, and their confirmation on the tablet that they received the horses in the condition recorded. Both are required.
- **The handover row** (`handovers`) points at that record (`handover_record_id`) and keeps the time (`handed_over_at`), the receiver (`receiving_name`) and the confirmation (`receiver_confirmed`). The customer's answer is due 2 days later (`confirm_due_at`).
- **Append-only:** the record, its conditions and photos are append-only already (`trip_records`, `condition_logs`, `condition_log_files`). On the handover row, the trigger `handovers_handover_fixed` refuses any change to the time, the record, the receiver or the confirmation once handed over, and `handovers_handed_over_check` requires all of them together. After the handover the cab takes notes only.
- **Screens:** the cab and the office trip page show "Hand over {job}" in place of the checkpoint form's old Handed over choice: a row per horse (condition, note, photos), what was handed over, received by, the time, the receiver's confirmation, and one gold action naming the time it records. Every view of the trip, the customer's included, then shows the Handover panel: who received the horses and when, what was handed over, and each horse's condition with its photos, quoted from the one stored record. The customer sees their own horses only.
