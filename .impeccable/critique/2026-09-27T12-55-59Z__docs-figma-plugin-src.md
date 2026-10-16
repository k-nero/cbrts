---
target: consistency/alignment between screens
total_score: 28
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:/Users/nero/Documents/schools/fpt/swp391-p2/docs/figma-plugin/src"
timestamp: 2026-09-27T12-55-59Z
slug: docs-figma-plugin-src
---
Method: dual-agent (A: a360a628abd6dcfdc · B: ad15cb793ef9de7aa). Detector [] (plugin JS); overlay n/a (Figma).
Target: consistency/alignment across all 50 screens (owner, tracking, staff, cab).

Scores: H1 3, H2 3, H3 3, H4 2, H5 3, H6 3, H7 3, H8 3, H9 3, H10 2 = 28/40 (Good).

Measured: padding 120 owner / 40 staff everywhere; content gap owner 28 (32 on My horses + wizard, 0 Home), staff 28; header signatures owner 4, staff 3; untitled-back-link title y 96/108/112 vs 142 with back link; right columns owner 360/400/420/440/456/470(+480), staff 320/340/380/400/440; gold placement 6 owner / 4 staff; canvas: tracking row at x=-60, 6 job-tab staff frames + owner Quotation in Operations row, row spacing 223–336.

Priority issues:
- [P1] Documents: two vocabularies and two rows (All documents vs Checklist). /impeccable clarify
- [P1] 7 header builders; titles without back link at 96/108/112; My requests built twice. /impeccable extract
- [P2] 8 side-column widths, 2 gutters → 400 + 456, gap 24. /impeccable layout
- [P2] Same job described differently (Overview vs Jobs, "SLA passed", "Clearance clear"). /impeccable clarify
- [P2] Request summary: 3 field sets, 2 fact-label styles. /impeccable polish
Bug: Request review "4 of 5 pass" counts Pending as pass (07-review.js checksPanel).
