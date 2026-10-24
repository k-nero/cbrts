# Incidents (Flow 5)

Status: in progress. Built: reporting an emergency from the cab (US-F5-01, #60), recording the options (US-F5-02, #61) and the manager's decision (US-F5-03, #62). PRODUCT.md lists Flow 5's detail as undecided; the rules below are what the tickets asked for, built the smallest way that fits the schema in `docs/database/database-design.md` (Domain J) and the Incident page in `DESIGN.md`. Each is open to change.

## Reporting an emergency (US-F5-01)

- **Who:** the escort, from the cab, on a trip they crew that has been released to them (signed off, or already moving). Anyone else gets a 404, as for the trip itself.
- **Kinds:** vehicle breakdown (`VEHICLE`), prolonged traffic jam (`TRAFFIC`), horse medical incident (`WELFARE`) and other emergency (`OTHER`). `HELD` stays for a hold recorded in the trip log and `CUSTOMER_REPORT` for the customer's Report a problem; the cab can't open either.
- **What the report holds:** where (free text, up to 200 characters: "QL22 km 41, before Gò Dầu"), what happened (up to 500, kept as written in `incidents.summary`), up to eight photos, and the horse it concerns. A horse medical incident must name the horse.
- **Which job:** an incident belongs to one job (`incidents.job_id`). A report about a horse is raised on that horse's job, so on a shared trailer it lands on the right customer's job; any other report on the job the cab is open on.
- **Owner:** the logistics manager who approved the job; if that account is no longer active, the first active logistics manager.
- **Alerts:** at once, in the same transaction, an `INCIDENT_RAISED` notification (Bad tone) to the owner and the job's coordinator; a job without a coordinator alerts every coordinator. It opens the staff incident page. The customer isn't told by this: what they hear comes from the manager's decision.
- **Offline:** the tablet sends its own reference (`incidents.client_ref`, unique); resending it returns the incident already opened and alerts nobody again. The tablet's time is kept in the audit row (`RAISE_INCIDENT`, channel `CAB_TABLET`).
- **Screens:** the cab has a "Report an emergency" panel (four option cards, where, which horse, what happened, photos); after sending it says who was alerted and when. Staff have Incidents (Open, Decided, Resolved, All; newest first) and the incident page: the report quoted with its author and time, where, the horse, the photos, the job and trip, and the people. The logistics manager has Incidents in the sidebar; the coordinator reaches an incident from the alert.

## Recording the options (US-F5-02)

- **Who:** the coordinator, or the logistics manager; both reach the incident from its alert.
- **An option** has a title (up to 160 characters), an optional description, its estimated extra cost in the job's quotation currency (`incident_options.extra_cost`, never negative), the minutes it adds to the arrival (`delay_minutes`, up to a week) and whether it takes the horses another way (`changes_route`). Who recorded it and when are kept. The page shows the three costs side by side (Arrival, Extra cost, Route), warn-toned where the option costs something.
- **Proposing:** one option is proposed for approval, with an optional note saying why (`incidents.proposed_option_id`, `proposed_by`, `proposed_at`, `proposal_note`). The owner gets an `INCIDENT_PROPOSAL` notification ("Decision needed", Warn tone) with the option and its cost in one line.
- **While a proposal waits,** the options can't be added to or removed; they unlock when the manager sends the proposal back. A decided or resolved incident takes no more options. Options are removed only before anything is proposed, and each addition, removal and proposal is in the audit log.

## The manager's decision (US-F5-03)

- **Who:** a logistics manager; the coordinator sees the proposal waiting but can't decide. Only the proposed option can be approved, once. The manager can instead send the proposal back with a reason; whoever proposed it hears why (`INCIDENT_RETURNED`), and the options unlock for another proposal.
- **The composer** lists what approving will do, takes the message to the customer (required, sent as written), whether the customer pays the extra cost, and a note for the record. Its one gold action is "Approve and tell the customer".
- **Route:** an option that changes the route or adds a delay gives the trip a new **confirmed** route version (`REVISE_ROUTE_PLAN`), superseding the last one. Every stop the trip hasn't reached yet (no trip record at it) is moved by the delay. Each job's planned arrival follows its delivery stop, and before departure its departure follows the first pickup. `incidents.route_plan_id` points at the new version. Choosing different stops after departure isn't possible yet: the new version keeps the stops and changes the times.
- **Documents:** when a job's planned arrival moved, the document check runs again for the new dates (US-F2-10), also after departure (`ClearanceService.recheckAfterReplan`). A moving job's clearance gate isn't re-locked; a cleared item that no longer holds goes back to review, and the job's transport specialist is told which ones.
- **Cost:** when the customer pays, the option's extra cost becomes a `job_charges` row on the job (one per incident), which the final invoice turns into an `ADJUSTMENT` line. When EquiFreight pays, nothing is attached and the audit row says "not charged".
- **Who is told:** the job's club gets `INCIDENT_UPDATE` with the manager's message as written, opening the job's tracking. Whoever proposed it and the coordinator get `INCIDENT_DECIDED`, and so does the trip's crew, on the cab.
- **Open:** on a shared trailer the delay moves every job on the trip, but only the incident's customer gets the manager's message, since it may name their horse. Telling the other clients about their new times after departure is still to decide (docs/shared-trips-design.md keeps that for incidents). Resolving an incident (`RESOLVED`) isn't built.
