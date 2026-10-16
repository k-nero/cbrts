---
target: "tables: sort, filter, pagination"
total_score: 25
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:/Users/nero/Documents/schools/fpt/swp391-p2/docs/figma-plugin/src"
timestamp: 2026-09-27T18-26-33Z
slug: docs-figma-plugin-src
---
# Critique: tables (sort, filter, pagination)
DEGRADED: single-context (no sub-agents spawned per session rule)

Target: every table in docs/figma-plugin/src (Jobs, My requests, Users & roles, Audit log, Review queue, catalogs, quotation ledgers, document tables).

## Heuristics (25/40, Acceptable)
1 Visibility 2 (sort order only in footnotes) · 2 Match 3 · 3 Control 2 (no reorder; Clear filters only on audit) · 4 Consistency 2 (four filter patterns; paging only on audit) · 5 Prevention 3 · 6 Recognition 2 (no sortable-column affordance) · 7 Flexibility 2 · 8 Aesthetic 3 · 9 Recovery 3 (Jobs Find has no no-results) · 10 Help 3

## Specificity
Rows are product-specific (What holds it, You owe N, stage 4 of 7, two-line departures). The controls around them are ad hoc per screen. Detector: 0 findings (JS Figma generator, no markup to scan).

## Priority issues
- [P1] No shared table-controls pattern: build Table toolbar (count tabs left; Search + ≤2 Selects right; Clear filters when active) and Table foot ("1–25 of 142", prev/pages/next, 25 per page, hidden page controls when one page). Apply to Jobs, Users & roles, My requests, Audit log; move Jobs Find into toolbar.
- [P1] Sort state only in prose: sortable header cell (Unsorted faint arrows on sortable columns only; Asc/Desc arrow + Parchment label; aria-sort). The default needs-me-first order shown as toolbar "Order: blocked first, then departure" + Reset; delete footnote sort sentences.
- [P1] Withhold sort where order is meaning: quotation ledgers (fixed calculation order), rate catalog tables, document tables grouped by horse, Overview Review queue (link "View all 4 in Requests" instead). Record as fixed-order in DESIGN.md.
- [P2] Users & roles: tab counts, search, Role select, Table foot on Customers.
- [P2] Audit log: "12 newest" vs "Show 25 more" mismatch; switch to numbered Table foot at 25; When is its only sortable column.

## Sort/filter matrix
- Jobs: sort Job, Stage (1–7), Departure; default blocked first then departure; filters tabs + Find + Mode select; paged.
- My requests: sort Request, Departs, Stage; default needs-you-first; Active/Past tabs + search (code, route, horse); paged (Past).
- Requests full list (LM, not drawn): sort Request, Departs, Age (default oldest), Horses; stage tabs + customer search; paged.
- Users & roles: sort Name, Jobs, Last active; tabs with counts + search + Role select; paged on Customers.
- Audit log: sort When only; existing four filters; numbered paging.
- Quotation, rate catalog, document tables, Review queue: fixed order, no sort, no paging.
Never sortable: Route, What holds it, Action text, chevron column.

## Personas
- Alex (Yến): can't bring next departures to top; Find detached from table; 6 load-more clicks in audit.
- Sam: no aria-sort; arrow glyph must not be the only direction signal.
- Đức (club, 40 past moves): Past tab unpaged, no search by horse or route.

## Minor
Tab counts inconsistent (Users has none); sort header cells need gold focus state; Jobs Find lacks no-results state.
