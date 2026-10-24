# Incidents (Flow 5)

Status: built. Reporting an emergency from the cab (US-F5-01, #60), recording the options (US-F5-02, #61), the manager's decision (US-F5-03, #62), delay alerts (US-F5-04, #63), closing an incident (US-F5-05, #64) and leaving a moving trip (US-F5-06, #174). PRODUCT.md lists Flow 5's detail as undecided; the rules below are what the tickets asked for, built the smallest way that fits the schema in `docs/database/database-design.md` (Domain J) and the Incident page in `DESIGN.md`. Each is open to change.

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
- **Open:** on a shared trailer the delay moves every job on the trip, but only the incident's customer gets the manager's message, since it may name their horse. The other clients hear their new time (`TRIP_TIMES_CHANGED`), as for leaving a moving trip below.

## Delay alerts (US-F5-04)

- **Who:** the coordinator, or the logistics manager, from the job's Trip tab ("Send a delay alert"), while the job is on the road: its part on a trip has departed and isn't delivered. Before departure, times move on the Route tab instead.
- **What it holds:** the reason, as option cards (traffic `TRAFFIC`, bad weather `WEATHER`, border congestion `BORDER_CONGESTION`), the job's new arrival in Indochina Time (after the planned one, at most 7 days later), and an optional note of up to 500 characters.
- **It opens an incident** of that kind (`source` `STAFF`), owned like any other, so the logistics manager can still weigh options and closes it. `incidents.eta_at` keeps the arrival it announced; the audit row (`DELAY_ALERT`) keeps the reason, the new arrival and the delay.
- **The schedule moves:** the delay is the new arrival less the planned one. As for a decision, the trip gets a new confirmed route version with every stop not yet reached that much later, each job's planned arrival follows its delivery stop, and the documents are checked again for the new dates.
- **Who is told** (`DELAY_ALERT`): the trip's crew on the cab (the reason, the note, how far the stops ahead move and the job's new arrival); the job's club (the note, the new arrival, how much later, and whether it is still inside the window); every other customer on the trip (the reason and their own new time, never the note, which may name a horse); the owner and the coordinator, unless they sent it. Another job pushed past its window gets a `LATE_ARRIVAL` incident of its own.
- **Not built:** sending a second alert on the same incident (each alert opens its own), and an alert from the incident page of a cab report.

## Closing an incident (US-F5-05)

- **Who:** a logistics manager, from the incident page ("Close the incident").
- **What it needs:** how it ended (`incidents.resolution`, up to 300 characters) and a closing note for the record (`closing_note`, up to 1000), both required; the database refuses a `RESOLVED` incident without them (`incidents_resolution_check`). `resolved_at` and `resolved_by` keep when and who.
- **When:** once decided, closing is the page's one gold action. An open incident can be closed without a decision (the jam cleared), as a Secondary, but not while a proposal waits: approve it or send it back first. A closed incident takes no more options and can't be closed again. Closing ends a stopped clock (`clock_stopped_until`).
- **Who is told** (`INCIDENT_RESOLVED`): the coordinator, whoever proposed and the owner, unless they closed it; an escort who reported it, on the cab. The customer isn't told; what they hear came with the decision or the alert.
- **The timeline stays on the job.** Every step of an incident writes an audit row on it (`RAISE_INCIDENT`, the options, the proposal, a return, `DECIDE_INCIDENT`, `DELAY_ALERT`, `RESOLVE_INCIDENT`; a `LATE_ARRIVAL` incident opened by a decision or an alert now writes one too). The incident page shows them oldest first as its Timeline, and the job's Trip tab lists every incident on the job with its status, resolution and timeline (`GET /staff/jobs/{id}/incidents`).

## Leaving a moving trip (US-F5-06)

After departure, only an incident decision takes a job, or some of its horses, off a trip. The coordinator's Load plan and Route actions are refused once the job's part on that trip has left.

- **The option.** Besides its cost and delay, an option can say how horses leave: unload at a safe place and continue later (`UNLOAD`, needs the place), send a second vehicle (`SECOND_VEHICLE`, needs the vehicle), return to origin (`RETURN_TO_ORIGIN`), or leave in care (`LEAVE_IN_CARE`, needs the place). It names the horses: some or all of the incident's job's horses on its moving trip (`incident_option_horses`). It also records who bears the extra cost as proposed (`customer_pays`), which the decision composer starts from; the manager decides.
- **Deciding it.**
  - *Left in care:* the horses' `trip_horses` rows become `LEFT_IN_CARE` and they come off their stalls. That counts as delivered for this move.
  - *Otherwise:* the horses move to a new trip of their own (`incidents.new_trip_id`); their old rows become `MOVED`, and records stay where they happened.
    - A trailer whose confirmed placements are only those horses goes with them: its load plan, crew and booking move too. A trailer still carrying others stays.
    - For a second vehicle, that vehicle joins the new trip.
    - The new trip waits to be planned, signed off and departed like any other. Its documents are re-checked for its dates when its route is confirmed, so an AMBER or RED document locks the clearance gate and holds that departure.
    - The job's transport specialist is told to confirm the shipment's permits still cover the horses.
- **The trip carries on** with a new confirmed route version. A job whose horses all left loses its stops not yet reached. Pickups of a moving trip count as passed. The flight's consignments follow.
  - Another customer whose arrival moved hears only their new time (`TRIP_TIMES_CHANGED`).
  - A job pushed past its window gets an incident of its own (`LATE_ARRIVAL`), owned by its manager.
- **A job on two trips.** A job's part on each trip is a `trip_jobs` row: status, departure, delivery and sign-off per part.
  - Departure needs that part's sign-off and the job's clearance gate. A part already moving isn't held back by the other part's documents.
  - Each trip's crew sees and records its own part.
  - The job's own status sums up its parts (`JobTripService.summarize`): delivered, and handed over, only when every horse is delivered or left in care.
  - The job page plans the newest part and says the job travels in parts. Tracking lists the parts and opens either one (`?trip=`).
- **Not built:** a stop for the unloading place on the moving trip's route (the place is on the option and the incident). Planning the new trip uses the usual Load plan and Route tabs, and its route is entered as for any trip.
