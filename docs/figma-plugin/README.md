# EquiFreight design system — Figma generator

A Figma plugin that builds the polished EquiFreight / CBRTS design system and screens natively in a Figma **Design** file (not a Make file).

## Run it

1. Open **Figma desktop** (development plugins don't run in the browser) and create a new Design file.
2. Menu → **Plugins → Development → Import plugin from manifest…** → choose `manifest.json` in this folder.
3. Run **Plugins → Development → EquiFreight Design System**. It takes about 30–60 s and closes with a summary.

Re-running replaces what it made before: its variable collections, its text and effect styles, and its four `◆` pages. Delete the empty default `Page 1` by hand.

## What it builds

| Page | Contents |
|---|---|
| ◆ Cover | Title and contents |
| ◆ Foundations | Principles, colour tokens rendered in both modes, type scale, space, radius, elevation |
| ◆ Components | 37 icons and 20 component sets / components, 124 variants, with text, boolean and instance-swap properties |
| ◆ Screens | Home, My horses (desktop and mobile), Nightfall's horse profile and its edit state, first-run My requests and Add a horse for a new customer, Request transport steps 1, 2 (service), 3 (lead-time error) and 4, Quotation, plus Light-mode copies. Staff screens (desktop, sidebar shell with role-based nav): the Staff workspace row holds Regulation catalog, Rate catalog, Operations overview, Users and roles, Jobs, two Request review states, two Quotation builder states and two Document review states (approve and reject) and two Incident pages (a held border crossing, a customer report) and Customer notes; the job CBRT-2026-041's Load plan, Clearance, Authorities (26 Sep and an overdue 12 Oct state), Route tabs keep their places in the Operations row, followed by the escort's cab surface (checkpoint, welfare stop and delivery on 18 Oct, a held state on CBRT-2026-040, and the first leg of CBRT-2026-042 handed on to its flight). Owner · Request tracking row: My requests, In review, Info required, Documents needed, All documents, Ask a question, Document upload (refused and passing), In transit, Delivered, Closed and Report a problem |

**Variables**
- `EquiFreight / Color`: 40 tokens in **Dark** and **Light** modes (bg, surface, border, text, accent, status ok/warn/bad/info, stall types, brass, coats).
- `EquiFreight / Dimension`: `space/*` and `radius/*`.

Components bind fills, strokes, padding, gap and radius to these variables. To re-theme a frame, select it and set **Appearance → EquiFreight / Color → Light**.

**Styles**
- 15 text styles: Fraunces for display, Outfit for body, DM Mono for data.
- 4 effect styles.

If a font isn't available, the plugin falls back (Fraunces → Playfair Display → Inter, etc.) and lists what it substituted in the closing message.

## What changed from the Figma Make draft

- **Broken images replaced.** The Nightfall card showed a samosa photo and Copper King's image was broken. Each card now uses a brass stall nameplate on the horse's coat colour.
- **Emoji icons replaced** with one 24 px line-icon set.
- **Data made consistent.** The draft had 3 horses on one page, 4 on another and "2 horses" on a third. Job codes now follow `CBRT-YYYY-NNN`, and dates run from 2026.
- **Booking follows the spec.** The customer sees an estimate range, never one number (BR-Q-10/11). Lead-time errors name the earliest valid date (BR-F1-01). The binding price is a separate itemised quotation:
  - lines grouped A–H, each marked FIXED or ESTIMATED, overrides shown with a reason
  - percentages applied in the spec's order
  - deposit, cancellation bands, 7-day validity and version history shown
- **Document control follows the spec.**
  - The "click to cycle status" mechanic is gone. Each document is checked against the travel dates (GREEN / AMBER / RED).
  - A document counts only once a specialist approves it.
  - A hard clearance gate is shown on every operations screen, and Record departure is refused while it is locked.
- **Stall assignment gains placement rules.** Box stall for stallions and aggressive horses, climate stall, no stallion beside a mare, nervous horses away from the ramp. Conflicts are named in words, and payload and groom count (one per three horses, rounded up) are shown.
- **Roles are explicit.** The header splits owner items from operations items, and each step names the role that owns it. Page titles stand alone, with no eyebrow label above them.

## Develop

```bash
./build.sh
```

This concatenates `src/*.js` into `code.js` and runs it against `test/mock-figma.js`, a strict mock of the Plugin API. The mock fails on FILL sizing outside auto layout, unloaded fonts, bad property keys and missing variants. It does not compute layout, so check visual results in Figma. It does flag any empty hug-sized auto-layout frame, because in Figma one keeps a default 100 px box and shifts its siblings.

It then runs `test/consistency.js`, which loads the demo fixtures and fails the build when figures that appear on several screens disagree: the 23-document checklist and its counts, the 18 Oct trip log (the handover counts only saved records), the report-a-problem times and next steps, the CBRT-2026-040 hold (the escort's record written once and quoted verbatim, every delay and countdown derived from the plan), the Animal Health dossier count and the 14 Oct clearance date, every microchip against My horses, and the Q-2026-0188 totals.

## Generated file

Built on 26 Sep 2026 through the Figma MCP connector: https://www.figma.com/design/FDnnrfMqRcLa2LFYvHCBWv

The MCP route runs 37 sequential `use_figma` calls, one per entry in `build-mcp.sh`; the last, `eCanvas`, arranges every frame into the eight labelled rows described in DESIGN.md (one per staff role) and reports any frame that fits no row. Each call must stay under 50,000 characters and runs with no shared state, so each call reloads the variables, styles and components from the file. `./build-mcp.sh` generates the call scripts into `mcp/` (git-ignored) from `src/` and runs them in order against the mock.

Scope: desktop screens only for now. The mobile frames already in the file are kept but not maintained.
