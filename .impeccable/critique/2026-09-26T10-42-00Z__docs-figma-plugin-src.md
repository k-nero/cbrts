---
target: EquiFreight desktop design (18 screens)
total_score: 27
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:/Users/nero/Documents/schools/fpt/swp391-p2/docs/figma-plugin/src"
timestamp: 2026-09-26T10-42-00Z
slug: docs-figma-plugin-src
---
Method: dual-agent (A: design review · B: detector + Figma deterministic checks). Detector returned [] (target is plugin JS, nothing scannable); browser overlay n/a (Figma frames).

Scope: 18 maintained desktop dark frames (owner, tracking, operations, admin). Light copies and mobile excluded.

## Design Health Score
| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 3 | Tracking excellent; quotation has no "where it stands" or next step |
| 2 | Match System / Real World | 3 | Spec jargon: "(BR-F1-04)", "Rule shape", "SLA PASSED" |
| 3 | User Control and Freedom | 2 | No withdraw in review, no "ask about a line", Remove on booked horses |
| 4 | Consistency and Standards | 2 | Three shells; "Quotes" vs "My requests" nav; 4/4/7 step models; "05/10/2026" inputs |
| 5 | Error Prevention | 3 | No horse availability check; stallion beside mare unflagged on load plan |
| 6 | Recognition Rather Than Recall | 3 | Customer reference changes REQ → Q → CBRT |
| 7 | Flexibility and Efficiency | 2 | No batch approve, needs-action filter or repeat route |
| 8 | Aesthetic and Minimalist Design | 3 | 23-row flat clearance wall; reflexive stat-tile rows |
| 9 | Error Recovery | 4 | Rule + value + fix, one-click fixes |
| 10 | Help and Documentation | 2 | No customer contact or ask channel anywhere |
| **Total** | | **27/40** | **Acceptable** |

## Design Specificity Verdict
~75% authored (nameplate, stall grid, travel-date validity copy, clearance lock on route, explainable quote lines). Generic: Home services grid, "Precision X for every Y" hero, reflexive stat rows, admin dashboard shell. Deterministic: 9/1,872 text contrast fails (3 disabled buttons, 4 brass engraving 4.0, 2 "Grey" coat label 3.7 = only hard-coded colour); text/tertiary passes at 4.6–5.2; 19.7% of text is 11px (admin tables worst); Clearance checklist has 2 gold Approve buttons; quotation "Valid · 4 days left" lacks a date. Regulation catalog two-gold finding was from a pre-fix capture (now 1).

## Priority Issues
- [P1] One product, three shells, no role boundary: customer header carries "Ops · Load plan · Clearance"; clearance approve/reject under customer identity; catalogs in separate admin shell. Fix: owner portal (Home, My horses, My requests + Request transport button) vs one staff workspace (Review queue, Jobs with Clearance/Load plan/Route tabs, Catalogs, People). Cmd: shape, layout.
- [P1] Quotation on the old page model: code as title, no back link, no preparer, no ask-a-line, no REQ lineage, no two-line validity, no estimate-vs-quote, no after-accept steps, Accept/Decline equal. Fix: rebuild on tracking skeleton, keep ledger. Cmd: clarify, layout.
- [P1] Same job, two stories: Silver Bell bill of sale in review (08) vs rejected/overdue (16); Shadowfax EIA in review vs approved 21 Sep; 23 vs 21 items; health certs "Due 8–18 Oct" (08) vs 8–14 Oct (16); duplicate REQ-0185/0193 in admin not in customer list; rate-catalog 5% volume break missing from 2-horse quote. Fix: one canonical fixture per job/quote. Cmd: polish, harden.
- [P2] Gold (#C9AA5A) and warn amber (#E0B04A) read as one colour next to each other; Clearance has two gold Approves. Fix: warn toward orange (~#E8914A) or brass the accent; per-row Approve Secondary + one batch gold. Cmd: colorize.
- [P2] Three process models (Home 4 steps listing 5 roles, Review 4 steps, Tracking 7 stages) and a reference that changes twice. Fix: one 7-stage vocabulary; one stable customer reference. Cmd: clarify.

## Persona Red Flags
- Jordan (first-timer): locked/failing hero card; Clearance nav opens approve buttons on own docs; "Size M · 32 in" unexplained and contradicted (48 in on quote); "05/10/2026" ambiguous; "dated 19 Aug or later" already past; no contact channel before delivery.
- Riley (stress tester): double-booking allowed at request step 1; stallion beside mare unflagged; Remove on booked horses; departure-date edit silently re-runs rules.
- Sam (low vision / CVD): colour-only document dots on Home; stall types by border colour next to red conflict; 11px uppercase mono density; disabled gold at 45% reads as muted gold.

## Minor Observations
Single-figure "from $800" prices vs ranges rule; "Aggressive" as red status chip; crossing names in mono chips; "pay the deposit" vs PRODUCT (acknowledged only); "SLA passed" meaning breached, amber not red; no demo-data footer on admin screens; spec leakage on Users and roles; red "Expected in 18 days" for a future date; lock glyph on "Clear"; no closed/settled state after handover; PRODUCT.md still describes old Home stats.

## Questions to Consider
- What if the quotation were the tracking page at its "Quotation" stage?
- Should a prospective owner's first image be a locked, failing job?
- If the customer's reference changes twice, whose number is it?
