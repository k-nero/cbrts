---
target: EquiFreight new screens, items 1–12 (27 frames), after fix round
total_score: 32
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 1
target_identity: "file:/Users/nero/Documents/schools/fpt/swp391-p2/docs/figma-plugin/src"
timestamp: 2026-09-27T08-22-35Z
slug: docs-figma-plugin-src
---
Method: dual-agent (A: a2c08a59be9f677db · B: a7bec5a4cb53789fd). Detector returned [] (plugin JS, nothing scannable); consistency test passes; browser overlay n/a (Figma frames).

Scope: 27 new desktop frames from shape items 1–12, after the adapt/harden/polish/typeset/distill fix round (adds Trip · Held; Trip frames are a Light cab surface).

## Design Health Score
| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 3 | Edit "saved 11:32" beside "Before you save" (23); cab chip "Clearance clear" (13) |
| 2 | Match System / Real World | 3 | "34 of 21 days" (01); "Recorded now" on both outcomes (13); injury "within a day" vs illness "within hours" (20) |
| 3 | User Control and Freedom | 3 | No answer path on 03; no back link on 27 |
| 4 | Consistency and Standards | 3 | Dashboard vs Overview; gold vs green ticks; bell icon for Call |
| 5 | Error Prevention | 3 | Live "Request transport" with 0 horses (26); double booking caught late |
| 6 | Recognition Rather Than Recall | 4 | Context co-located everywhere |
| 7 | Flexibility and Efficiency | 3 | No bulk approve; notes: one sort, no filter |
| 8 | Aesthetic and Minimalist Design | 3 | 01 conflict 4×, 12 alert 3×; gold outlines pile up |
| 9 | Error Recovery | 4 | Value, limit, fix everywhere |
| 10 | Help and Documentation | 3 | 1-business-day quote promise uncaveated |
| **Total** | | **32/40** | **Good** |

## Design Specificity Verdict
~90% authored for this product; the Trip frames moved from least to most specific. Generic part: one staff skeleton (facts left, 400 px right column, gold composer box).
Deterministic: ≤1 gold per frame (5 zero-gold frames by design); 0 unbound colours; 0 overflow; 0 coloured side borders >1 px; no Trip target <44 px; all contrast pairs ≥4.5:1 (lowest tertiary on muted Light 4.54); 11 px DM Mono chips in all 27 (system choice); 3 mono prose nodes >60 chars (builder Basis, two upload "Checked against…"); stage chips on Blocked builder / Authorities 26 Sep / Delivery match the story.

## Priority Issues
- [P1] New cross-screen contradictions the consistency test misses: 18 paraphrases the escort's 08:12 record and includes "watered at 08:40"; 18 Wait "7 h late" should be 6 h; 19 PVI 18:02 vs timeline 18:05; DAH contents 11 vs 12; customs "file on 14 Oct" (11, 25) vs "Filed 26 Sep" (12); 15 log counts the unsaved handover. Fix: verbatim shared record, derived deltas, one authorities fixture, extend test/consistency.js. /impeccable harden
- [P2] Gold outline creep (3–5 gold borders on 18, 19, 20, 25), 45% olive disabled primary (02, 05), gold vs green ticks. Fix: neutral composer borders, gold only on focus, disabled primary as Secondary + reason, one tick colour. /impeccable quieter
- [P2] Say it once still broken: 01 4×, 05 3× + cells, 07 3× in two words, 12 3×. /impeccable distill
- [P2] 03 owed item can't be answered; deadline tone orange vs blue. Fix: three radio answers that prefill the edit. /impeccable clarify
- [P2] Mono still carries words and names (meta lines, attributions, "Recorded now", "Oldest first", 21 price deltas in tertiary mono). /impeccable typeset

## Persona Red Flags
- Escort: "Recorded now" on both cards; tertiary grey in glare; bell for Call; info-blue Held cell vs red chip; green rows look like facts.
- Jordan: live Request transport; no back link; Stabled at under value; 32 in vs 48 in unexplained; 1-day promise.
- Niran: injury "within a day" vs illness "within hours".

## Earlier issues
Data P1 partly resolved (new contradictions); cab P1 resolved; radios resolved; mono prose partly; red restated partly.

## Minor Observations
Dashboard vs Overview; "34 of 21 days"; status chips for traits/topics; "Jobs 3" badge; saved 11:32; empty coat band; tags lack ×; filing dates stated once (11); 09 "15 of 23" fixture; step 2 knows route before step 3; DESIGN.md still places escort "Sound" beside the customer report.

## Questions to Consider
- Should a staff screen ever show the escort's record in other words or times?
- Why is rebuilding the request the only way to answer a three-way question?
- With four gold outlines around one gold button, what does gold still mean?
