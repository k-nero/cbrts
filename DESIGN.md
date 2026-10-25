---
name: EquiFreight
description: Cross-Border Racehorse Transport System (CBRTS). Navy control surface, gold for the one forward action, status in tone plus word.
colors:
  bg-canvas: "#0C1520"
  bg-sunken: "#09111A"
  bg-input: "#0E1826"
  surface-card: "#111B2C"
  surface-raised: "#15223A"
  surface-muted: "#182538"
  border-default: "#1C2E44"
  border-strong: "#2A4266"
  text-primary: "#EDE9E1"
  text-secondary: "#B3BFCC"
  text-tertiary: "#7A8FA3"
  accent-default: "#C9AA5A"
  accent-hover: "#D6B96B"
  accent-on: "#0C1520"
  accent-text: "#D9BD72"
  accent-soft: "#C9AA5A1F"
  accent-line: "#C9AA5A59"
  status-ok-fg: "#5DC688"
  status-ok-bg: "#5DC6881F"
  status-ok-border: "#5DC68859"
  status-warn-fg: "#FDB47A"
  status-warn-bg: "#FDB47A1F"
  status-warn-border: "#FDB47A61"
  status-bad-fg: "#EF6B6B"
  status-bad-bg: "#EF6B6B1F"
  status-bad-border: "#EF6B6B61"
  status-info-fg: "#7FB0E8"
  status-info-bg: "#7FB0E81F"
  status-info-border: "#7FB0E859"
  stall-standard: "#4A6FA0"
  stall-box: "#4C9068"
  stall-climate: "#C7804F"
  material-brass-light: "#E6CB84"
  material-brass-dark: "#A8863B"
  material-brass-ink: "#2A1F08"
  coat-grey: "#8E949B"
  coat-black: "#202329"
  coat-chestnut: "#7B3F1F"
  coat-bay: "#5B3522"
  overlay-scrim: "#00000066"
  chart-1: "#5B93DB"
  chart-2: "#C7804F"
typography:
  display-xl:
    fontFamily: "Fraunces, Playfair Display, Georgia, serif"
    fontSize: "68px"
    fontWeight: 400
    lineHeight: "72px"
    letterSpacing: "-0.02em"
  display-l:
    fontFamily: "Fraunces, Playfair Display, Georgia, serif"
    fontSize: "44px"
    fontWeight: 400
    lineHeight: "50px"
    letterSpacing: "-0.01em"
  display-m:
    fontFamily: "Fraunces, Playfair Display, Georgia, serif"
    fontSize: "32px"
    fontWeight: 400
    lineHeight: "38px"
    letterSpacing: "-0.005em"
  heading-h3:
    fontFamily: "Fraunces, Playfair Display, Georgia, serif"
    fontSize: "22px"
    fontWeight: 600
    lineHeight: "28px"
    letterSpacing: "normal"
  heading-h4:
    fontFamily: "Fraunces, Playfair Display, Georgia, serif"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: "24px"
    letterSpacing: "normal"
  body-l:
    fontFamily: "Outfit, Inter, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 300
    lineHeight: "28px"
  body-m:
    fontFamily: "Outfit, Inter, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: "24px"
  body-s:
    fontFamily: "Outfit, Inter, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: "20px"
  label-m:
    fontFamily: "Outfit, Inter, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: "20px"
  label-s:
    fontFamily: "Outfit, Inter, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: "18px"
  mono-data-l:
    fontFamily: "DM Mono, Roboto Mono, ui-monospace, monospace"
    fontSize: "28px"
    fontWeight: 500
    lineHeight: "32px"
    letterSpacing: "-0.01em"
  mono-data:
    fontFamily: "DM Mono, Roboto Mono, ui-monospace, monospace"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "20px"
  mono-caption:
    fontFamily: "DM Mono, Roboto Mono, ui-monospace, monospace"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: "16px"
  mono-label:
    fontFamily: "DM Mono, Roboto Mono, ui-monospace, monospace"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: "16px"
    letterSpacing: "0.14em"
  mono-chip:
    fontFamily: "DM Mono, Roboto Mono, ui-monospace, monospace"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: "14px"
    letterSpacing: "0.08em"
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  pill: "999px"
spacing:
  "2": "2px"
  "4": "4px"
  "6": "6px"
  "8": "8px"
  "10": "10px"
  "12": "12px"
  "14": "14px"
  "16": "16px"
  "18": "18px"
  "20": "20px"
  "24": "24px"
  "28": "28px"
  "32": "32px"
  "40": "40px"
  "48": "48px"
  "64": "64px"
  "72": "72px"
  "88": "88px"
  "96": "96px"
  "120": "120px"
components:
  button-primary:
    backgroundColor: "{colors.accent-default}"
    textColor: "{colors.accent-on}"
    typography: "{typography.label-m}"
    rounded: "{rounded.md}"
    padding: "0 18px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
    textColor: "{colors.accent-on}"
  button-primary-sm:
    backgroundColor: "{colors.accent-default}"
    textColor: "{colors.accent-on}"
    typography: "{typography.label-s}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "32px"
  button-secondary:
    textColor: "{colors.text-primary}"
    typography: "{typography.label-m}"
    rounded: "{rounded.md}"
    padding: "0 18px"
    height: "40px"
  button-secondary-hover:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text-primary}"
  button-ghost:
    textColor: "{colors.text-secondary}"
    typography: "{typography.label-m}"
    rounded: "{rounded.md}"
    padding: "0 18px"
    height: "40px"
  button-ghost-hover:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text-primary}"
  button-danger:
    textColor: "{colors.status-bad-fg}"
    typography: "{typography.label-m}"
    rounded: "{rounded.md}"
    padding: "0 18px"
    height: "40px"
  button-danger-hover:
    backgroundColor: "{colors.status-bad-bg}"
    textColor: "{colors.status-bad-fg}"
  chip-neutral:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text-secondary}"
    typography: "{typography.mono-chip}"
    rounded: "{rounded.pill}"
    padding: "5px 9px"
  chip-ok:
    backgroundColor: "{colors.status-ok-bg}"
    textColor: "{colors.status-ok-fg}"
    typography: "{typography.mono-chip}"
    rounded: "{rounded.pill}"
    padding: "5px 9px"
  chip-warn:
    backgroundColor: "{colors.status-warn-bg}"
    textColor: "{colors.status-warn-fg}"
    typography: "{typography.mono-chip}"
    rounded: "{rounded.pill}"
    padding: "5px 9px"
  chip-bad:
    backgroundColor: "{colors.status-bad-bg}"
    textColor: "{colors.status-bad-fg}"
    typography: "{typography.mono-chip}"
    rounded: "{rounded.pill}"
    padding: "5px 9px"
  chip-info:
    backgroundColor: "{colors.status-info-bg}"
    textColor: "{colors.status-info-fg}"
    typography: "{typography.mono-chip}"
    rounded: "{rounded.pill}"
    padding: "5px 9px"
  input:
    backgroundColor: "{colors.bg-input}"
    textColor: "{colors.text-primary}"
    typography: "{typography.body-m}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "44px"
  panel:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.lg}"
    padding: "24px"
  nav-item:
    textColor: "{colors.text-secondary}"
    typography: "{typography.label-s}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
  nav-item-active:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.accent-text}"
    typography: "{typography.label-s}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
  owed-item:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.text-primary}"
    typography: "{typography.label-m}"
    padding: "16px 20px"
  stat-tile:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.text-primary}"
    typography: "{typography.mono-data-l}"
    rounded: "{rounded.lg}"
    padding: "14px 18px"
    width: "168px"
---

# Design System: EquiFreight

## Overview

**Creative North Star: "The Night Dispatch Desk"**

EquiFreight is an operations desk read after dark: a deep navy canvas, cards one step lighter, hairline borders, and a single gold fitting that marks the one thing to do next. Everything else is information, and information is either a name (set in Fraunces, a warm serif that gives places and horses their dignity), prose (Outfit, plain and even), or data (DM Mono, for the values you would copy into a form). The system never decorates; its material flourishes are the brass stall nameplate on a horse's coat colour and, where there is a real picture (the landing, sign in, a horse's own photo), photography treated as a material under a scrim.

Density is moderate and table-like. Pages are 1440 wide with a 1200 content column (120 px gutters). Surfaces are flat, bordered panels at 12 px radius, stacked with 24 to 32 px gaps; depth comes from tonal steps between canvas, sunken wells and cards, not from shadow. Status is always said twice, as a tone and as a word, and every deadline is said twice, as time left and as a date. The newest surface (customer request tracking) is the reference for how pages open: the route or page name as a Fraunces title, the code and summary beneath it in mono and prose, status chips top right, then what the reader owes.

Light is the presented theme (changed 3 Oct 2026 at the teacher's request); Dark stays fully supported. Both are modes of the same `EquiFreight / Color` variable collection. The collection's default mode is still Dark, so every frame, board and cover sets Light explicitly, and a frame's dark copy is the same frame with the Dark mode set and " · Dark" added to its name (Landing, the three Homes, the Quotation, the Clearance checklist and the mobile horses page carry one). Light values live in `.impeccable/design.json` (`colorMeta.<token>.light`). No colour is hard-coded except the horse card's coat band, brass nameplate and white coat label, which are materials and look the same in both themes. The app follows the same rule: Light by default, Dark from the header's theme toggle. Desktop 1440 is the maintained scope. Mobile frames (the mobile app header and "My horses · Mobile" in both modes) exist in the file but are not maintained; do not treat them as reference.

**Key Characteristics:**
- Navy canvas (#0C1520) with card, raised and muted surfaces stepping up in lightness.
- One filled-gold button per view; gold never carries status.
- Status in four tones (ok, warn, bad, info) plus neutral, always with a word.
- Three type voices with fixed jobs: Fraunces for names and headings, Outfit for prose and labels, DM Mono for data.
- Deadlines shown twice; estimates shown as ranges; demo figures marked as demo.
- Flat bordered panels, 12 px corners, hairline dividers; shadow only for overlays, focus and brass.
- 24 px line icons, 1.75 stroke, round caps.

## Colors

A cold navy ground with warm off-white ink, one brass-gold accent, and four desaturated status tones tuned to read on navy.

### Primary
- **Brass Gold** (accent-default): the filled background of the single primary forward action on a view (Upload signed copy, Accept quotation, Request transport, Publish). Also the current wizard step badge, the focused input's border and the brand monogram tile. A checked checkbox, a selected radio and a selected card are a strong neutral (Paper Ink), never gold. Hover is **Polished Gold** (accent-hover); content on gold is **Navy Ink** (accent-on).
- **Gold Ink** (accent-text): gold as text or icon, only for the active nav label, the selected item in a side list, and the drop-target hint on a stall. Links such as "Edit" are Mist, not gold.
- **Gold Wash** (accent-soft) and **Gold Hairline** (accent-line): tinted fill and border for selection only: the load-plan selection bar and a stall drop target. Icon badges and avatars are Muted Navy with Mist ink; completed wizard steps are green (status ok); the estimate card has a plain hairline.

### Neutral
- **Night Navy** (bg-canvas): page background and app header/footer.
- **Deep Well** (bg-sunken): table headers, fact cells, panel footers, staff sidebar.
- **Field Navy** (bg-input): form control fill.
- **Card Navy** (surface-card): panels, cards, list rows.
- **Lifted Navy** (surface-raised): selected or occupied cards, toasts.
- **Muted Navy** (surface-muted): hover fill, neutral chips, active nav pill, progress track.
- **Hairline** (border-default) and **Rule** (border-strong): card borders and dividers; control outlines and emphasised borders.
- **Parchment** (text-primary), **Mist** (text-secondary), **Slate** (text-tertiary): headings and body; supporting copy; captions, labels, placeholders. Light Slate is #5A6A7D so it holds 4.6:1 on the Light Deep Well (the staff sidebar in the Light theme).

### Status
Each tone ships as fg, bg (12% tint) and border (35 to 38% tint).
- **Pasture Green** (status-ok-*): cleared, valid, GREEN, done, sound.
- **Apricot** (status-warn-*, #FDB47A dark, #7F3B00 light): AMBER results (valid today but fails on the travel dates), due soon, quotation waiting, drafts. It is an orange set lighter than the gold, so warnings never read as the forward action. OKLab ΔE from the gold is about 9.6 in dark mode and 9.7 in light (4.3 and 2.2 for the old amber), and about 17 from the red. Contrast is at least 7:1 on every surface. Under simulated deuteranopia and protanopia, orange and gold still sit close (ΔE about 6), so the word on the chip carries the difference, as the Said-Twice rule already requires.
- **Signal Red** (status-bad-*): fails its rule, overdue, departure locked, conflicts.
- **Harbour Blue** (status-info-*): in review, current stage or checkpoint, overrides, the operations role marker.

### Domain colours
- **Stall types**: stall-standard (steel blue), stall-box (green), stall-climate (terracotta), always paired with a type label and icon.
- **Brass** (material-brass-light/dark/ink): the nameplate gradient and its engraved text only.
- **Coats** (coat-grey/black/chestnut/bay): the horse card header, the horse profile's band and the coat swatches on passes and Home. Under a horse photo the coat colour is the base and the scrim colour.
- **Charts** (chart-1 blue, chart-2 terracotta): the two series on the operations overview; validated for colour-vision difference in both modes.
- **Scrim** (overlay-scrim): dialog backdrop.

### Named Rules
**The One Gold Button Rule.** A view has at most one filled gold button, and it is the action that moves the job forward. In a list of owed items only the top item's action is gold; the rest are Secondary. Gold tints (accent-text, accent-soft, accent-line) may mark focus, the active nav item and the brand, but never state or selection. Each shell gives the gold one home. In the owner shell it sits in the page body beside what it acts on (the top owed item, a form's footer, the wizard step) and never in the page header; request lists have no gold at all, because each row opens its request (a chevron at the row's end). The signed-out landing's hero is the one exception. The signed-in Home follows the owed-items rule: its first block is "You owe N items" across every request, and the top item's action is the gold. In the staff shell it sits in the decision, issue, draft or composer panel; page headers carry status, never gold. A catalog's header shows a Warn draft chip, and the draft panel at the top of the catalog holds Discard draft and the gold Publish. Around the one gold button nothing else is gold: composer boxes, filled note fields and selected cards take the control border (Border strong), and only the field being typed in takes the 1.5 px gold focus border.

**The Gold Is Not a Status Rule.** Nothing that describes the state of a document, stage, horse or job is gold. State uses ok, warn, bad, info or neutral.

**The Said-Twice Rule.** Status is a tone plus a word ("Departure locked", "Cleared", "Waiting for you"); a coloured dot or border alone never carries meaning.

## Typography

**Display Font:** Fraunces (with Playfair Display, then Inter)
**Body Font:** Outfit (with Inter)
**Label/Mono Font:** DM Mono (with Roboto Mono, then Inter)

**Character:** Fraunces gives routes, horses and headings a quiet, engraved gravity; Outfit keeps prose and controls plain; DM Mono makes every copyable value (codes, dates, times, counts, distances) look like a record entry.

### Hierarchy
- **Display XL** (Fraunces 400, 68/72, -2%): home hero headline only.
- **Display L** (Fraunces 400, 44/50, -1%): page titles; on tracking pages the route itself ("Ho Chi Minh City → Phnom Penh").
- **Display M** (Fraunces 400, 32/38): headline money figures (estimate ranges, quote totals) and doc headings.
- **Heading H3** (Fraunces 600, 22/28): panel leads ("You owe 4 items"), card titles, gate titles.
- **Heading H4** (Fraunces 400, 18/24): panel titles, horse names in rows and stalls, stop names.
- **Body L / M / S** (Outfit 300 18/28, 400 15/24, 400 13/20): intro copy, page summaries, reasons and details. Summaries run at 540 to 760 px wide.
- **Label M / S** (Outfit 500, 14/20, 13/18): button labels, row titles, people ("Lan, transport specialist"), "Due in 4 days" lines.
- **Mono Data L** (DM Mono 500, 28/32): stat tile values.
- **Mono Data / Caption** (DM Mono 400, 14/20, 12/16): job codes, dates, times, counts, distances, versions, history timestamps.
- **Mono Label** (DM Mono 400, 12/16, +14%, uppercase; the Figma style is named `Mono/Eyebrow`): table column headers and route-stop kinds only. It labels data; it never sits above a heading. Fact labels (the label half of a fact cell, stat tile captions, request summary labels, horse card facts) are sentence case in Outfit Body S at text-secondary or text-tertiary, never uppercase mono.
- **Mono Chip** (DM Mono 500, 12/14, +8%, uppercase): chip labels. 12 px, not 11, so capitalised mono stays legible at chip size.

### Named Rules
**The Three Voices Rule.** Fraunces for places, horse names and headings. Outfit for prose, people's names and labels. DM Mono for codes, dates, times, counts and distances. The two small uppercase mono styles (Mono Label, Mono Chip) are the only mono text that carries words, and only as tags on data. A value row puts a name in Label S and a code or distance in Mono Data (Vehicle "Trailer TX-447" mono; Driver "Minh" Outfit).

**The Two-Line Deadline Rule.** Every deadline is shown twice: time left first (Label S, toned by urgency: "Overdue by 1 day", "Due in 4 days"), then the date beneath it (Mono Caption, text-tertiary: "30 Sep 2026"), right-aligned.

## Layout

Screens are 1440 wide. Owner shell: app header (64 px), then a content column with 120 px side padding (1200 px content), blocks stacked 28 px apart, 96 px bottom padding, then the Full footer; the home page alone uses 80 px section tops. Staff shell: a 248 px sunken sidebar, a top bar with the breadcrumb, then content with 40 px side padding, the same 28 px block gap and 96 px bottom padding. The escort cab surface has neither: cab bar, route strip, task and dock.

**One page header.** Every owner and staff page opens with the same header (`pageHeader` in the plugin): an optional Ghost back link, an optional banner (the horse's coat band), then a title row with the Fraunces Display L title on the left and status on the right, bottom-aligned, and a bottom hairline. Beneath the title sits either a meta line (the code in Mono Data, the summary in Body M, then chips) or a summary paragraph up to 640 px. Top padding is 32 px in the owner shell and 28 px in the staff shell. In the owner shell a header without a back link reserves the back row (46 px), so every owner title's top lands at y 142. The staff shell has no back links, because the top bar's breadcrumb is the way back; its title is Display M (32/38) and its top lands at y 97, so the work starts higher. The status slot is left out when it is empty, never drawn as an empty box. Job pages drop the hairline because the gate and job tabs follow in the header, and list pages drop it when status tabs follow, since the tabs draw their own line.

**The pass header.** A customer page about an approved move (documents, trip, handover, invoice, a report, a re-route) opens on the move's travel pass instead of the plain header, under the same back link: the REQ and CBRT codes (and the invoice code on the invoice) with the stage mark and status chips on the top row, the two cities as the title in Display M with their codes above and the mode icon between, a hairline, then the facts that matter (departs, the horses as overlapping coat swatches with a count, border, trailer, arrival window), a perforation, and a sunken stub that says the one thing that matters on that page ("Departs in 22 days", "Arrives in about 4 h", "Delivered 12:41", "Amount due $4,789.61", "Confirm handover by 26 Sep"). The perforation is always shorter than the pass so the pass hugs its content. Pages before approval (in review, info required, the quotation, My requests, the document upload pages that carry their own document header) keep the plain header: there is no pass until the move is approved.

**Two side widths.** A two-column row pairs a fluid left column with a fixed right column of exactly 400 px (narrow: decisions, forms, facts, versions, people) or 456 px (wide: the tracking route panel and condition log), always at a 24 px gap. The one left column is the 240 px journey rail on a job page whose job travels as a chain of trips (see Job page). No other side width is used. Panels pad 24 px (20 px for owed-panel heads); rows inside panels pad 10 to 16 px vertically and separate with top hairlines rather than gaps.

Spacing uses the `space/*` scale (2 to 120). Most-used steps: 8 and 12 inside controls, 16 and 20 inside rows, 24 for panel padding and column gaps, 28 and 32 between page blocks.

## Elevation & Depth

Flat by default. Depth is tonal: canvas, then sunken wells below it, then card, raised and muted surfaces above it, each bordered with a hairline. Shadows exist as four effect styles and appear only where something truly floats or is a physical material.

### Shadow Vocabulary
- **Elevation/1 Card** (`box-shadow: 0 10px 28px -14px rgba(0,0,0,0.28)`): the home hero's live job card only.
- **Elevation/2 Overlay** (`box-shadow: 0 24px 56px -16px rgba(0,0,0,0.45)`): toasts and other overlays.
- **Focus/Ring** (`box-shadow: 0 0 0 3px rgba(201,170,90,0.45)`): focused controls, with a 1.5 px gold border.
- **Material/Brass** (`box-shadow: inset 0 -1px 0 rgba(0,0,0,0.35), 0 2px 6px rgba(0,0,0,0.45)`): the nameplate only.

### Named Rules
**The Flat Panel Rule.** Panels, rows and cards carry a 1 px border and no shadow. If something needs to stand out, give it a surface step or a tone, not a drop shadow.

## Shapes

Gently rounded and consistent: 8 px (radius/md) for buttons, inputs, nav pills, icon badges, stall tiles and callouts; 12 px (radius/lg) for panels, cards, stat tiles and gates; 16 px (radius/xl) for documentation blocks and the hero card; 4 px (radius/sm) for checkboxes and the brass nameplate; full pill for chips, avatars and stage/route markers. Rows inside a panel are square and separated by 1 px hairlines. Dashed borders mean "a place something can go" (empty and target stalls). Markers on the stage track and route are circles; the clearance gate is a lock inside a circle.

## Components

### Buttons
Quiet and outlined, with one gold exception.
- **Shape:** 8 px radius; MD 40 px tall with 18 px side padding (Label M), SM 32 px with 12 px (Label S); optional 16/14 px leading and trailing icons.
- **Primary:** Brass Gold fill with Navy Ink label; hover Polished Gold. One per view.
- **Secondary:** transparent with a Rule border and Parchment label; hover fills Muted Navy.
- **Ghost:** no border, Mist label; hover fills Muted Navy and lifts the label to Parchment. Used for back links, "Show all" and history.
- **Danger:** outlined in the bad border with a red label, never filled, so it cannot read as primary; hover takes the bad tint.
- **Disabled:** 45% opacity. A refused action (Record departure while locked) stays visible, disabled, with the reason next to it. An action that is unavailable because something upstream is missing (Grant override before a reason, Issue quotation while rates are missing) is drawn as a disabled Secondary, not a faded gold, so a view never shows a brown button that reads as the next step.

### Chips
- **Style:** pill, 5/9 px padding, tinted bg plus matching border, a 6 px dot and an uppercase Mono Chip label in the tone's fg.
- **Stage mark:** a stage is a position, not a state, so it is words, never a chip: the stage name in Label S (Parchment) and its position in Mono Caption (Slate), "Documents 4 of 7". Chips are kept for state (Held, Invited, Changed, Departure locked). Urgency belongs to owed items, deadlines and "what holds it".
- **Tones:** Neutral, Ok, Warn, Bad, Info. There is no gold chip. "Current" and "Now" markers (the live catalog or quotation version, the cancellation band that applies today) are Info. Certainty tags on quote lines drop the dot. Stat tiles take the same five tones; progress bars take Neutral (Slate fill, for a plain proportion such as payload), Ok, Warn and Bad.

### Cards / Containers
- **Corner Style:** 12 px.
- **Background:** Card Navy on Night Navy; Deep Well for table headers, fact cells and panel footers.
- **Shadow Strategy:** none (see Elevation).
- **Border:** 1 px Hairline; selected cards take a 1.5 px Mist (text-secondary) border on Lifted Navy, and the radio or checkbox inside is Paper Ink.
- **Meta line:** words in Outfit Label S ("Answered by Lan", "In the estimate"); a figure such as a price delta in DM Mono. Both at text-secondary, because on the Service step the effect on the estimate is the point of the card.
- **Internal Padding:** 24 px panels, 20 px cards, 14 to 16 px rows.

### Inputs / Fields
- **Style:** Label S label above, 44 px control on Field Navy with a Rule border and 8 px radius, helper text below in Body S.
- **Focus:** 1.5 px gold border plus the Focus/Ring.
- **Error / Disabled:** red border and a red helper with an alert icon that names the rule and the fix ("The earliest departure is 17 Oct 2026"); disabled at 50% opacity.

### Navigation
- **App header (owner portal):** 64 px on Night Navy with a bottom hairline; brand (gold "Eq" italic monogram tile plus Fraunces wordmark), then customer items only: Home · My horses · My requests. On the right, a Secondary "Request transport" button, the notification bell, the theme toggle and the account chip. The request wizard and the quotation highlight My requests. Staff tools never appear here.
- **Footer (owner portal and access pages):** one component, two sizes; staff pages and the escort cab surface have none (the sidebar and the cab dock hold help and the way to a person). Full, after the owner page's 96 px bottom padding: a top band with the brand and the formal name, two link columns (Help: Help, How pricing works, Document rules by country; Legal: Terms of service, Privacy) and, at the right, the operations desk under "Horse on the road? Call the operations desk": the phone in Mono Data L, the email in Mono Data, "Staffed 24 hours, every day" in Body S. A club reads the footer when the page didn't answer them, and while a horse is on the road the useful answer is a person, so the desk is the footer's one prominent item. Then a hairline and a bottom band: "© 2026 EquiFreight" and the demo note. Compact, on the 900 px access pages: one row with the copyright, Terms and Privacy, the desk's phone, and the demo note (Help stays in the access top bar, said once). No gold. The demo note's As of property carries the screen's own date, never a default. The phone is a placeholder (+84 28 0000 0000) and the link targets are not drawn yet.
- **Nav item:** Label S in Mist; active is a Muted Navy pill with a Gold Ink label.
- **Tabs:** Label M, active in Parchment with a 2 px gold underline; counts inline ("Active · 3").
- **Notification centre (US-00-07):** a feed of things that happened, not a to-do list: the sidebar badges still count each queue, and the bell's count drops when you read, not when the work is done.
  - **Bell:** a 36 px tool with a Rule border and the bell icon, like the theme toggle (`IconButton`). It sits before the theme toggle: in the owner header after Request transport, in the staff top bar after the date. The escort cab surface has none. The unread count is a strong neutral pill (Paper Ink fill, canvas ink, Mono Caption) over the top-right corner, never gold or a status tone, because it says how many, not how bad. It hides at 0, reads 99+ above 99, and the button's accessible name says what it counts ("Notifications, 3 unread"). The count is live: each tab holds one server-sent event stream and refetches when it says something changed.
  - **Panel:** a popover under the bell, 400 wide, no arrow. Head: "Notifications" in H4 and a Ghost SM "Mark all as read" (disabled with nothing unread), then Tabs Unread · n / All; it opens on Unread when something is unread. Up to 8 rows, scrolling past 440 px, separated by hairlines. Foot: a Ghost "See all notifications" opening the page.
  - **Row (`NotificationItem`):** a link to the record. A dot, the title in Label M, the body in Body S clamped to two lines, then the kind as a chip (tone plus a word: Answer needed, Quotation ready, Trip held), the record's code in Mono Caption and "12 min ago" with the exact time in a tooltip. Unread rows sit on the raised surface with a Paper Ink dot and a Parchment title (and "Unread" for screen readers); read rows are flat with a Mist title. Opening a row marks it read.
  - **Empty:** a muted bell, "You're all caught up" (Unread) or "No notifications yet" (All), and one line saying what shows here.
  - **Page (Notifications, `/notifications` and `/staff/notifications`):** the list-table kit with no search: the page header with a Secondary "Mark all as read", Tabs Unread · n / All, the count line ("3 unread notifications · Order: newest first", not sortable), then the table. Columns: Notice (dot, title, full body), Kind (chip), Record (code in Mono Data), Received ("3 h ago" over the date and time), and a Ghost "Mark as read" on unread rows ("Read 23 Oct, 14:10" on read ones). Unread rows are raised; a row opens its record and marks it read. There is no Figma frame yet; this entry is the reference until one is drawn.
- **Staff sidebar:** one shell for every staff role, listing the work the signed-in role owns rather than the system's tables. Logistics Manager: Overview, Requests (the review queue and quotations), Jobs, Incidents, Customer notes (every note, since dates, price and changes are theirs to answer), Invoices, then an Admin section with Users & roles and the Audit log. Transport Specialist: Jobs, Documents (waiting for her check), Authorities, Customer notes, then a Catalogs section (Regulations, Rates). Fleet & Route Coordinator: Jobs, Trip progress, Fleet calendar, Vehicles, Customer notes (the notes about the trip). The escort (driver, grooms) has no sidebar; they work on the cab surface. From the top: the brand, with the signed-in role as a neutral tag on its own line beneath it ("Logistics manager", "Transport specialist", "Fleet & route coordinator"), so the items below explain themselves; a "Jump to a job or request" field (⌘K), the role's items, sections below them, a Recent list of three codes (code in DM Mono, route in Outfit), and the user button (avatar, name, chevron; the role is already the tag at the top, so it isn't said twice) that opens the user menu: Profile, Theme, Help, Sign out. A section takes a label (Outfit Body S, sentence case, Slate) only when it holds more than one item; there are no uppercase group eyebrows. Items are 36 px rows with icon and label, states Default, Hover (Muted Navy fill, Parchment label), Active (Muted Navy fill, Gold Ink icon and label, aria-current) and Focus (1.5 px gold border and Focus/Ring). A badge only counts items where this person owns the next step, uses the page's own number (4 awaiting review, Needs me · 1, 2 due today, 3 changes to publish, 2 missing), opens that filtered list, hides at 0, reads 99+ above 99, and has an accessible name that says what it counts. One name per place: the active item's label is the first breadcrumb segment and the page title (Overview, Requests, Incidents, Customer notes), and the breadcrumb never starts at a non-destination root. The sidebar is sticky at viewport height (900 in the frames), so the user button stays pinned at its foot however long the page.
- **Job page:** every tab of a job shares one header: the breadcrumb (Jobs / code / tab) as the way back, the route as the Fraunces title, the code in mono with a prose summary, the stage mark, the clearance gate, then tabs (Clearance · Authorities · Load plan · Route) with the tab's owner named on the right ("Owner Lan, transport specialist"). A job that travels as a chain of trips (road, flight, road; US-F3-16) puts a **journey rail** to the left of the tabs, 240 px at a 24 px gap, sticky under the gate: a Mono Label head ("Journey · 3 trips"), then one row per trip in order, each with its mode icon (truck or plane), "1 · Road" in Label S, the status in Mono Label on the right, the corridor in Mono Data and the trip code with its departure in Mono Caption. The trip the tabs plan is the Nav item's active pill (Muted Navy, Gold Ink label); the others are plain rows that take the muted fill on hover. A job split only by an incident keeps the info callout naming its parts. There is no Trip tab: the Route tab ends with closing the job, the job's incidents and the delay alert, and the journey as the cab records it is the Trip progress page.
- **Route editor (Route tab, US-F3-17):** the coordinator plans the trip's route in place: "Plan the route" on a trip with none (a pickup at the job's origin and a delivery at its destination to start from), "Edit route" on a confirmed one. The editor is one panel: each stop a hairline card (its number in Mono Label, Stop kind, Place or Crossing, Planned at, Stay, Details, then move up, move down and remove as icon buttons), and between two stops the leg, indented under a 2 px rule (Road or Air, distance, time, and "Add a stop here" as a Ghost); an air leg opens its flight (airline, flight number, stall positions, departs, arrives). A reason field appears when a confirmed version will be superseded. Saving keeps a draft; a Warn callout over the timeline then says the trip still runs on the confirmed version, with the gold "Confirm draft vN" and a Secondary "Edit draft". The server's refusals are shown in its words.
- **Trip progress (office side of Flow 4):** what the cab records, read against the route plan, for Khôi while the horses are on the road. Four stat tiles (against plan at the last checkpoint, time on the trailer since loading, the next checkpoint, horses sound at the last check), then a full-width table of checkpoints with planned time, recorded time and who recorded it, the difference, and a status chip in tone plus word (Departed, Cleared, Next, Upcoming). Below it, the escort's log beside the horses on board (each with the Sound / Watch / Concern word the groom picked), crew and vehicle, and how a stop becomes an incident. Positions come only from recorded checkpoints, never an estimate, and the page quotes what the customer sees. It has no gold: while a trip runs to plan the office has nothing to move forward; Raise an incident and Call the cab are Secondary.
- **Jobs list:** one row per job: code, route with horses and service, stage mark, departure as a two-line deadline, and "What holds it" in words (toned) with the next step and its owner beneath. Default order blocked first, then by departure; filter tabs All · Needs me · Blocked · In transit, a Search (code, customer or route) and a Mode filter. Job, Stage and Departure sort (see Tables); a Departure sort is drawn as Logistics manager · Jobs · Sorted.

### Owed Item (signature)
One thing the customer owes, as a full-width row in the "You owe" panel: a 36 px toned icon tile, then title (Label M), subject (Label S, tertiary) and reason (Body S) naming the rule or who asked and why, then a two-line deadline, then the action. Urgency drives the tone: Overdue (bad), Soon (warn), Upcoming (neutral), Done (ok). Items sort by deadline, overdue first; only the top item's button is gold. When nothing is owed, the panel becomes "Nothing needed from you" with a green check, the next owner and step, and a two-line due date.

### Stage Row and Route Stop (signature)
The stage track lists seven stages (Request to Handover) with 28 px circular markers: Done (green check), Current (info ring with number), Upcoming (outlined number), Blocked (red lock). Done runs collapse into one row and later stages into a "Then ..." summary. Each row names who does what next and ends in a two-line deadline. The route is schematic: circular stops joined by 2 px legs that turn green only between confirmed checkpoints; positions come from recorded checkpoints only, never interpolation. The clearance gate sits on the route as a lock marker.

### Clearance Gate
Full-width bad or ok tinted band with a lock or unlock icon, a Heading H3 title ("Departure locked" / "Clear to depart"), what is outstanding, and a Secondary action. Shown on every operations screen.

### Nameplate and Horse Card
The horse's identity is an engraved brass plate (Heading H3 name in brass ink, gradient fill, two screws, Material/Brass shadow) set on a 148 px band of the horse's coat colour. The card below carries tags, mono fact cells, a readiness bar and actions.

### Estimate and Quote Line
The estimate card has a plain hairline and opens with an "Indicative range" label (Label M, Mist), then the range in Display M, a notice that it is not a quote, and its drivers in mono. Quote lines show description, basis, quantity, rate and amount in mono, with a Fixed, Estimated (amber, with why it may vary) or Overridden (info, with reason and the struck-through catalog value) tag.

- **Request review (staff):** the logistics manager's feasibility page. The header shows the route title, the REQ code and the customer, a stage mark, and the review deadline stated twice. On the left are five checks (route served, lead time, blackout, capacity, horses), each a toned word chip plus its evidence, with hand-offs shown in the row ("Asked Khôi to confirm · waiting"). Below them is what the customer sent, at a version. On the right is the decision panel: the outcome the checks point to is open inline with its required note or reason, and it holds the one gold action; the other outcomes stay reachable, with any failing check named beside them. An express override is an outcome of its own, and its gold action stays disabled until a reason is written.
- **Info required (customer):** the manager's note becomes the single owed item. Its deadline comes from the lead-time rule. The customer answers in place with the manager's options as radio cards on the owed item; the gold "Continue with this answer" opens the request prefilled with that answer. The owed item itself has no button, because it is answered right below. "Withdraw request" is a Ghost in the owed panel's sunken footer, never in the action slot. Between the options and Continue, a sunken **What this answer changes** box shows the chosen answer's effect before it is sent: a route map with the dropped leg and crossing faint and dashed ("Not needed", "Not crossed") and the new pickup marked, beside before → after rows (old value struck through in text-tertiary, new value in Label S): pickup, border crossings, distance, estimate. The side column is the request's pass with a Warn "Needs your answer" chip and version 1's values (its stub says it updates on version 2), then the versions panel that promises v1 is kept. The header shows "Version 1 · returned 28 Sep 2026".
- **Quotation builder (staff):** the same ledger and Quote line rows as the customer's quotation, so both sides read one document. Quantities show their derivation, and percentage rows name their base. Overriding a line opens an editor inline under the line (catalog value struck through, new amount, required reason); the total is never typed. The issue panel on the right holds the total, the deposit, validity stated twice, the pinned currency, a readiness chip ("Ready" or "Waiting on rates"), and the one gold "Issue quotation". A line without a rate reads "No rate" in the bad tone, and its group subtotal shows "—". A missing rate blocks issuing: the issue button becomes a disabled Secondary, the reason is named, and a missing-rates panel names the catalog owner. A re-issue shows "Changed since" the previous version.
- **Quotation page:** built on the tracking page model, not as a bare ledger. The route is the title, with only the originating REQ and the Q code and version beneath (the quoted pass carries the horses, mode and departure). Accept or decline is the single owed item: gold Accept, Secondary Decline, and a two-line validity deadline. The side column shows the quote against the customer's estimate range (Inside or Outside your range, and the largest line), then the three steps after accepting, then who prepared it with an "Ask … about a line" action, then cancellation, stall sizing and versions. Above the ledger, **Where the money goes**: one row per ledger group plus one for fees, fuel and cover (everything added after the subtotal, less the volume break), largest first. Each row has the group's letter badge (the same as in the ledger), its name, a single-hue bar on a muted track (text-secondary on surface-muted, 220 wide, 4 px rounded), the amount in Mono Data and the share in Mono Caption ("<1%" under one percent). The head names the largest share in words ("Air freight is 47% of the total"). It is one series, so it has no legend. The ledger itself is unchanged. The volume break appears as its own line in the fixed calculation order, and every total is computed from the lines.
- **Document upload (customer):** one page per required document. The rule is written out in words with the date that passes ("sampled on 19 Aug or later"), above the three answers the automatic check can give today: Passes, Expires in transit (kept, won't clear), Refused (not saved). The result sits directly under the upload fields as a callout that states the value found, the limit and the earliest value that passes. A refused file gets the one gold "Choose another file" beside its deadline, stated twice; a passing file has no gold because nothing more is owed. The versions panel lists every version and every refused attempt, and says who reviews next.
- **All documents (customer) and Clearance checklist (staff):** one document table on both sides, built from the same rows: every checklist item grouped by horse and then the shipment, each group head counting "n of m cleared". Each row has a status chip in words, the rule in words (Outfit, not mono), who holds it, a two-line due or done date and an open chevron. Holder wording is the only thing that changes with the viewer: the owner reads "With you", staff read "With the customer"; "With the vet authority" and "Cleared by Lan" read the same on both. The summary above it ("All 23 documents", the progress bar and the holder counts) and the filter tabs (All · With you or With the customer · With the authorities · Cleared) are shared too; only rows the owner must act on use the primary text colour for their holder. The staff checklist adds the planned departure field beside the summary.
- **Document review (staff):** the uploaded file on the left as a drawn paper, always rendered in Light mode because it is a picture of paper; the decision column on the right, fixed at about 400. The column reads top to bottom: the automatic check (tone and word), "Your checks" (what only a person can confirm, one checkbox each, a failing one in the bad tone with the reason), the decision, and the same versions list the customer sees. Approve is gold and is only enabled when every check is ticked, and it states its effect on the gate ("15 of 23 cleared"). Opening Reject moves the gold to "Reject and notify customer"; the reason is required and shown to the customer verbatim, with the new version's due date stated twice. A missing signature is marked on the paper with a dashed bad-tone box and a "Not signed" chip.
- **Authorities tab (staff):** one dossier card per authority on the route, stacked by what needs the specialist first (overdue, ready to file, with an authority, not ready, approved). A card's head has the authority, its status in words and the expected response stated twice; a sunken facts strip holds the reference, filing date and contents in mono. A card can be filed only when its own documents are cleared; until then it lists what it is waiting on and who holds each item. Recording a submission opens inline in the card (authority, date, reference, expected response prefilled from the catalog, documents included) with the gold "Record submission". An overdue card takes a bad-tone border, states what it puts at risk (the last day that keeps the departure), shows the follow-up log and that the logistics manager was alerted, and carries the gold "Log a follow-up". Quarantine sits below as its own panel, stated against the destination's minimum.
- **Escort cab surface (Trip):** not the office job page. The escort uses a tablet in a sunlit cab, often gloved, between tasks, so the surface is always Light, even for someone who picked Dark (chosen by the use scene: glare), one cab bar (job code, route, stage mark, the state that matters now, sync state, the time at 28 px, who), the route as four large stop cells with times at 28 px, the task first, and one dock at the bottom edge with a summary of what will be saved and the 64-high gold action. No sidebar, breadcrumb or job tabs. Toggles and condition segments are at least 48 px, and a ticked toggle is the same strong neutral box as the Checkbox (green is kept for facts that are done); the welfare stop has an "All sound · drinking · eating" shortcut so only exceptions are changed. Held has its own state: its stop cell and the chip share the Bad tone, the escort sees that Yến was alerted at the moment of saving, the time on the trailer against the 6-hour rule, and what to do while waiting; there is no gold until Yến decides. Records are saved on the tablet first and the bar says when any are waiting to send.
- **Handover (escort) and closed record (customer):** delivery is recorded once on the escort's cab surface: each horse's condition on arrival (same rows as a welfare stop, without the ticks), what was handed over, and the receiver's name with an on-tablet signature; the gold button names the time it records. The customer's confirmation has a stated default ("If you don't reply by 20 Oct, the handover is taken as accepted"), shown on both sides. A closed request keeps the tracking page model but reads as a record: stage "Handover · 7 of 7" with an Ok "Closed" chip, a lead block with nothing owed and no gold (a Secondary "Download the record"), a facts strip, the arrival condition with who received and who confirmed, the route as recorded, the documents kept, and the full history.
- **Incident (staff) and Report a problem (customer):** the logistics manager owns every incident. The page header carries a Bad "Held" or "Open" chip and a running clock stated twice (held for / since, reply in / by). Facts come first, quoted from whoever recorded them; when two records disagree, a Warn callout names the mismatch and says the page doesn't decide fault. Choices are option rows that show their cost side by side (arrival, documents, the horse), with warn-toned values where a choice costs something; the selected option opens a decision composer listing what will happen, the message to the customer (required, sent as written) and the one gold action. The right column holds the clock that matters (time on the trailer, unload by), the people involved and a short timeline. The customer's report form picks the horse with option cards, names the kind of problem (injury and illness promise the same vet response; nothing reads as the lower priority), takes a description and photos, offers "Call the duty line" for what can't wait, and says upfront that the handover default is paused and when Yến will reply. The escort's condition record is shown on the staff side only, beside the customer's report; the customer's form doesn't answer their report with a "Sound" record. A quoted record is always verbatim, with its original time and author, from the one stored record.
- **Request wizard order:** Horses → Route & dates → Service → Review. The route comes before the service because distance, border crossings and whether any air service exists depend on it, and they decide the service choices and their prices. The Review summary reads in the same order.
- **Draft pass (wizard side column):** the request drawn as the pass it becomes once approved, so the customer watches it fill in (400 wide, the pass's 16 radius, Card elevation). "Your move" with a Draft chip; the two city codes in Mono Data L with the road between them (until the route is set, "···" over From and To in text-tertiary and a faint leg); then fact rows (Horses as coat swatches, Departs, Arrival, Borders, Service), each value either set or "Set on step N" in text-tertiary. A value the step got wrong takes the bad tone in the pass too ("5 Oct · too soon"). A horizontal perforation, then the sunken stub: Indicative range in Display M (an em dash until the route is set) and one line saying what the range assumes ("Assumes road with a shared load until you choose a service on step 3"; on Review, "Once you approve the quotation, this becomes your travel pass"). It replaces the Estimate card on these pages; the component stays in the library, but no screen uses it now.
- **Request · Horses step (customer):** each horse is a pick card (Option card's selected look: strong neutral border on surface-raised, a checkbox) with a 48 px coat swatch, or her photo when she has one, her name in Heading H4, breed, sex and age, then size class and weight in mono and her temperament chips (wrapping). When picking a horse changes the plan for another, the card says so in the warn tone ("Never next to a mare: with Nightfall on board, the load plan keeps them apart").
- **Request · Route & dates step (customer), route:** under From and To, the route as a map (`jobMap`, 776 × 280): the road dotted as planned, the pickup, any city it passes and the destination as stops, each border crossing a flag gate labelled Border 1, Border 2, and each national border only a short tick through its gate so no line runs through a label. Under it one line: the distance and crossings, and that the fleet coordinator plans the exact road after approval.
- **Request · Route & dates step (customer), a route we don't run:** the customer may name any city, but only a corridor in the catalog can be estimated or quoted. When From → To matches none, the To field's helper says "Outside the region we run", a Warn callout names the route and the region in words, and the map becomes a schematic line showing where our road ends (the road we run dotted, the rest dashed and faint, with its own two-item legend). Below it: the nearest route we run with a Secondary "Use this route", and an "Ask us about this route" panel that sends a note to the logistics manager (one business day; the draft stays saved). Dates and arrival wait; Continue is disabled with the reason beside it. The draft pass shows the two city codes, Borders "Not run yet" in the warn tone, and no range. Frame: Request · 2 Route & dates · Not run.
- **Request · Service step (customer):** each group (mode, trailer, insurance) is a row of option cards whose Meta line states the effect on the estimate: "In the estimate", a range delta ("+ $2,400 – $3,300"), an exact figure only when it is a percentage of declared value ("+ $4,875"), or, for a disabled card, why it isn't available and the nearest alternative. Things set by a horse's profile (stalls) or by a rule (grooms, one per three horses) are rows, not choices, with a lock or a fixed tick and the rule in words. The draft pass is the same object on every step and never shows a single price. On this step the Trailer group notes that an arrival window (step 2) books a private trailer.
- **Request · Route & dates step (customer), arrival:** below the dates, an Arrival group of two radio option cards: Any time on the day (In the estimate; the ±3 days checkbox stays) and Within a window (its Meta is the range delta in mono). Choosing a window replaces the ±3 days checkbox with Arrive on, From and Until fields (a helper names the window's length) and an Info callout that states the penalty and when the clock stops, in the customer's words ("If we arrive after 12:00, we pay"). The draft pass's range includes the window, and its stub says so. The window then travels with the job: the Route plan's summary strip carries it and the delivery stop says how much of it the plan leaves spare; Trip progress gives it a stat tile and puts it on the delivery row; the customer's In transit stage row says the horses are planned to arrive inside it. The Rate catalog's policy panel holds the surcharge and the late-arrival penalty.
- **Invoices (logistics manager):** a staff list page with four stat tiles where the sums are the point (Outstanding, Overdue in the bad tone, Due this week in warn, Received this month in ok; values in Mono Data L), then the list-table kit: tabs All / To be paid / Overdue / Paid, Search and a Kind select, "Order: overdue first, then by due date". Columns: Invoice (code over kind and the job or quotation it bills), Club (with "After handover" or "On acceptance"), Issued, Due (two lines, the date in the bad tone when overdue, with "8 days overdue", "Due today", "In 5 days" or "Paid 2 Oct" beneath), Total, Amount due, Status chip (Overdue bad, Partly paid warn, Issued neutral, Paid ok). Sidebar item Invoices (receipt icon) with a badge counting invoices overdue or part paid; only the logistics manager has it.
- **Invoices · Record payment:** the same list beside a 400-wide panel for the selected row (highlighted). With the panel open the table drops the Club column and the club leads the invoice cell. The panel: "Record a payment" with the invoice code, then the sums (job, invoice total, the deposit paid with its invoice code as a negative, a hairline, Amount due in Mono Data L, the due date), four fields (Amount received prefilled with the amount due and a helper saying less leaves it Partly paid, Method, Bank reference, Received on), an Ok callout that says what saving does ("becomes Paid, the club gets a receipt by email, the job can close"), the one gold Record payment and a Ghost Cancel, and a line saying a recorded payment is never edited, only reversed with a refund entry.
- **Invoice (customer, Tracking · Invoice):** the final invoice on the tracking page model. The header carries the INV code in mono, the stage mark (Handover) and a Warn Payment due chip; the one owed item is Pay the final invoice, whose gold action is Download invoice (PDF). The ledger is the quotation's: grouped A–H with group subtotals, each line tagged As quoted (Neutral) or Actual (Info); an actual line sits on the raised surface with its reason under it in the customer's words ("Quoted 2 × $95.00 = $190.00. The queue … took 36 min, billed as 1 started hour."). Totals follow the quotation's fixed order on the actual quantities, then Invoice total, minus the deposit with its invoice code, then Amount due in Display M. The side column says how the invoice compares with the quotation, whether the arrival window was kept (a missed window adds a credit line), how to pay (bank transfer with the invoice code as reference; placeholder details are labelled as such), and every invoice for the move with Paid or Due chips. An issued invoice is never edited: it is voided and replaced, or corrected by a credit note.
- **Route history (customer, Tracking · Re-routed):** when a move is re-planned, the route panel heads the current plan with its version ("Route · version 2") and lists it in full from recorded checkpoints; below a divider, Earlier plans shows each replaced version, newest first, on the sunken surface with a Neutral Replaced chip, who replaced it, when, and why in plain words, then its stops (all unvisited rings), with a Ghost toggle to hide it. The page leads with nothing owed and the new arrival, quotes the manager's message verbatim, and says what changes for the customer (arrival, price, documents). Drafts never reach the customer.
- **Home (signed in):** the club's work, not marketing. The club name as the title with one summary line (requests, horses, the next departure and whether it is locked); then "You owe N items" across every request, soonest first, with the one gold action on the top item and each item naming its request code; then "Your moves" (one row per request: route, codes, stage mark, what holds it in tone and words, the departure as a two-line deadline) beside "Your horses" (coat swatch, name, breed line, documents cleared, and the one thing a horse is waiting on).
- **Landing (public):** the only marketing page, with its own header (brand, Help, Sign in) and no nav. It opens on a full-bleed photographic hero (720 tall): the headline, summary and the gold Request transport sit on a navy scrim on the left, and the photograph (a horse being loaded at dawn) carries the right half. Below it, **Every move, on one pass** introduces the travel pass (see below) beside three plain points. Then the services table (service, scope, what drives the price; no price figures), **Where we move horses** (the route map beside the list of corridors), the seven stages, the three feature cards, and a closing band that repeats the gold Request transport 2,000 px below the hero. No job, horse or customer appears on the page (PRODUCT.md, Absences): the pass is labelled Example and its codes are city codes. The brand in every shell (owner header, staff sidebar, access pages) opens this page, so a signed-in visitor can reach it too: their header shows a Secondary "Go to my workspace" in place of Sign in, Create a club account is hidden, and Request transport opens their home.
- **Photography:** a photo is a material, like the brass nameplate, so a photo panel is always drawn in Dark mode whatever the theme, with a navy (#0B1524) scrim under any text: left to right on the landing hero, bottom up on the sign-in aside. Text never sits on the busy part of a picture; on Sign in only the four titles of "One account for every move" are shown so the list stays on the dark end. Current pictures are generated drafts in `docs/design-assets/` and must be replaced with licensed photographs before anything is published. The generator draws each panel with a flat placeholder fill named "Photo · <key>"; the picture is uploaded into that fill. A horse's own photo is the one exception to the navy scrim: on her profile band (1200 × 240) and her My horses card it sits over her coat colour, and the scrim fades from her coat colour (solid at the left, 80% at 22%, gone by 46%) so the nameplate stays on her colour and her head reads on the right. A horse without a photo keeps the flat coat band. The crops live in `PHOTO_CROP` in `15-horse.js`.
- **Travel pass:** the signature object of a move, drawn like a boarding pass on paper (always Light, 16 radius, overlay elevation): "Travel pass" and an Example chip, the two city codes in Mono Data L with a road between them, four facts (departs, border, horses, arrival window), the date each document must carry, a perforation, and a sunken stub with the clearance state (unlock icon, "Clear to depart", documents cleared) over decorative code bars marked "Example only". On the landing it is an example; the same pass is the intended header for a move's tracking page.
- **Route map:** a schematic map, drawn like a transit map: positions follow longitude and latitude, but the empty sea east of 107°E is squeezed so the six countries get the room. Country names in Mono Label at text-tertiary, seas in Fraunces italic, a faint 76/70 px grid, roads solid in text-primary (3 px), air dashed in text-tertiary, cities as rings with the name and code, and every border crossing as a flag gate on its road with its name in Mono Caption. Status colours are not used on the map. It is the base for drawing a move's own route later (the current position from recorded checkpoints, a re-routed plan in a dashed line).
- **A move's route map:** the same schematic map zoomed to one move (`jobMap`): a faint grid, a dotted national border, country names in Mono Label, the road travelled solid in text-primary (4 px), the road still to go dotted in text-secondary, a replaced plan dashed and faint, stops as rings (filled when passed), border crossings as flag gates, and the last confirmed position as a navy truck pin with a "Last confirmed 08:34" tag. A legend under the map draws the same marks. Full width (In transit, Home · On the road, Re-routed) every stop is named with its time; in a narrow side column (Documents needed, Delivered, Closed) only the start and end are named, because the stop list beside it names the rest. Positions come only from recorded checkpoints, never an estimate.
- **Overview tiles (staff):** each number opens the work behind it: the figure, what it counts, then a hairline and the one case that matters most with an arrow ("Q-2026-0188 expires 30 Sep →"). Revenue and margin live with the revenue chart, not in a tile.
- **Review queues (staff):** decisions run back to back. Request review carries the queue in the top bar ("Review queue · Previous · 3 of 4 · Next", oldest first); Document review's decision says "Approve and open next" or "Reject and open next", with the rest of the queue named beneath it. A sidebar badge counts only items whose next step is the signed-in person's (Lan's Documents badge is the day's review queue).
- **Bulk actions (staff):** rows handled in batches (Pending invites) take a checkbox column; selecting shows a raised selection bar above the table ("1 selected · Resend invite · Revoke invite · Clear"). Revoke is Danger; nothing in the bar is gold.
- **Load plan (fleet coordinator):** horses are placed by dragging or by selecting. Drag a horse from To load onto a stall, from one stall to another (an occupied stall swaps the two; a horse dropped from To load onto an occupied stall sends that stall's horse back to To load), or back onto the To load column to unload it. While a horse is dragged, a compact Load item (selected look) rides just past the cursor so it never hides the stall below, the stall under the pointer takes the Target state with what the drop will do ("Place Silver Bell here", "Swap Copper King and Nightfall", "Place Silver Bell here. Nightfall goes back to the list."), the source fades, and, when the horse came from a stall, the top of To load shows a dashed drop zone ("Drop here to take Copper King off the vehicle") that turns Gold Wash with a Gold Hairline under the pointer. The keyboard path is the same move by selection: Enter on a horse (in the list or in a stall) shows the selection bar ("Silver Bell selected. Choose a stall." with Ghost Unload, only for a horse in a stall, and Ghost Cancel), and empty stalls take the Target state. A move the server refuses, because someone else changed those stalls first, snaps back and shows a Bad callout above the stalls ("That move wasn't saved", the server's reason, Ghost Dismiss); an open draft plan refreshes every 10 s. A stall tile is at least 128 tall and grows to fit a long conflict (several broken rules are joined with semicolons), and both stalls in a row keep one height; the conflict text wraps beside its alert icon and never runs past the tile's border.
- **Keyboard focus:** one focus for every clickable thing: a 1.5 px Brass Gold ring with Focus/Ring, 4 px outside the element and following its corners, so focusing never moves the layout. Option card has a Focus variant; rows, tiles and stalls take the ring as an overlay (see the Keyboard focus block).
- **Home states (customer):** Home is drawn in three states. Owing: "You owe N items" leads. Nothing owed: the "Nothing needed from you" panel leads, naming the next event as a two-line deadline, with nothing gold on the page. On the road: the same panel with the last confirmed checkpoint, then the "On the road" route panel shared with Tracking · In transit. Moves are ordered by what needs the club, then by departure.
- **Your moves on Home:** each move is a small pass card: the route in H4 with its code and summary, the stage mark and what holds it, a short perforation, and a sunken stub with the countdown and date and the open arrow.
- **A decision that doesn't send (staff):** every staff decision (Approve, Reject, Send to customer, Send reply) fails the same way, inside its decision panel: a Bad callout that says what did not happen ("Not sent. Nothing was recorded and the customer wasn't told.") and what was kept, a gold Try again, a Ghost "Keep for later", and the queue holding on this item until it is sent. Nothing is ever half-recorded.
- **Quotation side column:** the quoted pass, then four panels only: Against your estimate, After you accept, Who prepared it, Terms and versions (cancellation fee by notice period, then the versions). The quoted pass is the wizard's draft pass carried forward: an Info "Quoted · v2" chip, the two city codes with the mode icon (a plane for air), Horses, Departs, Mode, Arrival ("Airline schedule" for air) and Service, and a stub with "Quoted total" in Display M and the validity date, saying it becomes the travel pass once the customer accepts and the job is approved. Against your estimate no longer repeats the total. Reasoning that belongs to one group, such as how the air stall was sized, sits as a sunken note under that group in the ledger.
- **One vocabulary for money lines:** a line has one name wherever it appears. The 12% line is "Service fee" in the rate catalog, the quotation builder and the customer's quotation alike (the catalog adds "after contingency"); "margin" is kept for the Overview's gross margin, a different figure.
- **Cab condition control:** Sound / Watch / Concern at touch size. The chosen segment is said three ways so it survives glare: a check before the word, a 1.5 px border in the full status colour, and its tone fill.
- **Horse profile (customer):** the page behind a My horses card. Its header carries a 240-tall band (her photo over her coat colour, or the flat coat band when there is no photo) with the brass nameplate on the left, then the microchip in mono, the breed line and the temperament chips. The body reads: what the horse owes now (the owed item), what she needs to travel (a two-column fact grid, noting that load plans and quotations read it), documents that stay with her (with the trips they're used on) and trip documents (which link to that trip). The right column opens on **Ready to travel?**: a ring of documents cleared (3/5 in Mono Data, the arc in the ok tone on a muted track) beside the count still to go and, for each, who holds it and by when. Then it lists her trips with their stage marks and any overlap in the warn tone, and her declared value. Editing keeps the layout: fields fixed by the passport sit in a locked sunken panel with the reason, and a "Before you save" panel (accent border) lists each trip the change touches, in words, with who is told; the gold action names them.
- **Notes on a request (customer and staff):** never a free chat. The customer picks what a note is about with option cards whose Meta names who answers (Documents → the transport specialist; dates, price or changes → the logistics manager; the trip → the fleet coordinator, then the escort), names the item it's about, and sees the routing and the reply time stated twice before sending. Earlier notes and replies stay on the request, a reply indented under its note with a left rule. The staff side is list-and-detail: open notes oldest first, each with customer, job, received time and reply due (warn tone when due today), the selected one marked with an accent left rule; the detail shows the note, its attachment, the item it concerns and a reply composer that can carry an action (moving a due date, with the reason shown to the customer).
- **First run (customer):** an empty list is a first-run page, not a blank table: a welcome panel with three numbered steps (the current one ringed in the accent) beside the horse the club is about to make (an empty brass nameplate, "Your first horse · Breed · Sex", on a dashed muted band), what to have ready, and one gold action ("Add your first horse"), with the table's column header kept below and "Your requests appear here". The add-horse form groups fields into sections that each say why they're asked and what they feed; values derived from input (size class from height) appear in a sunken line with the rule in words, and documents are explicitly deferred to each trip. The side column opens on "How he'll appear": the real Horse card built from the form as it is typed (coat variant from the Coat field, readiness "Documents · per trip / No trips yet", no actions). Options that only apply to some horses appear only for them: "Mare with foal at foot" joins the needs when Sex is Mare.
- **Choice marks and facts:** a single-choice option card shows a radio circle (Option card's Show radio); only multi-select (the horses on a request) shows a checkbox. A checkbox is a control the reader can change. Something that is already true (a vet booked, a groom included) is a fact line with an ok-toned check icon; something that will happen when a decision is saved is a fact line with a muted arrow. Neither is ever drawn as a gold ticked box.
- **In review (customer, Tracking · In review):** the plain header (the request code and "Submitted 26 Sep 2026"), the Nothing needed owed panel with the next due date, then two columns: Where it stands above **Your route** (the wizard's route map at 728 × 240 with one line on distance, crossings and who plans the exact road), and in the side column the pass with a Neutral "Submitted" chip and the estimate at submission in its stub, above What you sent. The pass is one object through the request: Draft in the wizard, Submitted in review, Quoted on the quotation, then the travel pass header once the job is approved.
- **Request summary:** what a customer sent is shown by one component in one order and with one set of labels (Horses, Service, Insurance, Pickup, Route, Departure, Instructions; departure in mono). The Review step shows all of it with Edit links, in the wizard's order (Horses, Pickup, Route, Departure, Arrival, Instructions, Service, Insurance); the customer's In review page shows only what its pass doesn't (Pickup, Route via, Instructions, Insurance) in a "What you sent" card, with "Ask Yến to change it" while it is still in review; the staff review shows all of it at its version ("What the customer sent · v1") plus the estimate they saw.
- **Check tallies:** a list of checks states its count as passes over the total, with pending named separately: "3 of 5 pass · 1 pending", or "All 5 pass" in the ok tone. It never counts pending checks as passed.
- **Access (sign in, create account, staff invite, reset):** one door for customers and staff; the account decides whether it lands in the owner portal (or First run) or the staff workspace, so there is no separate staff sign-in. The page has only the brand and Help at the top: a 440 px form column on the left, and a sunken aside on the right that explains this case in words (what an account keeps in one place; what happens after sign-up; for an invite, the role on offer with its rights from Users & roles, the sidebar it will see, and who invited). Reset is a single centred column. Each view's one gold button is its submit. Sign-in never says whether an email has an account ("Email or password doesn't match"), and a reset always answers "If an account uses …". Errors name the rule and the value: "At least 12 characters. Yours has 9." A locked sign-in states the unlock time twice, disables Sign in as a Secondary, and moves the gold to Reset password. Password fields are the Input field's Password type, with a show/hide eye.
- **Audit log (logistics manager only):** an append-only ledger, newest first, that answers who did what, when and why. Filters (search by code, person or document; Person; Action; When) sit in the table controls above a table, 20 entries a page with numbered pages ("1–20 of 142 entries"); newest first is the When column sorted descending, its only sortable column: the time over the date in DM Mono, who with their role, the action as a sentence, what it acted on in mono, and where it came from (Web, System, or Cab tablet with the time it was received, because the tablet saves offline). Opening an entry adds a 400 px column (the table drops On and From, which the column repeats): the action, the stamp, what changed as before → after (struck through, then the new value), the reason quoted as written, the linked record and the entry number, and a line saying a correction is a new entry, never an edit. Export CSV is Secondary; there is no gold on the page. Other roles don't see it in the sidebar; opening a shared link shows why ("Only the logistics manager can see the audit log") and points back to their own work.
- **Tables:** two kinds, and only one of them has controls. **List tables** (Jobs, Requests, My requests, Users & roles, Audit log) share one kit, top to bottom:
  - status tabs with counts ("Blocked · 3", "Customers · 8");
  - filters at fixed widths (Search 360, Select 220, Date 260; never squeezed to fit);
  - a count line: the count in Label S, then the order in Body S Slate. A default order that is not a column is said in words ("Order: blocked first, then by departure"); a column sort replaces it with what was sorted ("Sorted by departure, earliest first") and a Ghost Reset order;
  - the table, whose foot shows the range and the pager: "1–20 of 142 entries", Previous and Next (disabled at either end, and both disabled when one page holds everything, so the pager is always in the same place), page numbers with an ellipsis past 7 pages. 20 rows a page.
  A **Column header** sorts only where the order is the user's to choose. Unsorted shows a faint up-down mark in Slate; Ascending and Descending turn the label Parchment with an arrow; the active column sets aria-sort and the direction is never carried by the arrow alone. Focus is a gold ring 4 px outside the label, so the label stays over its column. Sortable columns, and only these:
  - Jobs: Job, Stage (in stage order, 1 to 7), Departure.
  - Requests (the logistics manager's full list): Request, Departs, Age (default oldest first), Horses.
  - My requests: Request, Departs, Stage. Default order: what needs you first.
- **My requests rows (customer):** the reference keeps the REQ code with the quotation or job code beneath once it exists; the route carries its mode icon (truck or plane, text-tertiary) before the route and service line; Horses is the pass's overlapping coat swatches with the count (96 wide); Stage is the stage mark over a 7-segment track (14 × 4, 3 apart, 2 radius: stages done in text-primary, the current one in text-secondary, the rest border-default), which shows position, never status, so it never takes a status colour; the owed column is the You owe chip with the first due date beneath in Mono Caption ("First due 4 Oct", "Due 30 Sep"), or "Nothing needed".
  - Users & roles: Name, Jobs, Last active. Default order: by role.
  - Audit log: When only (newest first by default).
  Route, "What holds it", customer and action text are found through Search, never sorted. **Fixed-order tables** have no sort, no filters and no pages, because their order is the meaning: the quotation ledger (the fixed calculation order the quotation promises), the rate catalog tables (calculation order and break points), the regulation catalog's document rules, and the document tables (grouped by horse; their holder tabs are their only filter). A preview of a list on a dashboard (Overview's Review queue) links to the full list ("View all 4 in Requests") instead of paging. A filtered list with no rows uses the audit log's No results state: name the filters, say what may be wrong, offer Clear filters. Rows are never an empty grid while nothing has loaded: until the first page arrives the table shows skeleton rows under its header; offline, a Warn callout ("You're offline. The accounts load as soon as the connection is back."); when the server errors, a Bad callout that names what failed and a Secondary Try again. In those states the count line keeps its label without a number, and the foot is hidden. All four are drawn in the Table controls block, and Logistics manager · Users & roles · Error shows one in place.
- **Say it once:** a problem is stated once, beside its cause (the field or the line), and every other place refers to it neutrally ("Waits on the Horses check") rather than restating it in red. Summary stat tiles are not added above a list that already shows the same counts.
- **Answer in place:** when staff ask the customer to choose between named options, the customer answers with those options as radio cards on the owed item, and the one gold action opens the matching edit prefilled. The customer is never sent to rebuild a request to answer a one-word question.
- **Times and names:** a stamp is a time in DM Mono followed by the person in Outfit ("08:12  Tùng, driver"); a name is never set in Mono.
## Process Vocabulary

One set of seven stage names everywhere: **Request · Quotation · Approval · Documents · Clearance · Trip · Handover**. The tracker, the stage marks, the staff jobs list, the quotation, the request wizard's "What happens next" and the Home phases all use these names. Home groups them into four phases (1–2, 3–4, 5–6, 7) but never renames them.

The customer's reference is their request number, and it never changes. The quotation code (Q-…) and job code (CBRT-…) appear beside it once they exist; they never replace it. Staff screens lead with the job code.

## Do's and Don'ts

### Do:
- **Do** give each view exactly one Brass Gold (#C9AA5A) filled button, on the action that moves the job forward; make every other action Secondary or Ghost.
- **Do** state every status as a tone plus a word, using the ok, warn, bad, info or neutral chip.
- **Do** show every deadline as time left (Label S, toned) over the date (Mono Caption, tertiary).
- **Do** set places, routes and horse names in Fraunces, people and prose in Outfit, and codes, dates, times, counts and distances in DM Mono.
- **Do** show customer estimates as a range ("$11,300 – $16,100") with a line saying it is not a quote.
- **Do** open a page with its subject as the Fraunces title, the code and summary beneath, and status chips top right.
- **Do** name the rule, the value found and the fix in every error or refusal, and keep refused actions visible but disabled.
- **Do** mark demo figures as demo (the footer reads "Prototype · demo data as of ...").
- **Do** fill a numbers band with commitments the system enforces (6 countries, 21-day cross-border lead time, 7-day quotation validity, one groom per 3 horses), not operating results the product cannot yet claim.

### Don't:
- **Don't** use gold for any state, progress tone or status chip.
- **Don't** put an eyebrow label (small uppercase text above a heading) anywhere; the page or section title stands alone, with its summary beneath. The old role-dot Eyebrow component has been removed from the library.
- **Don't** set names, places or sentences in DM Mono, or codes and dates in Fraunces or Outfit.
- **Don't** show a single price before a quotation exists.
- **Don't** present placeholder statistics ("4,200+ horses moved", "99.2% on-time") as real operating figures.
- **Don't** use colour alone for meaning: no bare dots, borders or bars without a word beside them.
- **Don't** add drop shadows to panels or cards; use a surface step or a border.
- **Don't** draw live map tiles, moving dots or times finer than the recorded checkpoints on route views.
- **Don't** use stock photography for horses. A horse is shown by its own photograph (the owner's picture of that horse) or, without one, by the nameplate on its coat colour. The nameplate stays in both cases.

## Canvas

The Screens page is eight rows, each starting at x 0 under a Display M row label, frames 120 px apart, rows 240 px apart: **Access** (sign in, create account, staff invite, reset password and their states), **Owner portal** (home, horses, the request wizard in step order, first run), **Owner · Request tracking** (the request from review to closed record, in order, with the quotation and document pages where they occur), then one row per staff role, labelled with the role and the person signed in: **Logistics manager · Vũ Hải Yến** (overview, jobs and a sorted state, request review, quotation builder, incidents, users & roles, the audit log), **Transport specialist · Nguyễn Thị Lan** (the job's Clearance and Authorities tabs, document review, customer notes, the catalogs, and the audit log's not-allowed state) and **Fleet & route coordinator · Đỗ Minh Khôi** (the job's Load plan and Route tabs, and Trip progress), then **Escort cab surface** (checkpoint, welfare stop, delivery, held) and **Dark mode · Mobile not maintained** (the Dark copies and the mobile horses page).

Staff and escort frames are named by role first, then the page ("Transport specialist · Document review", "Escort · Checkpoint"), so a frame's sidebar can be read from its name. A job's tabs are owned by different roles, so moving from Clearance to Load plan also moves from Lan's row to Khôi's. The plugin's `eCanvas` call arranges them and reports any frame that fits no row; the mock run fails when it does, which also catches a node a builder made and never placed.

## Known Drift

- **Mobile frames.** "My horses · Mobile" and its Dark copy exist in the file. They follow the same components and are free of eyebrows and gold data, but they are not maintained against this system; desktop 1440 is the maintained scope.
