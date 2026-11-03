---
target: FE/src/pages/customer/requests/index.tsx
total_score: 25
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 2
target_identity: "file:/Users/nero/Documents/schools/fpt/FE/src/pages/customer/requests/index.tsx"
target_fingerprint: "sha256:70aa32dad34f4670ae1ce3521356d3f487e3f8c331dc30401489f99d18157549"
target_path: /Users/nero/Documents/schools/fpt/FE/src/pages/customer/requests/index.tsx
timestamp: 2026-10-31T18-49-26Z
slug: fe-src-pages-customer-requests-index-tsx
---
# Critique: My requests (customer)

Method: dual-agent (A: design review · B: detector + browser overlay)

Score: 25/40. P0: 1. P1: 2.

## Heuristics
| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 2 | The chip shows the state, not the next step or its owner |
| 2 | Match with real world | 3 | "Documents" as a status is a noun, not a state |
| 3 | User control & freedom | 3 | Discard is confirmed; Reset order exists |
| 4 | Consistency & standards | 2 | Draft chip appears twice; Quoted/Documents are Info while action is needed; two Request transport buttons |
| 5 | Error prevention | 3 | A quotation waiting on the customer looks like a passive row |
| 6 | Recognition over recall | 2 | No deadline, quote expiry or owed count |
| 7 | Flexibility & efficiency | 2 | One sort only; no "needs me" view; column resize is not useful here |
| 8 | Aesthetic & minimalist | 3 | Calm, but toolbar and pager cruft for 3 rows |
| 9 | Error recovery | 3 | Load-error and discard copy are excellent |
| 10 | Help & documentation | 2 | Status words are not explained; ops desk is only in the footer |

## Priority issues
- [P0] The list doesn't say what is owed or by when. Fix: a next-step line under the chip (owner + deadline). Command: /impeccable clarify
- [P1] Rows that need action are neither ranked first nor given an action tone. Command: /impeccable layout
- [P1] A row with no action button (Submitted) is unreachable by keyboard; column-settings button has no name; no aria-sort. Command: /impeccable harden
- [P2] At 768px the Status and action columns scroll off-screen. Command: /impeccable adapt
- [P2] Duplicate Draft chip, duplicate CTA, table chrome on 3 rows. Command: /impeccable distill

## Detector
- CLI: 0 findings.
- Overlay: low-contrast on the active pagination item (gold #c9aa5a on white, 2.2:1). Real, theme-wide (antd colorPrimary).
- Overlay: shape-assembled-illustration. False positive (TanStack devtools logo).
- Console: React duplicate-key warning on this route.
