---
target: whole Figma design after five-step pass
total_score: 32
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 1
target_identity: "file:/Users/nero/Documents/schools/fpt/docs/figma-plugin/src"
timestamp: 2026-09-28T16-41-21Z
slug: docs-figma-plugin-src
---
# Critique: EquiFreight Figma design after the five-step pass (Home, quieter staff, header, bolder, glyphs)
DEGRADED: single-context (sub-agents only on explicit request)

Evidence: detector 0 findings (JS generator). Figma screenshots of both Home themes, Landing, Overview, Jobs, Clearance, Request review, tracking/cab headers. Canvas lint: 0 overflow, 0 overlap, 0 stage pills left, <=1 gold per view.

## Heuristics (32/40, Good)
1 Visibility 4 · 2 Match 3 (mono all-caps chip shorthand) · 3 Control 3 · 4 Consistency 3 (sidebar badge semantics) · 5 Prevention 4 · 6 Recognition 3 · 7 Flexibility 2 (no next/bulk) · 8 Aesthetic 3 (Overview legend clipped; landing stats band) · 9 Recovery 4 · 10 Help 3

## Specificity
Signed-in Home and Overview tiles are now product-specific. Generic leftovers: landing stats band (hero-metric), dashboard chart pair.

## Priority issues
- [P1] No accelerators for staff repeat work: Document review "Approve and open next (3 left)", Request review "Next in queue (2 of 4)", Users bulk "Resend invite". /impeccable shape
- [P2] Overview revenue legend clipped (regression; lint skips SPACE_BETWEEN rows): legend on its own line or caption wraps at 360; extend lint. /impeccable polish
- [P2] Landing stats band is the hero-metric template: fold the four commitments into the Seven stages section, remove the band. /impeccable distill
- [P2] Sidebar badges count different things (Requests 4 = queue; Jobs/Incidents 1 = needs me): every badge = needs you; queue sizes live in tabs. /impeccable clarify
- [P2] 11px uppercase mono chips/eyebrows; no focus variants for option cards, stall tiles, Home move rows, Overview tiles. /impeccable audit

## Personas
- Alex (Lan): 23 round trips per job in Document review.
- Sam: no drawn focus on cards/tiles/rows; 11px mono.
- Club bookings manager: one step to the overdue item now.

## Minor
Unused Service card component; page-header demo shows only owner variant; Quotation right column 7 panels; mobile frames unlabeled; grey "nothing needed" row reads disabled.
