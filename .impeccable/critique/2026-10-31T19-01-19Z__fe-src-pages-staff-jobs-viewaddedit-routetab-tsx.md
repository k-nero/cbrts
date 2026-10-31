---
target: FE/src/pages/staff/jobs/ViewAddEdit/RouteTab.tsx
total_score: 17
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 3
target_identity: "file:/Users/nero/Documents/schools/fpt/FE/src/pages/staff/jobs/ViewAddEdit/RouteTab.tsx"
target_fingerprint: "sha256:47555d3755d2bb73019075b8682c5ae799da01649d1cb111dfe1b533c5f9d618"
target_path: /Users/nero/Documents/schools/fpt/FE/src/pages/staff/jobs/ViewAddEdit/RouteTab.tsx
timestamp: 2026-10-31T19-01-19Z
slug: fe-src-pages-staff-jobs-viewaddedit-routetab-tsx
---
# Critique: Route planning (staff, Trip tab → Route view + RouteEditor)

Method: dual-agent (A: design review, live flow as the coordinator · B: detector + browser overlay)

Score: 17/40. P0: 2. P1: 3.

## Heuristics
| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 2 | Strip read 0 km before save; no Confirmed chip; drafter warning lost after save |
| 2 | Match with real world | 2 | Times without dates (01:45 is next day); durations in minutes |
| 3 | User control & freedom | 2 | Confirm is one click with customer notices; editor opens off screen |
| 4 | Consistency & standards | 2 | arrow-up vs chevron-down; Save looks like Cancel; raw enum chips |
| 5 | Error prevention | 0 | Reorder doesn't move legs or times; out-of-order route saves and confirms |
| 6 | Recognition over recall | 2 | Coordinator adds leg + stay minutes by hand |
| 7 | Flexibility & efficiency | 1 | No recalc from departure, no drag, 6 fields per stop |
| 8 | Aesthetic & minimalist | 2 | Route buried under empty share/join panels and a duplicate gate |
| 9 | Error recovery | 2 | Client copy good, server copy has ISO instants |
| 10 | Help & documentation | 2 | No rest-rule or "Stay" explanation |

## Priority issues
- [P0] Reordering stops corrupts the form (stops.swap without legs, stale kind watch); impossible routes save and confirm (no chronological / geography check client or server). /impeccable harden
- [P0] No feasibility check before Confirm: welfare-stop shortfall, drive hours, arrival window. /impeccable clarify
- [P1] The route is not the hero of the Route view (share/join/gate around it). /impeccable layout
- [P1] Plan view lacks the DESIGN.md Route Stop schematic (legs, dates, all borders). /impeccable bolder
- [P1] Editor form: 37/37 inputs unlabeled (FormItem renders a span, label=""), minutes for durations, Details always open, 9 stop kinds unfiltered. /impeccable distill

## Detector
- CLI: 0 findings.
- Overlay: placeholder "Optional" 1.7:1 (real, AntD default placeholder); departure Callout nested in card (real); react-select nested-cards, bounce-easing token, devtools SVG (false positives).
- Browser: disabled IconButtons look enabled (IconButton.tsx:34).
