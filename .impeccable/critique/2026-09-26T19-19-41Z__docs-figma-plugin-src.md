---
target: EquiFreight new screens, items 1–12 (26 frames)
total_score: 30
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:/Users/nero/Documents/schools/fpt/swp391-p2/docs/figma-plugin/src"
timestamp: 2026-09-26T19-19-41Z
slug: docs-figma-plugin-src
---
Method: dual-agent (A: design review · B: detector + read-only Figma checks). Detector returned [] (plugin JS, nothing scannable); browser overlay n/a (Figma frames).

Scope: 26 new desktop dark frames from shape items 1–12 (request review, quotation builder, documents, document review, authorities, trip, handover, incidents, service step, horse profile, customer notes, first run).

## Design Health Score
| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 3 | Delivery still shows "Clear to depart"; Edit shows "saved 11:32" beside "Before you save" |
| 2 | Match System / Real World | 3 | "INFO_REQUIRED", "(BR-Q-08)"; "hh", "Size M · 32 in" unexplained |
| 3 | User Control and Freedom | 3 | No amend/undo after checkpoint or condition save; no confirm before re-route |
| 4 | Consistency and Standards | 3 | Square checkboxes on single-choice cards; deadline tone drift; Dashboard vs Overview |
| 5 | Error Prevention | 3 | Horse double-booking only caught at staff review |
| 6 | Recognition Rather Than Recall | 3 | Context co-located; All documents rules in mono shorthand |
| 7 | Flexibility and Efficiency | 2 | No "all sound", no bulk actions, one sort in notes |
| 8 | Aesthetic and Minimalist Design | 3 | Refusal stated 4×, missing rates 5×, stat tiles repeat cards |
| 9 | Error Recovery | 4 | Value found, limit and fix everywhere |
| 10 | Help and Documentation | 3 | Injury report lacks an urgent contact |
| **Total** | | **30/40** | **Good** |

## Design Specificity Verdict
~85% authored for this product (paper documents, rule sentences with the passing date, route strip from recorded checkpoints, trailer clock, quarantine vs minimum, escort record beside the report; ledger recomputes to the cent). Generic part is structural: one skeleton for every job. Trip frames least specific.
Deterministic: ≤1 gold per frame (5 frames with none, by design); 0 unbound colours; tertiary 5.16:1 / 5.50:1 passes AA; 1 overflow (Ask a question, Khôi's timestamp +12 px); 11 px Chip/Eyebrow everywhere (system choice); Trip touch targets: ticks 24 px, Clear/Show all/Jobs 32 px; stage chips consistent.

## Priority Issues
- [P1] Cross-screen data disagreements: Delivery "6 records" vs 6 by 09:40; Nightfall 32 in vs builder "2 × 48 in"; Held "at once" vs incident opened +58 min; report 17:32 vs unsent form at 17:40, reply due 19:40 > 2 h; Authorities "18 customer documents · 4 passports" double-counts. Fix: one fixture per job/quote/incident, derived counts, cross-frame check. /impeccable harden
- [P1] Trip tab isn't a cab-tablet surface: task ~500 px down, gold below the fold, 24 px ticks, 32 px Clear, 12 px grey times, no all-sound shortcut, dark in glare. Fix: escort mode, docked gold, 48 px toggles, 20 px+ times, high-contrast theme. /impeccable adapt
- [P2] Checkbox semantics on single-choice cards; gold ticks for completed facts. Fix: radios; ok-toned check icons for facts. /impeccable polish
- [P2] Prose in DM Mono at 11–12 px (reasons, meta lines, All documents rules). Fix: sentences to Outfit Body S; reconcile DESIGN.md. /impeccable typeset
- [P2] Red restated until noise (refused upload 4×, blocked builder 5×, authorities stat tiles). Fix: once, beside the cause. /impeccable distill

## Persona Red Flags
- Escort (cab tablet): gold under desktop chrome; 24 px ticks; 24 controls one save; 32 px Clear; 12 px times; no Held follow-on; no pending-sync state.
- Niran (injury report): green "Sound" beside her report; no urgent path; one report per horse; "paused" before sending.
- Jordan (first run): eyebrow "Welcome"; live "Request transport" with zero horses; hh/size/shared load/Coggins unexplained; "Stabled at" under value; 1-day quote promise contradicted.
- Sam: radio/checkbox semantics; 45% disabled gold; dimmed Air reason; 11 px uppercase mono.

## Minor Observations
Ask-a-question overflow; Delivery gate state; closed record omits clearance unlock; authorities filing dates lack time-left; Info required deadline tone mismatch; temperament/topic use status chips; gold composer borders; empty coat band; Add a horse lacks back link and repeats helpers; Edit effects omit height/weight/value; Jobs badge "3" for every role.

## Questions to Consider
- What if the escort never saw the job page at all?
- Is the groom's "Sound" beside an injury report reassurance or rebuttal?
- If every figure came from one fixture, which would survive?
