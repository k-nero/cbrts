# Reports (EPIC-R)

Status: in progress. Built: the logistics manager's Overview (US-R-01, #71). Not built: the revenue and operating cost report (US-R-02, #72) and the on-time delivery KPI (US-R-03, #73), which the Overview's chart row and on-time tile will show (DESIGN.md, Overview; the Figma frame "Logistics manager · Overview").

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

- **Below the tiles:** the Review queue preview (the oldest five, each opening its review, with "View all N in Requests" instead of a pager), beside Clearance at risk (the four blocked jobs leaving soonest, each with what holds it in the Jobs list's own words, opening its Clearance tab).
- **New lists it opens:** Requests gains a Quotes out tab (issued quotations, soonest to expire first; a row opens the request), and Jobs gains a This week tab. The Jobs and Requests tabs now live in the URL, so a tile opens its list already filtered.
- **Freshness:** the Overview reloads every minute, as the review queue does.
