# Incidents (Flow 5)

Status: in progress. Built: reporting an emergency from the cab (US-F5-01, #60). PRODUCT.md lists Flow 5's detail as undecided; the rules below are what the tickets asked for, built the smallest way that fits the schema in `docs/database/database-design.md` (Domain J) and the Incident page in `DESIGN.md`. Each is open to change.

## Reporting an emergency (US-F5-01)

- **Who:** the escort, from the cab, on a trip they crew that has been released to them (signed off, or already moving). Anyone else gets a 404, as for the trip itself.
- **Kinds:** vehicle breakdown (`VEHICLE`), prolonged traffic jam (`TRAFFIC`), horse medical incident (`WELFARE`) and other emergency (`OTHER`). `HELD` stays for a hold recorded in the trip log and `CUSTOMER_REPORT` for the customer's Report a problem; the cab can't open either.
- **What the report holds:** where (free text, up to 200 characters: "QL22 km 41, before Gò Dầu"), what happened (up to 500, kept as written in `incidents.summary`), up to eight photos, and the horse it concerns. A horse medical incident must name the horse.
- **Which job:** an incident belongs to one job (`incidents.job_id`). A report about a horse is raised on that horse's job, so on a shared trailer it lands on the right customer's job; any other report on the job the cab is open on.
- **Owner:** the logistics manager who approved the job; if that account is no longer active, the first active logistics manager.
- **Alerts:** at once, in the same transaction, an `INCIDENT_RAISED` notification (Bad tone) to the owner and the job's coordinator; a job without a coordinator alerts every coordinator. It opens the staff incident page. The customer isn't told by this: what they hear comes from the manager's decision.
- **Offline:** the tablet sends its own reference (`incidents.client_ref`, unique); resending it returns the incident already opened and alerts nobody again. The tablet's time is kept in the audit row (`RAISE_INCIDENT`, channel `CAB_TABLET`).
- **Screens:** the cab has a "Report an emergency" panel (four option cards, where, which horse, what happened, photos); after sending it says who was alerted and when. Staff have Incidents (Open, Decided, Resolved, All; newest first) and the incident page: the report quoted with its author and time, where, the horse, the photos, the job and trip, and the people. The logistics manager has Incidents in the sidebar; the coordinator reaches an incident from the alert.
