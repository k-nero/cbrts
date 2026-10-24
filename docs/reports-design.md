# Reports (EPIC-R)

Status: built. The logistics manager's Overview (US-R-01, #71), the revenue and operating cost report (US-R-02, #72) and the on-time delivery rate (US-R-03, #73), all on the Overview (DESIGN.md, Overview; the Figma frame "Logistics manager · Overview").

## Overview (US-R-01)

- **Who:** the logistics manager; it is their first sidebar item and where they land after signing in.
- **The tiles:** five counts of what needs attention. Each names the one case that matters most beneath a hairline, with an arrow, and the whole tile opens the list behind it, filtered to the same rows, so a count and its list never disagree (`OverviewService` reads each from that list's own query).

  | Tile | Counts | The case shown | Opens |
  |---|---|---|---|
  | Awaiting review | Requests submitted, under review, or accepted and waiting for approval | The oldest, and how long it has waited | Requests (the review queue) |
  | Quotes out | Issued quotations waiting for the customer's answer | The next to expire; warn-toned within 2 days | Requests · Quotes out (`?view=quotes`) |
  | Jobs blocked | Jobs whose dossier isn't cleared (bad-toned when any) | The one leaving soonest, with what holds it | Jobs · Blocked (`?filter=BLOCKED`) |
  | Incidents open | Open incidents (warn-toned when any) | The newest | Incidents · Open |
  | Departing this week | Jobs not yet left that are due to leave in the next 7 days | The next to leave | Jobs · This week (`?filter=THIS_WEEK`) |
  | On time, 30 days | The share of jobs delivered in the last 30 days that were on time (ok-toned at or above the 95% target, warn-toned below) | How many of how many were late | The on-time panel below (`#on-time`) |

- **Below the tiles:** the Review queue preview (the oldest five, each opening its review, with "View all N in Requests" instead of a pager), beside Clearance at risk (the four blocked jobs leaving soonest, each with what holds it in the Jobs list's own words, opening its Clearance tab).
- **New lists it opens:** Requests gains a Quotes out tab (issued quotations, soonest to expire first; a row opens the request), and Jobs gains a This week tab. The Jobs and Requests tabs now live in the URL, so a tile opens its list already filtered.
- **Freshness:** the Overview reloads every minute, as the review queue does.

## Revenue and operating cost (US-R-02)

- **Where:** on the Overview, below the queue, as the Figma frame draws it ("Revenue and direct cost by month"); revenue and margin live with this chart, never in a tile (DESIGN.md, Overview tiles).
- **What a job counts as:** a job counts once it is settled, in the month (Indochina Time) its final invoice was issued. Drafts and void invoices don't count.
  - **Revenue:** what the job was invoiced: its deposit invoice and its final invoice. That is after the volume break and any late-arrival credit, and includes incident costs charged on.
  - **Direct cost:** the job's priced lines A–H as settled (the final invoice's quoted and actual lines that settle a quotation line), plus the extra cost of each incident option decided on the job, whoever paid it. The rate catalog records no separate supplier cost, so the priced lines stand for the cost base, as contingency is "of the cost base" (database-design.md, rate policies).
  - **Margin:** revenue less direct cost: in effect the surcharges (fuel, insurance, arrival window), contingency and service fee, and charged incident costs, less discounts, credits and the incident costs EquiFreight absorbed.
- **Filters:** the period (last 6 months, last 12 months, this year; the API takes any YYYY-MM to YYYY-MM up to 24 months, the last six by default) and one corridor or every corridor. All money is USD, the only quotation currency.
- **The panel:** the subtitle states the period's revenue, gross margin and jobs settled; the legend; one chart of revenue (chart-1) beside direct cost (chart-2) per month, one axis, every month shown, the latest revenue labelled, a tooltip per month (jobs, revenue, cost, margin); then the corridors in a table, most revenue first, which is also the chart's table view. The two colours were checked with the palette validator in both modes (CVD ΔE about 20).
- **Export:** "Export CSV" downloads one row per job (month, job, club, corridor, final invoice, revenue, line cost, incident cost, direct cost, margin) for the same period and corridor (`GET /staff/reports/revenue.csv`). It carries a UTF-8 byte-order mark so a spreadsheet reads the corridor arrows; a cell that starts with `=`, `+`, `-` or `@` is prefixed with a quote so it can't run as a formula.

## On-time delivery (US-R-03)

- **The rule, one place:** a job is on time when delivered by when it was due (`LateArrival`). With an arrival window, due is the window's close and the minutes an incident stopped the clock (an authority hold, a welfare stop) don't count. Without a window, due is the planned arrival plus 30 minutes' tolerance (`PLANNED_ARRIVAL_TOLERANCE`). A job with neither counts as on time. Closing a job (US-F6-04) records its on-time and late minutes by the same rule, so the KPI and the closed record agree. The planned arrival is as last planned: a delay announced and re-planned before delivery moves it.
- **What counts:** the jobs delivered in the period (`delivered_at`, Indochina Time), on every corridor or one. The rate is on-time over delivered, one decimal.
- **The panel** (on the Overview, under the queue; the on-time tile scrolls to it): "On-time delivery by week" for the last 8 weeks (ISO weeks from Monday), or by month for the last 6 or 12 months; one line in chart-1 against the 95% target as a dashed line, the latest rate labelled, a tooltip per point; a period with no delivery leaves a gap, never a zero. Below it, the corridors (the lowest rate first, warn-toned under the target) beside the late jobs (latest first, how late, when, and against what), each opening its job.
- **API:** `GET /staff/reports/on-time?from=YYYY-MM-DD&to=YYYY-MM-DD&by=WEEK|MONTH&corridorId=`, up to a year; the last 8 weeks by week by default.
- **Layout:** the Figma frame puts the on-time and revenue charts side by side; each also carries its filters and its table (the ticket asks for both), so they are stacked full width instead.
