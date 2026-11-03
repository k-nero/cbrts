---
target: trip tab
total_score: 24
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:/Users/thanh.nguyen/Documents/dev/cbrts/FE/src/pages/staff/jobs/ViewAddEdit/TripTab.tsx"
target_fingerprint: "sha256:168efb76dd68fd70253d3450a4a46f54f3a247177cf66ed8a0dfc57f1d8f74d6"
target_path: /Users/thanh.nguyen/Documents/dev/cbrts/FE/src/pages/staff/jobs/ViewAddEdit/TripTab.tsx
timestamp: 2026-11-02T04-06-46Z
slug: fe-src-pages-staff-jobs-viewaddedit-triptab-tsx
---
Method: dual-agent (A: design review · B: detector + browser)

## Design Health Score
| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 2 | Header gate band is empty (index.tsx:186 passes no reason or action); rail shows untoned "not started" ×3 |
| 2 | Match System / Real World | 3 | Strong domain copy; timeline shows HH:mm only, so a 24 h leg reads 00:00 → 00:00 |
| 3 | User Control and Freedom | 3 | Editor cancels cleanly; trip and view in the URL; destructive actions confirmed |
| 4 | Consistency and Standards | 2 | Panel `p-4` overrides misalign titles; 27/10/2026 vs "30 Nov"; Owner shows a role, not a name |
| 5 | Error Prevention | 2 | Gold Record departure enabled with crew unassigned, plan unsigned, editor open |
| 6 | Recognition Rather Than Recall | 3 | Rail keeps the journey visible; header date is job-level, wrong for trips 2–3 |
| 7 | Flexibility and Efficiency | 2 | No trip-to-trip shortcuts; empty panels add scroll on every visit |
| 8 | Aesthetic and Minimalist Design | 2 | "Clear to depart" twice; flight times twice; two full-size empty panels |
| 9 | Error Recovery | 2 | "1 items are outstanding" names nothing and links nowhere |
| 10 | Help and Documentation | 3 | Good inline explanation in empty states and hand-on callouts |
| **Total** | | **24/40** | **Acceptable** |

## Design Specificity Verdict
Vocabulary authored (Fraunces cities, mono codes, hand-on copy, trailer diagram); composition generic (stack of equal-weight cards). Detector: CLI 0 findings on 15 files; browser 6/12/6 per view, mostly antd internals or devtools (false positives). Real: rail truncation (19px), "Assign a driver and grooms" truncation (30px), 0px vertical padding on "Take off", h1→h3 skip, 107-char line.

## Priority Issues
- [P1] Gold Record departure on an action that isn't ready (RouteTab.tsx ~279, RecordDepartureButton) → readiness ladder; gold = first unmet step. /impeccable harden
- [P1] Gate stated without reason; "Dossier complete" contradicts Documents 4 of 7 (index.tsx:186, LoadPlanTab.tsx:615) → pass summary + "View outstanding items"; word domestic exemption. /impeccable clarify
- [P1] Timeline has no dates and no connection check (zero-minute SGN hand-on → flight) → day-change dates, leg rows, cross-trip Connection check. /impeccable harden
- [P2] Rail is a list, not a status board (JourneyRail.tsx:59-63) → toned chip per trip, wrap cities. /impeccable clarify
- [P2] Route and flight bodies long and repetitive → merge Schedule into FlightPanel, collapse empty Share/Join, drop p-4 overrides. /impeccable distill

## Persona Red Flags
Khôi: can't see which trip is blocked; gold looks done; misses zero-minute connection; header date wrong for trips 2–3. Sam (screen reader): times without dates; stop-kind icons look like move buttons. Jordan (new): "Take off" reads like a flight; unclear whether Load plan or Route comes first.

## Minor Observations
"1 horses", "1 STALL POSITIONS", "1 items"; "AIR SGN -> HKG" ASCII arrow; raw CONFIRMED/SUPERSEDED; header "vehicle" fallback on flight; editor opens above the old timeline.

## Questions to Consider
One readiness ladder for the trip's gold? Journey as the main object with cross-trip connections? Should a domestic-leg exemption share the full green band with a cleared dossier?
