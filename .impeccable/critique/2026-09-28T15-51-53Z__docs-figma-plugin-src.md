---
target: whole Figma design after polish
total_score: 31
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:/Users/nero/Documents/schools/fpt/docs/figma-plugin/src"
timestamp: 2026-09-28T15-51-53Z
slug: docs-figma-plugin-src
---
# Critique: EquiFreight Figma design (72 screens, after the data-consistency polish)
DEGRADED: single-context (sub-agents run only on explicit request in this session)

Evidence: detector 0 findings (JS generator, no markup). Figma screenshots of ~35 screens + scripted canvas lint (0 overflowing rows, 0 overlapping text, 0 straight apostrophes, cross-screen data consistent).

## Heuristics (31/40, Good)
1 Visibility 3 (hero dots colour-only) · 2 Match 3 (mono all-caps shorthand like WINDOW BEFORE DEP.) · 3 Control 3 · 4 Consistency 3 (mono breadcrumb, badge semantics) · 5 Prevention 4 · 6 Recognition 3 · 7 Flexibility 2 (no bulk, no next-request) · 8 Aesthetic 3 (chip-noisy staff tables) · 9 Recovery 4 · 10 Help 3

## Specificity
Highly authored: nameplate, route titles, clearance gate, line-basis quotation, cab trailer timer. Generic: Home services icon grid + stats band, Overview KPI tiles + chart pair.

## Priority issues
- [P1] Signed-in customer Home is a marketing page. Signed-in Home should open with "You owe N items across N requests" (top gold), active moves strip, then Request transport/services; marketing hero to a signed-out landing frame. /impeccable shape
- [P1] All-caps mono overload on staff screens: breadcrumb to Outfit Label S; stage as Label S + "4 of 7" Mono Caption, no pill; chips only for state. /impeccable quieter
- [P2] Staff page header takes 463px before the Jobs table: Display M title, one-line summary, no divider before tabs. /impeccable layout
- [P2] Home hero document dots colour-only: add a glyph per state, keep legend. /impeccable polish
- [P2] Generic templates on Home and Overview: services as route/price table; Overview tiles end in a verb + link. /impeccable bolder

## Personas
- Alex (Yến): queue shows 4 requests; no next-request on review; no bulk on users.
- Sam: 11px uppercase mono chips/headers; hero dots colour-only; no focus states on stall tiles/option cards.
- Club bookings manager: 3 screens from sign-in to an overdue item.

## Minor
Sidebar badge semantics differ; blue "3 Jobs pinned" stat; Quotation right column 7 panels; Overview Horses/Departs headers 8px apart; mobile frames unmaintained but unlabeled.
