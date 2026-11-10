# Incident compensation and insurance claims (Flow 5)

Status: built (V42). Two small additions to an incident, kept to the minimum for the demo: the logistics manager can compensate the customer when closing an incident, and can record an insurance claim on it. The rules follow `docs/incidents-design.md` (closing, US-F5-05) and the final invoice in `docs/handover-design.md` (US-F6-03). Each rule is open to change.

## Compensating the customer (US-F5-07)

- **Who and when:** a logistics manager, as part of closing the incident ("Close the incident"). Compensation is decided once, at closing, and can't be changed afterwards. The coordinator can't grant it. It is refused once the job has a final invoice (draft or issued) that isn't void: settle it with the club by hand.
- **What it holds:** an amount in the job's quotation currency (more than 0, at most the quotation total) and a reason the customer reads (required, up to 300 characters: "Two days' delay after the breakdown on QL22"). Both are optional as a pair: no amount means no compensation.
- **Where it goes:** the final invoice gets a `COMPENSATION_CREDIT` line per compensated incident, as a deduction, after the late-arrival credit and before the deposit deduction. The line shows the reason. It works like the late-arrival credit: a credit on what the customer owes, never a payout.
- **The final invoice waits:** a job with an incident that is still open or decided isn't listed under "Ready for the final invoice", so every compensation is known before the invoice is prepared. This is the same rule that already holds the job's closing.
- **Cost absorbed and compensation are separate:** the decision still says who pays the option's extra cost (US-F5-03). Compensation is what EquiFreight gives back on top of that.
- **Who is told:** the job's club gets `INCIDENT_UPDATE` with the reason and the amount ("We will credit USD 250.00 on your final invoice: …"). The audit row (`RESOLVE_INCIDENT`) records the amount and the reason.
- **Revenue report:** compensation counts as a credit, like the late-arrival credit (`docs/reports-design.md`).

## Recording an insurance claim (US-F5-08)

- **Only with EquiFreight's insurance:** the claim panel shows only on an incident whose job's request chose `EQUIFREIGHT` insurance. With `OWN_POLICY` the panel says "The customer claims on their own policy" and takes nothing.
- **Who:** a logistics manager, from the incident page. A claim can be filed while the incident is open, decided or resolved, because a claim usually outlives the incident. One claim per incident.
- **What it holds:**
  - when filing: the insurer (free text, up to 120 characters: "PVI Insurance"), the insurer's claim reference (up to 60), the amount claimed (more than 0) and an optional note.
  - when settling: the outcome, `SETTLED` with the amount paid (more than 0, at most the amount claimed) or `DECLINED` with a reason.
- **States:** `FILED`, then `SETTLED` or `DECLINED`. A settled or declined claim is final.
- **The money stays outside the system:** the insurer pays the owner directly. The claim is a record of what was claimed and paid, not a payment or an invoice line. It doesn't hold the final invoice or the job's closing.
- **Who is told:** the job's club gets `INCIDENT_UPDATE` when the claim is filed ("We have filed a claim with PVI Insurance, reference …") and again when it is settled or declined. Each step is audited (`FILE_INSURANCE_CLAIM`, `SETTLE_INSURANCE_CLAIM`).

## Database (next migration)

- Migration `V42__incident_compensation_and_claims.sql`.
- `incidents`: `compensation_amount numeric(14,2) null`, `compensation_reason varchar(300) null`, with a check that both are set or both are null and the amount is more than 0.
- `insurance_claims` (extends the usual `BaseEntity` columns): `incident_id` unique, `insurer`, `reference`, `claimed_amount`, `note`, `status` (`InsuranceClaimStatus`: `FILED`, `SETTLED`, `DECLINED`), `settled_amount`, `decline_reason`, `filed_by`, `filed_at`, `closed_by`, `closed_at`. Checks: a settled claim has `settled_amount` no higher than `claimed_amount`, and a declined one has `decline_reason`.
- Enums: `ALTER TYPE InvoiceLineKind ADD VALUE 'COMPENSATION_CREDIT'`, plus the new `InsuranceClaimStatus` type.

## API

- `POST /api/v1/staff/incidents/{id}/resolution`: the request takes an optional `compensation { amount, reason }`.
- `POST /api/v1/staff/incidents/{id}/insurance-claim`: file. `POST /api/v1/staff/incidents/{id}/insurance-claim/outcome`: settle or decline. Both are for `LOGISTICS_MANAGER` only.
- `IncidentResponse` and `JobIncidentResponse` carry the compensation and the claim.
- `GET /api/v1/customer/requests/{id}/insurance-claims`: the claims on the club's request, for the customer.

## Screens

- **Close the incident:** a "Compensate the customer" switch that reveals the amount and the reason.
- **Incident page:** an "Insurance claim" panel under the decision. Without a claim it offers "File a claim" (a modal); once filed it shows the claim with its status chip (Filed, Settled, Declined), and Settled / Declined buttons open the outcome modal. With the customer's own policy it says so and takes nothing.
- **Final invoice** (staff and customer): the compensation line, tagged Credit, with its reason.
- **The customer's request page** (both the submitted view and tracking, where `/tracking?job=…` notifications land): an "Insurance claims" panel listing each claim on the request's jobs with the incident, insurer, reference, amount claimed and what came of it (`GET /api/v1/customer/requests/{id}/insurance-claims`, the club's own requests only). The staff note and who filed it stay with staff. Hidden when there is no claim.

## Not in this version

- Compensation after the final invoice is issued (credit notes), refunds of payments already received, and paying compensation out in cash.
- Claims on the customer's own policy, more than one claim per incident, attaching the insurer's documents, and updating a claim after it is settled or declined.
- The Figma frames: the frames for the closing form, the incident page and the invoice are updated when this is built.
