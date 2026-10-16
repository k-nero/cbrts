/* =====================================================================
   Page builders: Foundations, Screens, Cover
   ===================================================================== */
function money(n, dp) {
  var d = dp == null ? 2 : dp;
  var s = Math.abs(n).toFixed(d).split('.');
  s[0] = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (n < 0 ? '-$' : '$') + s.join('.');
}
function panel(name, o) {
  o = o || {};
  return VV({ name: name, gap: o.gap != null ? o.gap : 16, pad: o.pad != null ? o.pad : 24, w: o.w, radius: 12, fill: o.fill || 'surface/card', stroke: o.stroke || 'border/default', clip: o.clip });
}
function dlRow(label, value, o) {
  o = o || {};
  var r = H({ name: label, gap: 16, cross: 'CENTER', main: 'SPACE_BETWEEN' });
  add(r, Tx(label, o.labelStyle || 'Body/S', 'text/secondary', { name: 'Label' }));
  add(r, Tx(value, o.valueStyle || 'Mono/Data', o.valueColor || 'text/primary', { name: 'Value', align: 'RIGHT' }));
  return fillW(r);
}
function place(nodes, x0, y0, gap) {
  var x = x0;
  for (var i = 0; i < nodes.length; i++) { nodes[i].x = x; nodes[i].y = y0; x += nodes[i].width + gap; }
  return x;
}

/* ---------------------------------------------------------------------
   Foundations
   --------------------------------------------------------------------- */
var COLOR_GROUPS = [
  ['Background & surface', ['bg/canvas', 'bg/sunken', 'bg/input', 'surface/card', 'surface/raised', 'surface/muted']],
  ['Border & text', ['border/default', 'border/strong', 'text/primary', 'text/secondary', 'text/tertiary']],
  ['Accent · gold means act', ['accent/default', 'accent/hover', 'accent/on', 'accent/text', 'accent/soft', 'accent/line']],
  ['Status · always paired with a word', ['status/ok/fg', 'status/ok/bg', 'status/ok/border', 'status/warn/fg', 'status/warn/bg', 'status/warn/border', 'status/bad/fg', 'status/bad/bg', 'status/bad/border', 'status/info/fg', 'status/info/bg', 'status/info/border']],
  ['Stall types', ['stall/standard', 'stall/box', 'stall/climate']],
  ['Materials & coats', ['material/brass-light', 'material/brass-dark', 'material/brass-ink', 'coat/grey', 'coat/black', 'coat/chestnut', 'coat/bay']]
];
function colorPanel(mode) {
  var dark = mode === 'Dark';
  var p = VV({ name: 'Colour · ' + mode, gap: 28, pad: 40, w: 1080, radius: 16, fill: 'bg/canvas', stroke: 'border/default' });
  p.setExplicitVariableModeForCollection(COLL.color, dark ? COLL.dark : COLL.light);
  add(p, Tx(mode + ' mode', 'Heading/H3'));
  var hex = {};
  COLORS.forEach(function (c) { hex[c[0]] = dark ? c[1] : c[2]; });
  COLOR_GROUPS.forEach(function (g) {
    add(p, Tx(g[0], 'Mono/Eyebrow', 'text/tertiary'));
    var row = H({ name: g[0], gap: 16, wrap: true, rowGap: 20 });
    g[1].forEach(function (tok) {
      var cell = VV({ name: tok, gap: 6, w: 150 });
      var sw = rect(150, 64, tok, 'Swatch', 8);
      sw.strokes = [P('border/default')]; sw.strokeWeight = 1; sw.strokeAlign = 'INSIDE';
      addAll(cell, [sw, Tx(tok, 'Mono/Caption', 'text/primary', { name: 'Token', w: 150 }), Tx(hex[tok].toUpperCase(), 'Mono/Caption', 'text/tertiary', { name: 'Hex' })]);
      add(row, cell);
    });
    add(p, fillW(row));
  });
  return p;
}
var TYPE_SAMPLES = {
  'Display/XL': 'Precision transport', 'Display/L': 'Clearance', 'Display/M': '$11,300 – $16,100',
  'Heading/H3': 'Departure locked', 'Heading/H4': 'Shadowfax',
  'Body/L': 'Every document is checked against your travel dates.',
  'Body/M': 'All horses in one request share the same route and dates.',
  'Body/S': 'Valid today, but 77 days old at departure. A new test must be dated 19 Aug 2026 or later.',
  'Label/M': 'Request transport', 'Label/S': 'Edit profile',
  'Mono/Data L': '38,019.20', 'Mono/Data': 'CBRT-2026-041', 'Mono/Caption': 'v2 · 23 Sep 2026',
  'Mono/Eyebrow': 'Transport specialist', 'Mono/Chip': 'Cleared'
};
var PRINCIPLES = [
  ['Gold means act.', 'Gold marks the one forward action on a view and the brand. It never signals status, so a gold element is always something you can press.'],
  ['Status is said twice.', 'Every state pairs a tone with a word: Cleared, In review, Expires in transit, Fails rule, Required. It survives colour blindness and greyscale print.'],
  ['Mono is for data.', 'Codes, dates, weights, microchips and money use DM Mono with tabular figures. Names and prose never do.'],
  ['Fraunces carries names.', 'Horses, stops and page titles use the display face, never below 18 px. Outfit carries everything people read at length.'],
  ['The gate is visible from operations.', 'Load plan and route views repeat the clearance state, so nobody dispatches around it.'],
  ['Estimates are ranges.', 'Customer-facing prices before a quotation is issued are always a low–high range with a non-binding notice.']
];
function buildFoundations(page) {
  var board = primaryTheme(VV({ name: 'Foundations', gap: 56, pad: 80, w: 2360, fill: 'bg/canvas' }));
  page.appendChild(board);
  var intro = VV({ name: 'Intro', gap: 12 });
  addAll(intro, [Tx('Foundations', 'Display/L'), Tx('Tokens live in two variable collections: EquiFreight / Color (Dark and Light modes) and EquiFreight / Dimension (space and radius). Components bind to these, so switching a frame’s mode re-themes everything inside it.', 'Body/L', 'text/secondary', { w: 900 })]);
  add(board, intro);

  var pr = H({ name: 'Principles', gap: 20, wrap: true, rowGap: 20 });
  PRINCIPLES.forEach(function (p, i) {
    var c = panel('Principle ' + (i + 1), { w: 720, gap: 8 });
    addAll(c, [Tx(p[0], 'Heading/H3'), Tx(p[1], 'Body/M', 'text/secondary', { fill: true })]);
    add(pr, c);
  });
  add(board, fillW(pr));

  var colors = H({ name: 'Colour', gap: 40 });
  addAll(colors, [colorPanel('Dark'), colorPanel('Light')]);
  add(board, colors);

  var typeP = panel('Typography', { w: 2200, gap: 0, pad: 0, clip: true });
  var th = H({ name: 'Faces', gap: 48, pad: [28, 32, 28, 32], fill: 'bg/sunken' });
  addAll(th, [
    Tx('Display · ' + FONT['display/Regular'].family, 'Heading/H4', 'text/primary'),
    Tx('Body · ' + FONT['body/Regular'].family, 'Label/M', 'text/primary'),
    Tx('Data · ' + FONT['mono/Regular'].family, 'Mono/Data', 'text/primary')
  ]);
  add(typeP, fillW(th));
  TYPE.forEach(function (t) {
    var row = H({ name: t[0], gap: 40, pad: [18, 32, 18, 32], cross: 'CENTER' });
    borderSide(row, 'border/default', 'top');
    var meta = VV({ name: 'Meta', gap: 2, w: 300 });
    var f = FONT[t[1] + '/' + t[2]];
    addAll(meta, [Tx(DS + '/' + t[0], 'Mono/Caption', 'text/secondary'), Tx(f.family + ' ' + f.style + ' · ' + t[3] + '/' + t[4] + (t[5] ? ' · ' + t[5] + '%' : '') + (t[6] ? ' · caps' : ''), 'Mono/Caption', 'text/tertiary')]);
    addAll(row, [meta, Tx(TYPE_SAMPLES[t[0]], t[0], 'text/primary', { fill: true })]);
    add(typeP, fillW(row));
  });
  add(board, typeP);

  var dims = H({ name: 'Space, radius, elevation', gap: 40 });
  var sp = panel('Space', { w: 700, gap: 10 });
  add(sp, Tx('Space · EquiFreight / Dimension', 'Heading/H3'));
  SPACE.forEach(function (s) {
    var r = H({ name: 'space/' + s, gap: 16, cross: 'CENTER' });
    var bar = rect(Math.max(s * 3, 2), 12, 'surface/muted', 'Bar', 2);
    bar.strokes = [P('border/strong')]; bar.strokeWeight = 1;
    addAll(r, [Tx('space/' + s, 'Mono/Caption', 'text/secondary', { w: 90 }), bar, Tx(s + ' px', 'Mono/Caption', 'text/tertiary')]);
    add(sp, r);
  });
  var rd = panel('Radius', { w: 700, gap: 20 });
  add(rd, Tx('Radius', 'Heading/H3'));
  var rrow = H({ name: 'Radii', gap: 20 });
  RADII.forEach(function (r) {
    var cell = VV({ name: r[0], gap: 8, cross: 'CENTER' });
    var sq = rect(88, 88, 'surface/muted', 'Sample', r[1]);
    sq.strokes = [P('border/strong')]; sq.strokeWeight = 1;
    addAll(cell, [sq, Tx(r[0] + ' · ' + r[1], 'Mono/Caption', 'text/tertiary')]);
    add(rrow, cell);
  });
  add(rd, rrow);
  add(rd, Tx('Controls 8 · cards 12 · dialogs and heroes 16 · chips pill · nameplate 4', 'Body/S', 'text/secondary'));
  var el = panel('Elevation', { w: 720, gap: 20 });
  add(el, Tx('Elevation & materials', 'Heading/H3'));
  var erow = H({ name: 'Effects', gap: 24 });
  EFFECTS.forEach(function (e) {
    var cell = VV({ name: e[0], gap: 10, cross: 'CENTER' });
    var sq = F({ name: 'Sample', w: 140, h: 88, radius: 12, fill: 'surface/raised' });
    if (e[0] === 'Material/Brass') sq.fills = [gradient([[0, '#EAD08C'], [0.55, '#C9AA5A'], [1, '#9C7C33']])];
    effect(sq, e[0]);
    addAll(cell, [sq, Tx(e[0], 'Mono/Caption', 'text/tertiary')]);
    add(erow, cell);
  });
  add(el, erow);
  addAll(dims, [sp, VV({ name: 'Column', gap: 40 }, [rd, el])]);
  add(board, dims);
  return board;
}

/* ---------------------------------------------------------------------
   Screen scaffolding
   --------------------------------------------------------------------- */
function screen(name, active, blocks, o) {
  o = o || {};
  var s = VV({ name: name, w: SCREEN_W, fill: 'bg/canvas' });
  var hdr = o.header || inst(C.header);
  if (active && !o.header) setP(nested(hdr, 'Nav · ' + active), { State: 'Active' });
  add(s, fillW(hdr));
  var main = VV({ name: 'Content', gap: o.gap != null ? o.gap : 28, pad: [0, PADX, 96, PADX] });
  for (var i = 0; i < blocks.length; i++) add(main, fillW(blocks[i]));
  add(s, fillW(main));
  add(s, fillW(footer('Full', o.asOf)));
  return s;
}
function footer(size, asOf) { var f = inst(C.footer, { Size: size }); if (asOf) setP(f, { 'As of': asOf }); return f; }
/* ---------- the one page header ----------
   Every page (owner, tracking, staff) opens with it: an optional back link, the title (or a
   banner such as a horse's coat), then either a mono code with a one-line summary or a short
   paragraph, and a right slot for chips, a deadline or a control. A page without a back link
   reserves the back row, so every owner title sits at y 142; staff pages have no back link (the breadcrumb leads back) and their title sits at y 97.
   o: { shell: 'owner'|'staff', back, title, banner, code, summary, metaChips, right: [nodes], below: [nodes], rule } */
var HEAD_TOP = { owner: 32, staff: 28 };
/* two side-column widths on the 1440 grid, both at a 24 gutter: narrow for a decision, the people,
   an estimate or the cab's context; wide for a route or the stages */
var SIDE = { narrow: 400, wide: 456 };
var BACK_ROW = 46; // a Ghost SM back link (32) plus the header's 14 gap
function pageHeader(o) {
  var staff = o.shell === 'staff';
  var top = HEAD_TOP[o.shell || 'owner'];
  /* staff pages: the top bar's breadcrumb is the way back, so the header drops the back link and its reserved row,
     and the title steps down to Display M so the work starts higher */
  if (staff) o.back = null;
  var wrap = VV({ name: 'Page header', gap: 14, pad: [o.back || staff ? top : top + BACK_ROW, 0, o.rule === false ? 0 : 24, 0] });
  if (o.rule !== false) borderSide(wrap, 'border/default', 'bottom');
  if (o.back) add(wrap, btn('Ghost', 'SM', o.back, { lead: 'arrow-left' }));
  if (o.banner) add(wrap, fillW(o.banner));
  var row = H({ name: 'Title row', gap: 24, main: 'SPACE_BETWEEN', cross: 'MAX' });
  var t = VV({ name: 'Title block', gap: 8 });
  if (o.title) add(t, Tx(o.title, staff ? 'Display/M' : 'Display/L', 'text/primary', { name: 'Title' }));
  if (o.code || o.metaChips) {
    var m = H({ name: 'Meta', gap: 10, cross: 'CENTER' });
    if (o.code) add(m, Tx(o.code, 'Mono/Data', 'text/secondary', { name: 'Code' }));
    if (o.summary) add(m, Tx(o.summary, 'Body/M', 'text/secondary', { name: 'Summary' }));
    (o.metaChips || []).forEach(function (c) { add(m, c); });
    add(t, m);
  } else if (o.summary) add(t, Tx(o.summary, 'Body/M', 'text/secondary', { name: 'Summary', w: 640 }));
  var r = H({ name: 'Status', gap: 8, cross: 'CENTER' });
  (o.right || []).forEach(function (c) { if (c) add(r, c); });
  // an empty hug frame keeps Figma's default 100px height and pushes the title down
  add(row, t);
  if (r.children.length) add(row, r); else r.remove();
  add(wrap, fillW(row));
  (o.below || []).forEach(function (n) { add(wrap, fillW(n)); });
  return wrap;
}
/* REQ-2026-0193 as the customer sent it; the Review step, In review and Yến's review read these rows */
var REQ_0193 = [
  ['Horses', 'Shadowfax, Nightfall'],
  ['Service', 'Road, shared load, climate-controlled stall'],
  ['Insurance', 'Your own policy'],
  ['Pickup', 'Phú Thọ training centre, Ho Chi Minh City'],
  ['Route', 'Ho Chi Minh City → Bangkok via Mộc Bài – Bavet and Poipet – Aranyaprathet'],
  ['Departure', '30 Oct 2026 ±3 d', true],
  ['Instructions', 'Quiet loading. Arrive by 07:00 for vet check.']
];
/* rows: [label, value, mono]; o: { title, edit, bare, only: [labels], extra: [[label, value, mono]] }
   bare: no card of its own, for use inside another panel */
function requestSummary(rows, o) {
  o = o || {};
  var list = rows.filter(function (r) { return !o.only || o.only.indexOf(r[0]) >= 0; }).concat(o.extra || []);
  var p = panel(o.title || 'Summary', { gap: 0, pad: o.bare ? [4, 0, 0, 0] : (o.title ? [20, 24, 12, 24] : 0), clip: !o.title });
  if (o.bare) { p.fills = []; p.strokes = []; }
  if (o.title) add(p, VV({ name: 'Title', pad: [0, 0, 12, 0] }, [Tx(o.title, 'Heading/H4')]));
  list.forEach(function (r, i) {
    var row = H({ name: r[0], gap: 24, pad: o.title ? [10, 0, 10, 0] : [16, 24, 16, 24], cross: 'CENTER' });
    if (i || o.title) borderSide(row, 'border/default', 'top');
    addAll(row, [Tx(r[0], 'Body/S', 'text/secondary', { name: 'Label', w: o.title ? 120 : 140 }), Tx(r[1], r[2] ? 'Mono/Data' : (o.title ? 'Label/S' : 'Body/M'), 'text/primary', { name: 'Value', fill: true })]);
    if (o.edit) add(row, Tx('Edit', 'Label/S', 'text/secondary'));
    add(p, fillW(row));
  });
  return p;
}
function pageHead(title, sub, right) { return pageHeader({ title: title, summary: sub, right: [right] }); }
function section(title, sub, content) {
  var s = VV({ name: title, gap: 32, pad: [80, 0, 0, 0] });
  var h = VV({ name: 'Section header', gap: 10 });
  add(h, Tx(title, 'Display/L'));
  if (sub) add(h, Tx(sub, 'Body/M', 'text/secondary', { w: 680 }));
  addAll(s, [h, fillW(content)]);
  return s;
}
function stepper(states) {
  var labels = ['Horses', 'Route & dates', 'Service', 'Review'];
  var r = H({ name: 'Stepper', gap: 16, cross: 'CENTER', pad: [8, 0, 8, 0] });
  for (var i = 0; i < 4; i++) {
    add(r, stepI(states[i], i + 1, labels[i]));
    if (i < 3) add(r, fillW(rect(40, 1, states[i] === 'Done' ? 'status/ok/border' : 'border/default', 'Connector')));
  }
  return r;
}

/* ---------------------------------------------------------------------
   Domain data (demo)
   --------------------------------------------------------------------- */
var HORSES = [
  { name: 'Shadowfax', coat: 'Grey', sub: 'Andalusian · Gelding', tags: [['Ok', 'Calm']], age: '7 y', height: '16.2 hh', weight: '510 kg', size: 'M · 32', chip: '250 259 600 123 456', value: '$85,000', notes: 'Annual vaccinations up to date. No known allergies. Loads best in a quiet yard.', ready: '4 of 5 cleared', pct: 80 },
  { name: 'Nightfall', coat: 'Black', photo: true, sub: 'Thoroughbred · Mare', tags: [['Warn', 'Nervous'], ['Info', 'Climate stall']], age: '4 y', height: '16.0 hh', weight: '478 kg', size: 'M · 32', chip: '250 259 600 223 311', value: '$240,000', notes: 'Sensitive to loud noise. Needs a slow, gentle load and a climate-controlled stall.', ready: '3 of 5 cleared', pct: 60 },
  { name: 'Copper King', coat: 'Chestnut', sub: 'Quarter Horse · Stallion', tags: [['Bad', 'Aggressive'], ['Neutral', 'Box stall']], age: '9 y', height: '15.3 hh', weight: '583 kg', size: 'L · 48', chip: '985 141 000 876 502', value: '$120,000', notes: 'Box stall only. Never next to a mare. Experienced handlers only.', ready: '4 of 5 cleared', pct: 80 },
  { name: 'Silver Bell', coat: 'Grey', sub: 'Lipizzan · Mare', tags: [['Ok', 'Calm']], age: '6 y', height: '15.1 hh', weight: '445 kg', size: 'M · 32', chip: '203 098 100 554 120', value: '$60,000', notes: 'Travels well. Hay net at shoulder height.', ready: '2 of 5 cleared', pct: 40 }
];
function horseCard(h) {
  var c = inst(C.horse, { Coat: h.coat });
  setP(c, { Name: h.name, Subtitle: h.sub, Age: h.age, Height: h.height, Weight: h.weight, Size: h.size, Microchip: h.chip, 'Declared value': h.value, Notes: h.notes, Readiness: h.ready });
  setP(nested(c, 'Tag 1'), { Label: h.tags[0][1], Tone: h.tags[0][0] });
  if (h.tags[1]) setP(nested(c, 'Tag 2'), { Label: h.tags[1][1], Tone: h.tags[1][0] });
  else setP(c, { 'Show tag 2': false });
  setP(nested(c, 'Readiness bar'), { Value: String(h.pct), Tone: h.pct >= 100 ? 'Ok' : 'Neutral' });
  c.name = 'Horse card · ' + h.name;
  return c;
}

/* ---------------------------------------------------------------------
   Screen: Home
   --------------------------------------------------------------------- */
/* the signed-out header: no nav and no account, just the way in */
function publicHeader() {
  var h = H({ name: 'Public header', main: 'SPACE_BETWEEN', cross: 'CENTER', pad: [0, 40, 0, 40], h: 64, fill: 'bg/canvas' });
  borderSide(h, 'border/default', 'bottom');
  var right = H({ name: 'Account', gap: 8, cross: 'CENTER' });
  addAll(right, [btn('Ghost', 'SM', 'Help', { lead: 'info' }), btn('Secondary', 'SM', 'Sign in')]);
  addAll(h, [brand(), right]);
  return h;
}
/* the public landing page, signed out: what EquiFreight does, the services and how a move runs.
   A signed-in club never lands here; its Home is the work (scrHome). No customer, horse or job
   appears on it (PRODUCT.md, Absences): the hero shows the rules at work on an example date instead. */
async function scrLanding() {
  /* the hero is a photograph, so it is drawn in Dark mode whatever the theme; the copy sits on the scrim, the horse on the right */
  var hero = photoPanel({ key: 'Hero', dir: 'H', h: 720, pad: [0, PADX, 0, PADX], gap: 64, cross: 'CENTER', scrim: [[0, NAVY + 'F5'], [0.45, NAVY + 'B3'], [0.75, NAVY + '33'], [1, NAVY + '1A']] });
  var left = VV({ name: 'Hero copy', gap: 24, w: 620 });
  var h1 = Tx('Precision transport\nfor every horse', 'Display/XL', 'text/primary', { name: 'Headline', fill: true });
  await flush();
  var i = h1.characters.indexOf('transport');
  h1.setRangeFontName(i, i + 9, FONT['display/Italic']);
  var ctas = H({ name: 'Actions', gap: 12 });
  addAll(ctas, [btn('Primary', 'MD', 'Request transport', { trail: 'arrow-right' }), btn('Secondary', 'MD', 'Create a club account')]);
  addAll(left, [h1,
    Tx('Road and air moves across Vietnam, Cambodia, Thailand, Laos, Malaysia and Hong Kong. Every document is checked against your travel dates, and no horse leaves until clearance is complete.', 'Body/L', 'text/secondary', { w: 560 }),
    ctas]);
  add(hero, left); // the right half is the photograph: the horse being loaded

  /* the services the request flow offers, as a table, not a grid of icon cards: what it is, where it runs,
     and what moves its price. No figures: an estimate is always a range, worked out for the request. */
  var services = tbl('Services', [['Service', null], ['Scope', 220, null, 'Body/S', 'text/secondary'], ['What drives the price', 320, null, 'Body/S', 'text/secondary']], [
    ['Road, within one country', 'Shared or private trailer runs between training centres, studs and racecourses.', 'One country · 3 days’ notice', 'Distance, a shared or private trailer, each horse’s stall'],
    ['Road, across borders', 'Door to door, with every border document prepared and filed for you.', 'Vietnam, Cambodia, Thailand, Laos, Malaysia · 21 days’ notice', 'Border crossings, distance, grooms, a shared or private trailer'],
    ['Air', 'Stall positions planned by width: 32 in, 48 in or a full 96 in box, with a flying groom on board.', 'Economy, Business and First stalls', 'Stall width, pre-export isolation, flying grooms']
  ].map(function (r) {
    var name = VV({ name: r[0], gap: 4 });
    addAll(name, [Tx(r[0], 'Heading/H4'), Tx(r[1], 'Body/S', 'text/secondary', { fill: true })]);
    return { cells: [fillW(name), r[2], r[3]] };
  }));

  var how = H({ name: 'Steps', gap: 24 });
  /* the tracker's seven stages, grouped into four phases; each stage has one owner, named in stage order */
  [
    ['Stages 1–2', 'Request and Quotation', 'Tell us the horses, route and dates. You see an indicative range straight away; the itemised quotation follows review.', 'Logistics Manager', '21 days’ notice across a border, 3 within one country. Quotations hold for a week.'],
    ['Stages 3–4', 'Approval and Documents', 'You accept, the job is approved and your document checklist opens.', 'Logistics Manager, then Transport Specialist', 'A refused document always says why, and what a new one must show.'],
    ['Stages 5–6', 'Clearance and Trip', 'Departure unlocks only when every document clears. On the road, the escort records each checkpoint and how the horses are.', 'Transport Specialist, then Fleet & Route Coordinator', 'One groom for every three horses, rounded up, so four horses travel with two.'],
    ['Stage 7', 'Handover', 'You confirm the horses arrived sound, or report a problem, and the job closes.', 'You, with the escort', 'Nothing is overwritten: every document version and record is kept.']
  ].forEach(function (s, idx) {
    var c = VV({ name: 'Step ' + (idx + 1), gap: 12, pad: [24, 0, 0, 0] });
    borderSide(c, 'border/default', 'top');
    var rule = H({ name: 'Rule', gap: 8, pad: [12, 0, 0, 0] });
    borderSide(rule, 'border/default', 'top');
    addAll(rule, [Ic('check', 16, 'status/ok/fg'), Tx(s[4], 'Body/S', 'text/secondary', { fill: true })]);
    addAll(c, [Tx(s[0], 'Label/S', 'text/tertiary', { name: 'Stages' }), Tx(s[1], 'Heading/H3'), Tx(s[2], 'Body/S', 'text/secondary', { fill: true }), Tx('Owner: ' + s[3], 'Body/S', 'text/tertiary', { name: 'Owner', fill: true }), fillW(rule)]);
    add(how, sz(fillW(c), 'h', 'FILL'));
  });

  var feats = H({ name: 'Features', gap: 24 });
  addAll(feats, [
    featureCard(windowVisual(), 'Caught before departure day', 'A Coggins test that is valid today but 77 days old on departure day is flagged now, with the date a new test must carry.'),
    featureCard(widthVisual(), 'Stalls planned by width', 'A 96 in air stall takes three standard horses, two at 48 in, or one in a full box. Stallions get box stalls and never stand beside a mare.'),
    featureCard(quoteVisual(), 'Quotes that say what can move', 'Every line shows its basis. Lines that can change on the final invoice, such as waiting time, are marked before you accept.')
  ]);

  /* the page ends on the way in, with the one promise a visitor needs before they ask */
  var close = H({ name: 'Close', gap: 48, pad: [40, 48, 40, 48], radius: 12, fill: 'surface/card', stroke: 'border/default', main: 'SPACE_BETWEEN', cross: 'CENTER' });
  var cc = VV({ name: 'Copy', gap: 10 });
  addAll(cc, [Tx('Send us the horses, the route and the date', 'Display/M', 'text/primary', { name: 'Title' }), Tx('Nothing is booked until you accept the itemised quotation.', 'Body/M', 'text/secondary', { name: 'Summary' })]);
  addAll(close, [cc, btn('Primary', 'MD', 'Request transport', { trail: 'arrow-right' })]);

  var land = screen('Landing · Signed out', null, [
    passSection(),
    section('Three ways to move a racehorse', 'Each is priced from the same rate catalog and itemised line by line. A veterinary escort and transit insurance can be added to any of them.', services),
    section('Where we move horses', 'Six countries by road, and Hong Kong by air. Every border crossing has its own document rules, and each one is checked against your travel dates.', routeMapRow()),
    section('Seven stages in four phases', 'Your request page tracks the same seven stages, each with a named owner. The next never starts until the one before it is done, and each holds to a rule.', how),
    section('Built around the paperwork and the horse', null, feats),
    VV({ name: 'Closing', pad: [80, 0, 0, 0] }, [fillW(close)])
  ], { gap: 0, header: publicHeader() });
  /* full bleed: the hero sits between the header and the 1200 content column */
  land.insertChild(1, hero);
  hero.layoutSizingHorizontal = 'FILL';
  return land;
}

/* ---------- Home, signed in ----------
   The club's first screen is its work: everything it owes across its requests, soonest first,
   with the one gold action on the top item; then each move with its stage and what holds it;
   then the horses and how far each one's documents have got. Principle 1: the next step, always. */
var HOME_MOVES = [
  ['Ho Chi Minh City → Phnom Penh', 'REQ-2026-0162', 'job CBRT-2026-041 · 4 horses · road, private trailer', 'Documents', 'Departure locked · you owe 4', 'status/bad/fg', 'In 22 days', '18 Oct 2026'],
  ['Phnom Penh → Hong Kong (Sha Tin)', 'REQ-2026-0179', 'quotation Q-2026-0188 · 2 horses · air, business class', 'Quotation', 'Quotation waiting for you', 'status/warn/fg', 'In 55 days', '20 Nov 2026'],
  ['Ho Chi Minh City → Bangkok', 'REQ-2026-0193', '2 horses · road, shared load', 'Request', 'In review with Yến; nothing needed', 'text/secondary', 'In 34 days', '30 Oct 2026']
];
var HOME_HORSES = [
  ['Shadowfax', 'coat/grey', 'Grey · Andalusian gelding', '4 of 5 cleared', null],
  ['Nightfall', 'coat/black', 'Black · Thoroughbred mare', '3 of 5 cleared', 'New EIA test due 4 Oct'],
  ['Copper King', 'coat/chestnut', 'Chestnut · Quarter Horse stallion', '4 of 5 cleared', null],
  ['Silver Bell', 'coat/grey', 'Grey · Lipizzan mare', '2 of 5 cleared', 'Bill of sale overdue']
];
/* one request on the signed-in Home: route and codes, the stage and what holds it, the departure */
/* a move on Home is a small pass: the route and where it stands, a tear line, and a stub with the date */
function moveRow(m) {
  var card = H({ name: m[1], radius: 12, fill: 'surface/card', stroke: 'border/default', clip: true });
  var main = H({ name: 'Move', gap: 24, pad: [16, 20, 16, 20], cross: 'CENTER' });
  var id = VV({ name: 'Route', gap: 4 });
  var meta = H({ name: 'Meta', gap: 8, cross: 'CENTER' });
  addAll(meta, [Tx(m[1], 'Mono/Caption', 'text/secondary'), Tx(m[2], 'Body/S', 'text/tertiary', { fill: true })]);
  addAll(id, [Tx(m[0], 'Heading/H4'), fillW(meta)]);
  var st = VV({ name: 'Where it is', gap: 4, w: 200 });
  addAll(st, [stageMark(m[3]), Tx(m[4], 'Label/S', m[5], { fill: true })]);
  addAll(main, [fillW(id), st]);
  var perf = VV({ name: 'Perforation', gap: 6, pad: [6, 0, 6, 0], w: 4, cross: 'CENTER', clip: true });
  for (var k = 0; k < 9; k++) add(perf, dot(3, 'border/strong', 'Hole'));
  var stub = H({ name: 'Stub', gap: 12, pad: [14, 16, 14, 20], w: 190, fill: 'bg/sunken', cross: 'CENTER' });
  var due = VV({ name: 'Departs', gap: 2 });
  addAll(due, [Tx(m[6], 'Label/M', 'text/primary'), Tx(m[7], 'Mono/Caption', 'text/tertiary')]);
  addAll(stub, [fillW(due), rowOpen()]);
  addAll(card, [fillW(main), perf, stub]);
  perf.layoutSizingVertical = 'FILL'; stub.layoutSizingVertical = 'FILL';
  return card;
}
function homeScreen(name, summary, lead, moves, horses, horseNote, asOf, calm) {
  var list = VV({ name: 'Moves', gap: 12 });
  moves.forEach(function (m) { add(list, fillW(moveRow(m))); });
  var movesBlock = titled('Your moves', moves.length + (calm ? ' in progress, soonest departure first.' : ' in progress, the one that needs you most first.') + ' Each opens its request.', list, btn('Ghost', 'SM', 'My requests', { trail: 'arrow-right' }));
  var hp = panel('Your horses', { gap: 0, pad: [20, 24, 8, 24] });
  add(hp, VV({ name: 'Title', gap: 2, pad: [0, 0, 12, 0] }, [Tx('Your horses', 'Heading/H4'), Tx(horseNote, 'Body/S', 'text/tertiary')]));
  horses.forEach(function (h) {
    var row = H({ name: h[0], gap: 12, pad: [12, 0, 12, 0], cross: 'CENTER' });
    borderSide(row, 'border/default', 'top');
    var sw = F({ name: 'Coat', w: 12, h: 12, radius: 999, fill: h[1], stroke: 'border/strong' });
    var t = VV({ name: 'Horse', gap: 2 });
    addAll(t, [Tx(h[0], 'Label/M'), Tx(h[2], 'Body/S', 'text/tertiary')]);
    var r = VV({ name: 'Documents', gap: 2, cross: 'MAX' });
    add(r, Tx(h[3], 'Mono/Caption', 'text/secondary', { align: 'RIGHT' }));
    if (h[4]) add(r, Tx(h[4], 'Body/S', h[5] || (h[4].indexOf('overdue') >= 0 ? 'status/bad/fg' : 'status/warn/fg'), { align: 'RIGHT' }));
    addAll(row, [sw, fillW(t), r]);
    add(hp, fillW(row));
  });
  add(hp, VV({ name: 'More', pad: [4, 0, 8, 0] }, [btn('Ghost', 'SM', 'My horses', { trail: 'arrow-right' })]));
  return screen(name, 'Home', [pageHeader({ title: 'Saigon Turf Club', summary: summary })].concat(lead, [split(movesBlock, hp, SIDE.narrow)]), { asOf: asOf });
}
function scrHome() {
  var items = [
    owedItem('Overdue', 'Upload a signed bill of sale', 'CBRT-2026-041 · Silver Bell · Proof of ownership', 'Rejected 24 Sep by Lan, transport specialist: the bill of sale is unsigned. Upload a signed copy.', 'Overdue by 1 day', 'Was due 25 Sep', 'Upload signed copy', 'upload'),
    owedItem('Soon', 'Accept or decline quotation v2', 'REQ-2026-0179 · Q-2026-0188 · $38,019.20', 'Phnom Penh → Hong Kong (Sha Tin) for Nightfall and Shadowfax. It holds its price until 30 Sep; after that Yến re-prices it.', 'Due in 4 days', '30 Sep 2026', 'Open quotation', null, { secondary: true }),
    owedItem('Soon', 'Extend transit insurance to 20 Oct', 'CBRT-2026-041 · Shipment · PVI Insurance policy', 'The policy ends 15 Oct, before arrival plus 2 days (20 Oct). Upload the extended policy.', 'Due in 4 days', '30 Sep 2026', 'Upload extended policy', 'upload', { secondary: true }),
    owedItem('Upcoming', 'Book a new EIA (Coggins) test', 'CBRT-2026-041 · Nightfall · EIA (Coggins) test', 'Valid today, but 77 days old at departure; the limit is 60. The new test must be dated 19 Aug or later.', 'Due in 8 days', '4 Oct 2026', 'Upload test result', 'upload'),
    owedItem('Upcoming', 'Upload a new influenza booster record', 'CBRT-2026-041 · Silver Bell · Influenza vaccination', 'The booster lapsed on 16 Sep. Give a new booster at least 7 days before departure and upload the record.', 'Due in 15 days', '11 Oct 2026', 'Upload booster record', 'upload')
  ];
  var owed = owedPanel('5 items', 'Across 2 requests, soonest first. Each upload is checked against your travel dates the moment you send it.', items, { chipTone: 'Bad', chipLabel: '1 overdue' }, 'See each request in My requests');
  return homeScreen('Home', '3 requests in progress and 4 horses. Next departure: Ho Chi Minh City → Phnom Penh, 18 Oct, locked until its documents clear.',
    [owed], HOME_MOVES, HOME_HORSES, 'Documents cleared for the 18 Oct move, CBRT-2026-041.', '26 Sep 2026, 11:20');
}
/* 15 Oct: every document cleared and nothing owed anywhere; the page leads with the next event, and nothing is gold */
function scrHomeClear() {
  var lead = nothingOwed('Nothing needed from you', 'All 23 documents for CBRT-2026-041 cleared on 14 Oct. Minh, driver, collects all four horses at Phú Thọ training centre.', 'Departs in 3 days', '18 Oct 2026, 06:00');
  return homeScreen('Home · Nothing owed', '3 requests in progress and 4 horses. Next departure: Ho Chi Minh City → Phnom Penh, 18 Oct, cleared to depart.', [lead], [
    ['Ho Chi Minh City → Phnom Penh', 'REQ-2026-0162', 'job CBRT-2026-041 · 4 horses · road, private trailer', 'Clearance', 'Cleared to depart', 'status/ok/fg', 'In 3 days', '18 Oct 2026'],
    ['Phnom Penh → Bangkok', 'REQ-2026-0193', '2 horses · road, shared load · pickup moved to Phnom Penh', 'Quotation', 'Yến is pricing version 2; nothing needed', 'text/secondary', 'In 15 days', '30 Oct 2026'],
    ['Phnom Penh → Hong Kong (Sha Tin)', 'REQ-2026-0179', 'quotation Q-2026-0188 accepted · 2 horses · air, business class', 'Approval', 'With Yến for approval; nothing needed', 'text/secondary', 'In 36 days', '20 Nov 2026']
  ], [
    ['Shadowfax', 'coat/grey', 'Grey · Andalusian gelding', '5 of 5 cleared', null],
    ['Nightfall', 'coat/black', 'Black · Thoroughbred mare', '5 of 5 cleared', null],
    ['Copper King', 'coat/chestnut', 'Chestnut · Quarter Horse stallion', '5 of 5 cleared', null],
    ['Silver Bell', 'coat/grey', 'Grey · Lipizzan mare', '5 of 5 cleared', null]
  ], 'Documents cleared for the 18 Oct move, CBRT-2026-041.', '15 Oct 2026, 09:00', true);
}
/* 18 Oct, 08:41: the move on the road leads, with its last confirmed checkpoint, the same panel as Tracking · In transit */
function scrHomeRoad() {
  var lead = nothingOwed('Nothing needed from you', 'Your horses cleared the Mộc Bài – Bavet border at 08:34. Next checkpoint: the Svay Rieng welfare stop.', 'Expected in 49 min', '09:30');
  return homeScreen('Home · On the road', '3 requests in progress and 4 horses. On the road now: Ho Chi Minh City → Phnom Penh, arriving about 12:30.', [lead, onTheRoad()], [
    ['Ho Chi Minh City → Phnom Penh', 'REQ-2026-0162', 'job CBRT-2026-041 · 4 horses · road, private trailer', 'Trip', 'On the road since 06:05', 'status/info/fg', 'Arrives in 4 h', '18 Oct, 12:30'],
    ['Phnom Penh → Bangkok', 'REQ-2026-0193', '2 horses · road, shared load · pickup moved to Phnom Penh', 'Quotation', 'Yến is pricing version 2; nothing needed', 'text/secondary', 'In 12 days', '30 Oct 2026'],
    ['Phnom Penh → Hong Kong (Sha Tin)', 'REQ-2026-0179', 'quotation Q-2026-0188 accepted · 2 horses · air, business class', 'Approval', 'With Yến for approval; nothing needed', 'text/secondary', 'In 33 days', '20 Nov 2026']
  ], [
    ['Shadowfax', 'coat/grey', 'Grey · Andalusian gelding', 'Stall 1 · standard', 'Sound at 08:40', 'status/ok/fg'],
    ['Nightfall', 'coat/black', 'Black · Thoroughbred mare', 'Stall 4 · climate', 'Calm again at 08:40', 'status/ok/fg'],
    ['Copper King', 'coat/chestnut', 'Chestnut · Quarter Horse stallion', 'Stall 2 · box', 'Sound at 08:40', 'status/ok/fg'],
    ['Silver Bell', 'coat/grey', 'Grey · Lipizzan mare', 'Stall 6 · standard', 'Sound at 08:40', 'status/ok/fg']
  ], 'All four on CBRT-2026-041, with Hoa’s last condition log.', '18 Oct 2026, 08:41', true);
}
var RULES_EXAMPLE = [['passport', 'Valid through 20 Oct'], ['vacc', '21 Apr–11 Oct'], ['eia', 'On or after 19 Aug'], ['health', '8–18 Oct'], ['own', 'Any date']];
/* ---------- Photography ----------
   A photo is a material, like the brass nameplate: it reads the same in both themes, so a photo panel is drawn
   in Dark mode with a navy scrim under its text. The generator draws the panel with a flat placeholder fill
   named "Photo · <key>"; the picture is uploaded into that fill from docs/design-assets/ (drafts for now,
   to be replaced by licensed photographs). */
var NAVY = '#0B1524';
function photoPanel(o) {
  var f = F({ name: 'Photo · ' + o.key, dir: o.dir || 'V', w: o.w, h: o.h, gap: o.gap || 0, pad: o.pad, main: o.main, cross: o.cross, fill: 'bg/sunken', clip: true });
  if (COLL.dark) f.setExplicitVariableModeForCollection(COLL.color, COLL.dark);
  var scrim = figma.createRectangle(); scrim.name = 'Scrim';
  scrim.fills = [gradient(o.scrim, o.vertical)];
  f.appendChild(scrim);
  scrim.layoutPositioning = 'ABSOLUTE'; scrim.x = 0; scrim.y = 0; scrim.resize(Math.max(f.width, 1), Math.max(f.height, 1));
  scrim.constraints = { horizontal: 'STRETCH', vertical: 'STRETCH' };
  return f;
}
/* ---------- The travel pass ----------
   An example of what a club holds when a move is ready: the route, the facts that matter, the date each
   document must carry, and a stub that says the gate is open. Labelled Example; it names no horse or club. */
function travelPass() {
  var pass = primaryTheme(H({ name: 'Travel pass · Example', w: 520, radius: 16, fill: 'surface/card', clip: true }));
  effect(pass, 'Elevation/2 Overlay');
  var main = VV({ name: 'Pass', gap: 18, pad: [24, 24, 24, 28] });
  var top = H({ name: 'Top', main: 'SPACE_BETWEEN', cross: 'CENTER' });
  addAll(top, [Tx('Travel pass', 'Label/S', 'text/tertiary'), chip('Neutral', 'Example', { noDot: true })]);
  var end = function (code, city, align) { var v = VV({ name: city, gap: 2, cross: align }); addAll(v, [Tx(code, 'Mono/Data L', 'text/primary', { name: 'Code' }), Tx(city, 'Body/S', 'text/secondary', { name: 'City' })]); return v; };
  var leg = H({ name: 'Leg', gap: 8, cross: 'CENTER', pad: [0, 0, 18, 0] });
  addAll(leg, [fillW(rect(20, 1, 'border/strong', 'Line')), Ic('truck', 18, 'text/secondary'), fillW(rect(20, 1, 'border/strong', 'Line'))]);
  var route = H({ name: 'Route', gap: 14, cross: 'CENTER' });
  addAll(route, [end('HCM', 'Ho Chi Minh City', 'MIN'), fillW(leg), end('PNH', 'Phnom Penh', 'MAX')]);
  var facts = VV({ name: 'Facts', gap: 12 });
  [[['Departs', '18 Oct · 06:00', true], ['Border', 'Mộc Bài – Bavet']], [['Horses', '4 · private trailer'], ['Arrival window', '11:00–14:00', true]]].forEach(function (pair, i) {
    var r = H({ name: 'Row ' + (i + 1), gap: 16 });
    pair.forEach(function (f) { var c = VV({ name: f[0], gap: 2 }); addAll(c, [Tx(f[0], 'Body/S', 'text/tertiary'), Tx(f[1], f[2] ? 'Mono/Data' : 'Label/M', 'text/primary')]); add(r, fillW(c)); });
    add(facts, fillW(r));
  });
  var docs = VV({ name: 'Documents', gap: 8 });
  add(docs, Tx('Each document must carry', 'Body/S', 'text/tertiary'));
  RULES_EXAMPLE.forEach(function (d) {
    var r = H({ name: DOCNAME[d[0]], gap: 12, cross: 'CENTER' });
    addAll(r, [Tx(DOCNAME[d[0]], 'Label/S', 'text/primary', { fill: true }), Tx(d[1], 'Mono/Caption', 'text/secondary', { align: 'RIGHT' })]);
    add(docs, fillW(r));
  });
  addAll(main, [fillW(top), fillW(route), fillW(facts), divider(), fillW(docs)]);
  /* the tear line between pass and stub */
  var perf = VV({ name: 'Perforation', gap: 8, pad: [10, 0, 10, 0], w: 4, cross: 'CENTER', clip: true });
  for (var k = 0; k < 36; k++) add(perf, dot(3, 'border/strong', 'Hole'));
  var stub = VV({ name: 'Stub', gap: 12, pad: [24, 18, 24, 18], w: 140, fill: 'bg/sunken', main: 'SPACE_BETWEEN' });
  var gate = VV({ name: 'Gate', gap: 8 });
  var ic = H({ name: 'Icon wrap', w: 32, h: 32, radius: 999, fill: 'status/ok/bg', main: 'CENTER', cross: 'CENTER' });
  add(ic, Ic('unlock', 16, 'status/ok/fg'));
  addAll(gate, [ic, Tx('Clear to depart', 'Label/M', 'text/primary', { w: 104 }), Tx('23 of 23 documents cleared', 'Body/S', 'text/secondary', { w: 104 })]);
  var bars = H({ name: 'Code bars', gap: 2, h: 36 });
  [2, 1, 3, 1, 1, 2, 1, 3, 2, 1, 1, 2, 3, 1, 2, 1, 2].forEach(function (w) { add(bars, rect(w, 36, 'text/primary', 'Bar')); });
  addAll(stub, [gate, VV({ name: 'Code', gap: 6 }, [bars, Tx('Example only', 'Mono/Caption', 'text/tertiary')])]);
  addAll(pass, [fillW(main), perf, stub]);
  perf.layoutSizingVertical = 'FILL'; stub.layoutSizingVertical = 'FILL';
  return pass;
}
/* the pass, introduced: what a club holds once a move is approved */
function passSection() {
  var row = H({ name: 'Pass row', gap: 64, cross: 'CENTER' });
  var t = VV({ name: 'Copy', gap: 16 });
  addAll(t, [Tx('Every move, on one pass', 'Display/L'), Tx('Once a request is approved, the move gets its own pass: the route, the departure, your arrival window, and the date each document must carry for the crossings on your route.', 'Body/M', 'text/secondary', { w: 520 })]);
  var pts = VV({ name: 'Points', gap: 10, pad: [8, 0, 0, 0] });
  ['Dates worked out for your route and departure', 'Every upload checked against those dates, not today', 'Departure unlocks the moment every document clears'].forEach(function (x) {
    var r = H({ name: x, gap: 10, cross: 'CENTER' });
    addAll(r, [Ic('check', 16, 'status/ok/fg'), Tx(x, 'Body/M', 'text/primary')]);
    add(pts, r);
  });
  add(t, pts);
  addAll(row, [fillW(t), travelPass()]);
  return VV({ name: 'Your move', pad: [80, 0, 0, 0] }, [fillW(row)]);
}
/* ---------- Where we move horses: a schematic map ----------
   Drawn like a transit map, not a survey map: positions follow longitude and latitude, but the empty sea
   east of 107°E is squeezed so the six countries get the room. Roads are solid, air is dashed, and each
   border crossing is a gate on its road. */
var MAP = { w: 760, h: 560 };
function mx(lon) { return lon <= 107 ? 40 + (lon - 99.5) * 62 : 505 + (lon - 107) * 28; }
function my(lat) { return 30 + (23 - lat) * 24.4; }
/* label side: r right, l left, la left and above (where a road leaves to the right or below) */
var MAP_CITIES = [['HCM', 'Ho Chi Minh City', 106.7, 10.8, 'r'], ['PNH', 'Phnom Penh', 104.9, 11.6, 'l'], ['BKK', 'Bangkok', 100.5, 13.8, 'la'], ['VTE', 'Vientiane', 102.6, 17.97, 'l'], ['HAN', 'Hanoi', 105.8, 21.0, 'r'], ['KUL', 'Kuala Lumpur', 101.7, 3.1, 'r'], ['HKG', 'Hong Kong', 114.2, 22.3, 'la']];
/* [from, to, crossing, gate lon/lat, label offset] */
var MAP_ROADS = [
  ['HCM', 'PNH', 'Mộc Bài – Bavet', 105.8, 11.2, [-96, 16]],
  ['PNH', 'BKK', 'Poipet – Aranyaprathet', 102.55, 13.65, [-74, -28]],
  ['BKK', 'VTE', 'Nong Khai – Vientiane', 102.18, 17.14, [16, -2]],
  ['BKK', 'KUL', 'Sadao – Bukit Kayu Hitam', 100.45, 6.55, [16, -8]],
  ['HAN', 'VTE', 'Cầu Treo – Nam Phao', 105.1, 18.4, [16, -6]]
];
var MAP_AIR = [['HCM', 112, 12], ['PNH', 110, 16]];
var MAP_LABELS = [['VIETNAM', 106.3, 14.6], ['CAMBODIA', 104.5, 13.2], ['THAILAND', 101.3, 19.3], ['LAOS', 104, 19.8], ['MALAYSIA', 102.8, 4.8], ['Gulf of Thailand', 101.8, 9.5], ['South China Sea', 111.5, 9]];
function cityXY(code) { var c = MAP_CITIES.filter(function (x) { return x[0] === code; })[0]; return [mx(c[2]), my(c[3])]; }
function mapSvg(paths, dashed) {
  return '<svg width="' + MAP.w + '" height="' + MAP.h + '" viewBox="0 0 ' + MAP.w + ' ' + MAP.h + '" fill="none" xmlns="http://www.w3.org/2000/svg">' +
    paths.map(function (d) { return '<path d="' + d + '" stroke="#000" stroke-width="2"' + (dashed ? ' stroke-dasharray="6 6"' : '') + '/>'; }).join('') + '</svg>';
}
function mapLayer(name, paths, token, weight, dash) {
  var f = figma.createNodeFromSvg(mapSvg(paths, !!dash));
  f.name = name; f.fills = [];
  f.findAll(function (n) { return n.type === 'VECTOR'; }).forEach(function (v) {
    v.strokes = [P(token)]; v.strokeWeight = weight; v.strokeCap = 'ROUND'; v.strokeJoin = 'ROUND';
    if (dash) v.dashPattern = dash;
  });
  return f;
}
function routeMap() {
  var m = F({ name: 'Map', w: MAP.w, h: MAP.h, fill: 'bg/sunken', radius: 12, clip: true });
  var put = function (n, x, y) { m.appendChild(n); n.x = Math.round(x); n.y = Math.round(y); return n; };
  for (var gx = 76; gx < MAP.w; gx += 76) { var v = rect(1, MAP.h, 'border/default', 'Grid'); v.opacity = 0.6; put(v, gx, 0); }
  for (var gy = 70; gy < MAP.h; gy += 70) { var hz = rect(MAP.w, 1, 'border/default', 'Grid'); hz.opacity = 0.6; put(hz, 0, gy); }
  MAP_LABELS.forEach(function (l) {
    var sea = l[0] !== l[0].toUpperCase();
    var t = Tx(l[0], sea ? 'Body/S' : 'Mono/Eyebrow', 'text/tertiary', { name: 'Area · ' + l[0], noStyle: sea });
    if (sea) t.fontName = FONT['display/Italic'];
    put(t, mx(l[1]) - t.width / 2, my(l[2]) - t.height / 2);
  });
  var roads = MAP_ROADS.map(function (r) { var a = cityXY(r[0]), b = cityXY(r[1]); return 'M' + a[0] + ' ' + a[1] + ' L' + mx(r[3]) + ' ' + my(r[4]) + ' L' + b[0] + ' ' + b[1]; });
  var hk = cityXY('HKG');
  var air = MAP_AIR.map(function (r) { var a = cityXY(r[0]); return 'M' + a[0] + ' ' + a[1] + ' Q' + mx(r[1]) + ' ' + my(r[2]) + ' ' + hk[0] + ' ' + hk[1]; });
  put(mapLayer('Air', air, 'text/tertiary', 2, [6, 6]), 0, 0);
  put(mapLayer('Roads', roads, 'text/primary', 3), 0, 0);
  MAP_ROADS.forEach(function (r) {
    var g = H({ name: 'Gate · ' + r[2], w: 20, h: 20, radius: 999, fill: 'surface/card', stroke: 'text/primary', sw: 1.5, main: 'CENTER', cross: 'CENTER' });
    add(g, Ic('flag', 11, 'text/primary'));
    put(g, mx(r[3]) - 10, my(r[4]) - 10);
    put(Tx(r[2], 'Mono/Caption', 'text/secondary', { name: 'Crossing · ' + r[2] }), mx(r[3]) + r[5][0], my(r[4]) + r[5][1]);
  });
  MAP_CITIES.forEach(function (c) {
    var x = mx(c[2]), y = my(c[3]);
    var d = dot(14, 'surface/card', 'City · ' + c[1]); d.strokes = [P('text/primary')]; d.strokeWeight = 3; d.strokeAlign = 'INSIDE';
    put(d, x - 7, y - 7);
    var lb = VV({ name: 'Label · ' + c[1], gap: 0, cross: c[4] === 'r' ? 'MIN' : 'MAX' });
    addAll(lb, [Tx(c[1], 'Label/S', 'text/primary'), Tx(c[0], 'Mono/Caption', 'text/tertiary')]);
    m.appendChild(lb);
    lb.x = Math.round(c[4] === 'r' ? x + 12 : c[4] === 'l' ? x - 12 - lb.width : x + 8 - lb.width); lb.y = Math.round(c[4] === 'la' ? y - 44 : y - 10);
  });
  return m;
}
function routeMapRow() {
  var row = H({ name: 'Map row', gap: 24 });
  var side = panel('Corridors', { gap: 0, pad: [20, 24, 12, 24] });
  add(side, VV({ name: 'Title', gap: 4, pad: [0, 0, 14, 0] }, [Tx('Corridors we run', 'Heading/H4'), Tx('Each road corridor crosses at one border post. Air goes through Hong Kong.', 'Body/S', 'text/tertiary', { w: 360 })]));
  [['Ho Chi Minh City → Phnom Penh', 'Road · Mộc Bài – Bavet'], ['Phnom Penh → Bangkok', 'Road · Poipet – Aranyaprathet'], ['Bangkok → Vientiane', 'Road · Nong Khai – Vientiane'], ['Bangkok → Kuala Lumpur', 'Road · Sadao – Bukit Kayu Hitam'], ['Hanoi → Vientiane', 'Road · Cầu Treo – Nam Phao'], ['Ho Chi Minh City, Phnom Penh → Hong Kong', 'Air · Economy, Business, First stalls']].forEach(function (c) {
    var r = H({ name: c[0], gap: 12, pad: [10, 0, 10, 0], cross: 'CENTER' });
    borderSide(r, 'border/default', 'top');
    var air = c[1].indexOf('Air') === 0;
    var key = H({ name: 'Key', w: 28, h: 12, cross: 'CENTER' });
    var ln = rect(28, air ? 2 : 3, air ? 'text/tertiary' : 'text/primary', 'Line'); if (air) ln.dashPattern = [6, 6];
    add(key, fillW(ln));
    var t = VV({ name: 'Text', gap: 2 });
    addAll(t, [Tx(c[0], 'Label/S', 'text/primary', { fill: true }), Tx(c[1], 'Body/S', 'text/tertiary', { fill: true })]);
    addAll(r, [key, fillW(t)]);
    add(side, fillW(r));
  });
  addAll(row, [routeMap(), fillW(side)]);
  return row;
}
/* feature cards stretch to the tallest, and every visual is one height, so the titles line up */
var FEATURE_VISUAL_H = 132;
function featureCard(visual, title, body) {
  var c = panel(title, { gap: 16, pad: 28 });
  visual.resize(visual.width, FEATURE_VISUAL_H); visual.layoutSizingVertical = 'FIXED';
  addAll(c, [fillW(visual), Tx(title, 'Heading/H3', 'text/primary', { fill: true }), Tx(body, 'Body/S', 'text/secondary', { fill: true })]);
  return sz(fillW(c), 'h', 'FILL');
}
/* the track fills its panel; its marks are pinned by constraints, so they land inside it at any width */
function windowVisual() {
  var f = VV({ name: 'Window visual', gap: 8, pad: 16, radius: 8, fill: 'bg/sunken' });
  var track = F({ name: 'Track', w: 300, h: 28 });
  var line = rect(300, 2, 'border/strong', 'Axis'); line.y = 13; track.appendChild(line); line.constraints = { horizontal: 'STRETCH', vertical: 'MIN' };
  var win = rect(148, 10, 'status/ok/bg', 'Valid window', 999); track.appendChild(win); win.x = 150; win.y = 9; win.strokes = [P('status/ok/border')]; win.strokeWeight = 1; win.constraints = { horizontal: 'SCALE', vertical: 'MIN' };
  var issued = dot(12, 'status/warn/fg', 'Test date'); issued.x = 92; issued.y = 8; track.appendChild(issued); issued.constraints = { horizontal: 'CENTER', vertical: 'MIN' };
  var dep = rect(2, 28, 'text/primary', 'Departure'); dep.x = 298; track.appendChild(dep); dep.constraints = { horizontal: 'MAX', vertical: 'MIN' };
  add(f, fillW(track));
  var lbl = H({ name: 'Labels', gap: 8, wrap: true, rowGap: 4 });
  addAll(lbl, [Tx('Test 2 Aug', 'Mono/Caption', 'status/warn/fg'), Tx('60-day window', 'Mono/Caption', 'status/ok/fg'), Tx('Departs 18 Oct', 'Mono/Caption', 'text/primary')]);
  add(f, fillW(lbl));
  add(f, chip('Warn', 'Expires in transit'));
  return f;
}
/* each row: the class name, a bar that fills what is left, then the positions it holds */
function widthVisual() {
  var f = VV({ name: 'Width visual', gap: 10, pad: 16, radius: 8, fill: 'bg/sunken', main: 'CENTER' });
  [['Economy', 3, '3 × 32 in'], ['Business', 2, '2 × 48 in'], ['First', 1, '1 × 96 in']].forEach(function (r) {
    var row = H({ name: r[0], gap: 10, cross: 'CENTER' });
    var bar = H({ name: 'Stall', gap: 3, h: 18 });
    for (var i = 0; i < r[1]; i++) add(bar, fillW(rect(10, 18, i === 0 ? 'stall/standard' : 'stall/box', 'Position', 4)));
    addAll(row, [Tx(r[0], 'Body/S', 'text/secondary', { w: 64 }), fillW(bar), Tx(r[2], 'Mono/Caption', 'text/tertiary')]);
    add(f, fillW(row));
  });
  return f;
}
function quoteVisual() {
  var f = VV({ name: 'Quote visual', gap: 10, pad: 16, radius: 8, fill: 'bg/sunken' });
  [['Air stall position', 'Neutral', 'Fixed', '$16,800'], ['Pre-export isolation', 'Neutral', 'Fixed', '$2,170'], ['Waiting time, 2 h', 'Warn', 'Estimated', '$190']].forEach(function (r) {
    var row = H({ name: r[0], gap: 10, cross: 'CENTER' });
    addAll(row, [Tx(r[0], 'Body/S', 'text/primary', { fill: true }), chip(r[1], r[2], { noDot: true }), Tx(r[3], 'Mono/Caption', 'text/primary', { w: 60, align: 'RIGHT' })]);
    add(f, fillW(row));
  });
  return f;
}

/* ---------------------------------------------------------------------
   Screen: My horses (desktop + mobile)
   --------------------------------------------------------------------- */
function addHorseCard(w, h) {
  var c = VV({ name: 'Add a horse', gap: 12, pad: 32, w: w, h: h, radius: 12, stroke: 'border/strong', dash: [6, 4], main: 'CENTER', cross: 'CENTER' });
  var badge = H({ name: 'Badge', w: 44, h: 44, radius: 999, fill: 'surface/muted', main: 'CENTER', cross: 'CENTER' });
  add(badge, Ic('plus', 22, 'text/secondary'));
  addAll(c, [badge, Tx('Add a horse', 'Heading/H4'), Tx('Name, sex, size class and microchip are needed for quotes and border checks.', 'Body/S', 'text/tertiary', { w: 260, align: 'CENTER' })]);
  return c;
}
function scrHorses() {
  var grid = H({ name: 'Horse grid', gap: 24, wrap: true, rowGap: 24 });
  var cards = HORSES.map(horseCard);
  addAll(grid, cards);
  add(grid, addHorseCard(CARD_W, cards[0].height));
  return screen('My horses', 'My horses', [
    pageHead('My horses', '4 horses · Saigon Turf Club. Profiles feed transport requests, load plans and document checks.'),
    grid
  ]);
}
function scrHorsesMobile() {
  var s = VV({ name: 'My horses · Mobile', w: 390, fill: 'bg/canvas' });
  add(s, fillW(inst(C.headerM)));
  var m = VV({ name: 'Content', gap: 20, pad: [24, 16, 48, 16] });
  addAll(m, [Tx('My horses', 'Display/M'), Tx('4 horses · Saigon Turf Club', 'Body/S', 'text/secondary', { fill: true }), btn('Primary', 'MD', 'Add horse', { lead: 'plus', fill: true })]);
  add(m, fillW(horseCard(HORSES[1])));
  add(m, fillW(horseCard(HORSES[2])));
  add(s, fillW(m));
  return s;
}

/* ---------------------------------------------------------------------
   Screens: Request transport (steps 1, 2, 4; step 3 Service is in 14-service.js)
   The route comes before the service: distance, border crossings and whether
   any air service exists all depend on it, and they decide the service choices.
   --------------------------------------------------------------------- */
/* ---------- the draft pass ----------
   The wizard's side column is the request drawn as the pass it becomes once approved (the landing
   introduces the pass). It fills in as the steps are done: a value no step has set yet says which step
   sets it, and the stub carries the indicative range, never a price.
   o: { route: bool, from, to: [code, city], mode: 'air', chip: [tone, label], rows: [[label, value, mono, tone] | [label, null, step]], stubLabel, range, rangeSub }
   The quotation page reuses it with the quoted total in the stub. */
var DRAFT_ROUTE = { from: ['HCM', 'Ho Chi Minh City'], to: ['BKK', 'Bangkok'] };
function draftPass(o) {
  var pass = VV({ name: 'Draft pass', w: SIDE.narrow, radius: 16, fill: 'surface/card', stroke: 'border/default', clip: true });
  effect(pass, 'Elevation/1 Card');
  var main = VV({ name: 'Pass', gap: 18, pad: [20, 24, 18, 24] });
  var top = H({ name: 'Top', main: 'SPACE_BETWEEN', cross: 'CENTER' });
  var ch = o.chip || ['Neutral', 'Draft'];
  addAll(top, [Tx('Your move', 'Label/S', 'text/tertiary'), chip(ch[0], ch[1], { noDot: ch[0] === 'Neutral' })]);
  var set = !!o.route;
  var end = function (c, align) {
    var v = VV({ name: set ? c[1] : 'Not set', gap: 2, cross: align });
    addAll(v, [Tx(set ? c[0] : '···', 'Mono/Data L', set ? 'text/primary' : 'text/tertiary', { name: 'Code' }), Tx(set ? c[1] : (align === 'MIN' ? 'From' : 'To'), 'Body/S', set ? 'text/secondary' : 'text/tertiary', { name: 'City' })]);
    return v;
  };
  var leg = H({ name: 'Leg', gap: 8, cross: 'CENTER', pad: [0, 0, 18, 0] });
  addAll(leg, [fillW(rect(20, 1, set ? 'border/strong' : 'border/default', 'Line')), Ic(o.mode === 'air' ? 'plane' : 'truck', 18, set ? 'text/secondary' : 'text/tertiary'), fillW(rect(20, 1, set ? 'border/strong' : 'border/default', 'Line'))]);
  var route = H({ name: 'Route', gap: 14, cross: 'CENTER' });
  addAll(route, [end(o.from || DRAFT_ROUTE.from, 'MIN'), fillW(leg), end(o.to || DRAFT_ROUTE.to, 'MAX')]);
  var facts = VV({ name: 'Facts', gap: 0 });
  [['Horses', coatRow(COAT041.slice(0, 2), '2 horses')]].concat(o.rows).forEach(function (f) {
    var r = H({ name: f[0], gap: 16, pad: [10, 0, 10, 0], main: 'SPACE_BETWEEN', cross: 'CENTER' });
    borderSide(r, 'border/default', 'top');
    var val = f[1] == null ? Tx('Set on step ' + f[2], 'Body/S', 'text/tertiary', { name: 'Not set' })
      : typeof f[1] === 'string' ? Tx(f[1], f[2] ? 'Mono/Data' : 'Label/S', f[3] || 'text/primary', { name: 'Value', align: 'RIGHT' }) : f[1];
    addAll(r, [Tx(f[0], 'Body/S', 'text/tertiary'), val]);
    add(facts, fillW(r));
  });
  addAll(main, [fillW(top), fillW(route), fillW(facts)]);
  /* the tear line between the pass and its stub */
  var perf = H({ name: 'Perforation', gap: 8, pad: [0, 12, 0, 12], h: 12, main: 'CENTER', cross: 'CENTER', clip: true });
  for (var k = 0; k < 34; k++) add(perf, dot(3, 'border/strong', 'Hole'));
  var stub = VV({ name: 'Stub', gap: 6, pad: [16, 24, 22, 24], fill: 'bg/sunken' });
  addAll(stub, [Tx(o.stubLabel || 'Indicative range', 'Body/S', 'text/secondary'), Tx(o.range || '—', 'Display/M', o.range ? 'text/primary' : 'text/tertiary', { name: 'Range' }), Tx(o.rangeSub, 'Body/S', 'text/tertiary', { name: 'Sub', fill: true })]);
  addAll(pass, [fillW(main), fillW(perf), fillW(stub)]);
  return pass;
}
var DRAFT_SUB = 'Not a quote. A logistics manager prices the move after review; the quotation is itemised and valid for 7 days.';
var DRAFT_BORDERS = ['Borders', '2 · Mộc Bài, Poipet'];
function requestLayout(title, stepStates, left, right) {
  var body = H({ name: 'Body', gap: 24 });
  right.resize(SIDE.narrow, right.height); right.layoutSizingHorizontal = 'FIXED';
  addAll(body, [fillW(left), right]);
  return screen(title, 'My requests', [
    pageHead('Request transport', 'Draft saved 25 Sep 2026. Your move fills in on the right as you go; the binding price comes as an itemised quotation.'),
    stepper(stepStates),
    body
  ]);
}
/* a horse to pick: her coat (or her photo) as a swatch, her name, what decides her stall, and a note
   when choosing her changes the plan for another horse */
function horsePick(h, sel, note) {
  var c = VV({ name: 'Horse · ' + h.name, gap: 14, pad: 20, radius: 12, fill: sel ? 'surface/raised' : 'surface/card', stroke: sel ? 'text/secondary' : 'border/default', sw: sel ? 1.5 : 1 });
  var top = H({ name: 'Top', gap: 14, cross: 'CENTER' });
  var sw = F({ name: h.photo ? 'Photo · ' + h.name : 'Coat', w: 48, h: 48, radius: 999, fill: 'coat/' + h.coat.toLowerCase() });
  var id = VV({ name: 'Name', gap: 2 });
  addAll(id, [Tx(h.name, 'Heading/H4'), Tx(h.sub + ' · ' + h.age, 'Body/S', 'text/tertiary')]);
  var cb = inst(C.checkbox, { Checked: sel ? 'True' : 'False' }); setP(cb, { 'Show label': false }); cb.name = 'Indicator';
  addAll(top, [sw, fillW(id), cb]);
  var meta = H({ name: 'Meta', gap: 8, cross: 'CENTER', wrap: true, rowGap: 8 });
  add(meta, Tx(h.size + ' in · ' + h.weight, 'Mono/Caption', 'text/secondary'));
  h.tags.forEach(function (t) { add(meta, chip(t[0], t[1], { noDot: t[0] === 'Neutral' })); });
  addAll(c, [fillW(top), fillW(meta)]);
  if (note) add(c, Tx(note, 'Body/S', 'status/warn/fg', { fill: true }));
  return c;
}
function scrRequest1() {
  var left = VV({ name: 'Step 1', gap: 24 });
  addAll(left, [Tx('Which horses are travelling?', 'Heading/H3'), Tx('All horses in one request share the same route and dates. Size class and temperament decide stall allocation.', 'Body/M', 'text/secondary', { fill: true })]);
  var grid = VV({ name: 'Horse options', gap: 16 });
  [[[HORSES[0], true], [HORSES[1], true]], [[HORSES[2], false, 'Never next to a mare: with Nightfall on board, the load plan keeps them apart.'], [HORSES[3], false]]].forEach(function (pair, i) {
    var row = H({ name: 'Row ' + (i + 1), gap: 16 });
    pair.forEach(function (p) { var c = horsePick(p[0], p[1], p[2]); add(row, fillW(c)); c.layoutSizingVertical = 'FILL'; });
    add(grid, fillW(row));
  });
  add(left, fillW(grid));
  add(left, callout('Info', 'Nightfall needs a climate-controlled stall', 'We have added one to this request. You will see it on the Service step.'));
  var foot = H({ name: 'Footer', main: 'SPACE_BETWEEN', cross: 'CENTER' });
  addAll(foot, [Tx('2 horses selected', 'Label/M', 'text/secondary'), btn('Primary', 'MD', 'Continue', { trail: 'arrow-right' })]);
  add(left, fillW(foot));
  return requestLayout('Request · 1 Horses', ['Current', 'Upcoming', 'Upcoming', 'Upcoming'], left, draftPass({ route: false,
    rows: [['Departs', null, 2], ['Arrival', null, 2], ['Borders', null, 2], ['Service', null, 3]],
    range: null, rangeSub: 'Appears once your route is set: distance and border crossings drive most of the price.' }));
}
/* the route as the customer sets it: the road from pickup to destination, each border crossing a gate */
var MAP_REQ = {
  bounds: [100.2, 107.0, 10.4, 14.3],
  /* each border is a short tick through its gate, so it never runs through a label */
  borders: [[[106.18, 11.3], [106.12, 11.08], [106.05, 10.95]], [[102.48, 13.95], [102.56, 13.66], [102.66, 13.35]]],
  areas: [['VIETNAM', 106.5, 13.6], ['CAMBODIA', 104.6, 13.5], ['THAILAND', 101.6, 11.8]],
  road: [[106.66, 10.86], [106.12, 11.08], [104.92, 11.56], [103.5, 13.0], [102.56, 13.66], [100.5, 13.75]]
};
function routeReqMap(w, h) {
  return jobMap({ w: w, h: h, end: 100.5, bounds: MAP_REQ.bounds, borders: MAP_REQ.borders, areas: MAP_REQ.areas, paths: [{ pts: MAP_REQ.road, kind: 'todo' }],
    stops: [[106.66, 10.86, 'Ho Chi Minh City', 'Pickup', 'stop', 'todo', 'a'], [106.12, 11.08, 'Mộc Bài – Bavet', 'Border 1', 'gate', 'todo', 'b'], [104.92, 11.56, 'Phnom Penh', 'Via', 'stop', 'todo', 'a'],
      [102.56, 13.66, 'Poipet – Aranyaprathet', 'Border 2', 'gate', 'todo', 'a'], [100.5, 13.75, 'Bangkok', '~960 km', 'stop', 'todo', 'b']] });
}
/* Arrival on step 2: by default we plan the fastest safe route and give an expected time; a road
   customer can instead buy an arrival window. A window is never an exact hour (at least 3 hours), it
   needs a private trailer so the departure is theirs, and if we arrive after it closes we pay the
   contract penalty from the rate catalog. The clock stops while an authority holds the trailer or a
   horse's welfare stops it, so the deadline never cuts a welfare stop or a border check. */
var WINDOW = { minHours: 3, premium: '+ $3,100 – $4,200', penalty: '10% of the job total for each started hour after the window closes, up to 30%' };
function arrivalOptions(win) {
  return svcSection('Arrival', 'Road moves only. By air, the airline’s schedule sets the arrival time.', svcOptions([
    [win ? 'Default' : 'Selected', 'Any time on the day', 'We plan the fastest safe route and tell you the expected time. Your dates can move by ±3 days.', 'In the estimate', 'clock'],
    [win ? 'Selected' : 'Default', 'Within a window', 'You choose a window of at least ' + WINDOW.minHours + ' hours. We use a private trailer so the departure is yours.', WINDOW.premium, 'calendar']], true));
}
function routeDates(name, win) {
  var left = VV({ name: 'Step 2', gap: 24 });
  addAll(left, [Tx('Route and dates', 'Heading/H3'), Tx('We work out the border crossings from the route. Cross-border moves need time for documents to clear.', 'Body/M', 'text/secondary', { fill: true })]);
  var r1 = H({ name: 'Places', gap: 16 });
  addAll(r1, [input('Select', 'Default', 'From', 'Ho Chi Minh City, Vietnam', null, { fill: true }), input('Select', 'Default', 'To', 'Bangkok, Thailand', null, { fill: true })]);
  add(left, fillW(r1));
  var mp = VV({ name: 'Your route', gap: 10 });
  addAll(mp, [fillW(routeReqMap(776, 280)), Tx('About 960 km by road with 2 border crossings, worked out from your route. The fleet coordinator plans the exact road and stops after approval.', 'Body/S', 'text/tertiary', { fill: true })]);
  add(left, fillW(mp));
  var r2 = H({ name: 'Dates', gap: 16 });
  addAll(r2, [win ? input('Date', 'Default', 'Departure date', '30 Oct 2026', null, { fill: true }) : input('Date', 'Error', 'Departure date', '5 Oct 2026', 'Cross-border moves need 21 days for document clearance. The earliest departure is 17 Oct 2026.', { fill: true }),
    input('Text', 'Default', 'Special instructions', 'Quiet loading. Vet check on arrival.', null, { fill: true })]);
  add(left, fillW(r2));
  add(left, fillW(arrivalOptions(win)));
  if (win) {
    var w = H({ name: 'Window', gap: 16 });
    addAll(w, [input('Date', 'Default', 'Arrive on', '31 Oct 2026', null, { fill: true }), input('Select', 'Default', 'From', '08:00', null, { fill: true }), input('Select', 'Default', 'Until', '12:00', 'A 4-hour window.', { fill: true })]);
    add(left, fillW(w));
    add(left, callout('Info', 'If we arrive after 12:00, we pay', 'The penalty is ' + WINDOW.penalty + ', credited on the final invoice. The clock stops while a border authority holds the trailer or a vet stops it for a horse’s welfare. Your quotation states the exact terms.'));
  } else {
    var cb = inst(C.checkbox, { Checked: 'True' }); setP(cb, { Label: 'My dates can move by ±3 days' });
    add(left, cb);
  }
  var foot = H({ name: 'Footer', main: 'SPACE_BETWEEN', cross: 'CENTER' });
  var rightBtns = H({ name: 'Forward', gap: 12 });
  if (!win) add(rightBtns, btn('Secondary', 'MD', 'Use 17 Oct 2026', { lead: 'calendar' }));
  add(rightBtns, btn('Primary', 'MD', 'Continue', { trail: 'arrow-right', state: win ? 'Default' : 'Disabled' }));
  addAll(foot, [btn('Secondary', 'MD', 'Back', { lead: 'arrow-left' }), rightBtns]);
  add(left, fillW(foot));
  return requestLayout(name, ['Done', 'Current', 'Upcoming', 'Upcoming'], left, draftPass({ route: true,
    rows: win ? [['Departs', '30 Oct 2026', true], ['Arrival', '31 Oct · 08:00–12:00', true], DRAFT_BORDERS, ['Service', null, 3]]
      : [['Departs', '5 Oct · too soon', true, 'status/bad/fg'], ['Arrival', 'Any time on the day'], DRAFT_BORDERS, ['Service', null, 3]],
    range: win ? '$14,400 – $20,300' : '$11,300 – $16,100',
    rangeSub: win ? 'Includes the private trailer your window needs. Not a quote.' : 'Assumes road with a shared load until you choose a service on step 3. Not a quote.' }));
}
function scrRequest2() { return routeDates('Request · 2 Route & dates (error)', false); }
function scrRequest2Window() { return routeDates('Request · 2 Route & dates · Arrival window', true); }
/* A route we don't run. The customer can name any city, but only a corridor in the catalog can be
   estimated or quoted, so the step says so in words, shows where our road ends, offers the nearest
   route we run, and lets the customer ask instead of guessing. Dates wait until the route is one we run.
   The map is schematic (a straight line, not geography): a transit map of where coverage stops. */
function routeNotRunMap(w, h) {
  return jobMap({ w: w, h: h, end: 9, bounds: [0, 10, 0, 1], borders: [[[3.6, 0.78], [3.6, 0.22]], [[7.9, 0.78], [7.9, 0.22]]],
    areas: [['THAILAND', 1.9, 0.86], ['MALAYSIA', 5.6, 0.86], ['SINGAPORE', 9, 0.86]],
    paths: [{ pts: [[1, 0.5], [6.6, 0.5]], kind: 'todo' }, { pts: [[6.6, 0.5], [9, 0.5]], kind: 'old' }],
    stops: [[1, 0.5, 'Bangkok', 'From', 'stop', 'todo', 'b'], [3.6, 0.5, 'Sadao – Bukit Kayu Hitam', 'Border', 'gate', 'todo', 'b'],
      [6.6, 0.5, 'Kuala Lumpur', 'Our road ends here', 'stop', 'todo', 'b'], [9, 0.5, 'Singapore', 'Not run yet', 'stop', 'old', 'b']] });
}
function scrRequest2NotRun() {
  var left = VV({ name: 'Step 2', gap: 24 });
  addAll(left, [Tx('Route and dates', 'Heading/H3'), Tx('We work out the border crossings from the route. Cross-border moves need time for documents to clear.', 'Body/M', 'text/secondary', { fill: true })]);
  var r1 = H({ name: 'Places', gap: 16 });
  addAll(r1, [input('Select', 'Default', 'From', 'Bangkok, Thailand', null, { fill: true }), input('Select', 'Default', 'To', 'Singapore', 'Outside the region we run.', { fill: true })]);
  add(left, fillW(r1));
  add(left, callout('Warn', 'We don’t run Bangkok → Singapore yet', 'We move horses by road within Vietnam, Cambodia, Thailand, Laos and Malaysia, and by air through Hong Kong. Singapore isn’t in our catalog, so there is no estimate or quotation for it.'));
  var mp = VV({ name: 'Where our road ends', gap: 10 });
  addAll(mp, [fillW(routeNotRunMap(776, 220)), mapLegend(['todo', 'old'], { todo: 'A road we run', old: 'Not run yet' })]);
  add(left, fillW(mp));
  var near = panel('Nearest route we run', { gap: 14 });
  var nh = H({ name: 'Head', gap: 16, cross: 'CENTER' });
  var nt = VV({ name: 'Text', gap: 4 });
  addAll(nt, [Tx('The nearest route we run', 'Heading/H4'), Tx('Bangkok → Kuala Lumpur by road · ~1,450 km · 1 border crossing', 'Body/S', 'text/secondary', { fill: true })]);
  addAll(nh, [fillW(nt), btn('Secondary', 'MD', 'Use this route', { trail: 'arrow-right' })]);
  addAll(near, [fillW(nh), Tx('We hand the horses over in Kuala Lumpur; the last leg to Singapore would be yours to arrange.', 'Body/S', 'text/tertiary', { fill: true })]);
  add(left, fillW(near));
  var ask = panel('Ask us', { gap: 14 });
  var ah = VV({ name: 'Head', gap: 4 });
  addAll(ah, [Tx('Ask us about this route', 'Heading/H4'), Tx('Yến, logistics manager, replies within 1 business day and tells you whether we can add it. Your draft stays saved; nothing is priced until it is a route we run.', 'Body/S', 'text/secondary', { fill: true })]);
  var send = H({ name: 'Send', gap: 12, main: 'MAX' });
  add(send, btn('Secondary', 'MD', 'Send to Yến'));
  addAll(ask, [fillW(ah), input('Text', 'Default', 'What you need', 'Two mares, Bangkok to Kranji racecourse, mid-November.', null, { fill: true }), fillW(send)]);
  add(left, fillW(ask));
  var foot = H({ name: 'Footer', main: 'SPACE_BETWEEN', cross: 'CENTER' });
  var fwd = H({ name: 'Forward', gap: 16, cross: 'CENTER' });
  addAll(fwd, [Tx('Choose a route we run to continue', 'Body/S', 'text/tertiary'), btn('Primary', 'MD', 'Continue', { trail: 'arrow-right', state: 'Disabled' })]);
  addAll(foot, [btn('Secondary', 'MD', 'Back', { lead: 'arrow-left' }), fwd]);
  add(left, fillW(foot));
  return requestLayout('Request · 2 Route & dates · Not run', ['Done', 'Current', 'Upcoming', 'Upcoming'], left, draftPass({ route: true, from: ['BKK', 'Bangkok'], to: ['SIN', 'Singapore'],
    rows: [['Departs', null, 2], ['Arrival', null, 2], ['Borders', 'Not run yet', false, 'status/warn/fg'], ['Service', null, 3]],
    range: null, rangeSub: 'No range: we don’t run Bangkok → Singapore yet.' }));
}
/* the review reads in the order the steps were done */
var REVIEW_ORDER = ['Horses', 'Pickup', 'Route', 'Departure', 'Arrival', 'Instructions', 'Service', 'Insurance'];
function scrRequest4() {
  var left = VV({ name: 'Step 4', gap: 24 });
  add(left, Tx('Review and submit', 'Heading/H3'));
  var rows = REQ_0193.concat([['Arrival', 'Any time on the day']]).map(function (r) { return r[0] === 'Instructions' ? ['Instructions', 'Quiet loading. Vet check on arrival.'] : r[0] === 'Insurance' ? ['Insurance', 'Your own policy · upload it with your documents once the job is approved'] : r; });
  rows.sort(function (a, b) { return REVIEW_ORDER.indexOf(a[0]) - REVIEW_ORDER.indexOf(b[0]); });
  add(left, fillW(requestSummary(rows, { edit: true })));
  add(left, callout('Ok', 'Lead time is fine', 'Cross-border moves need 21 days’ notice. Your departure is 34 days away.'));
  var next = panel('What happens next', { gap: 14 });
  add(next, Tx('What happens next', 'Heading/H4'));
  [['Request: a logistics manager reviews it', 'Usually within 1 business day'], ['Quotation: itemised line by line', 'Valid for 7 days'], ['Approval: you accept; the 30% deposit is acknowledged', 'The job gets its CBRT code'], ['Documents: your checklist opens', 'Then Clearance, Trip and Handover']].forEach(function (s, i) {
    var row = H({ name: s[0], gap: 14, cross: 'CENTER' });
    var n = H({ name: 'N', w: 26, h: 26, radius: 999, stroke: 'border/strong', main: 'CENTER', cross: 'CENTER' });
    add(n, Tx(String(i + 1), 'Mono/Caption', 'text/tertiary'));
    addAll(row, [n, Tx(s[0], 'Label/M', 'text/primary', { fill: true }), Tx(s[1], 'Mono/Caption', 'text/tertiary')]);
    add(next, fillW(row));
  });
  add(left, fillW(next));
  var foot = H({ name: 'Footer', main: 'SPACE_BETWEEN', cross: 'CENTER' });
  addAll(foot, [btn('Secondary', 'MD', 'Back', { lead: 'arrow-left' }), btn('Primary', 'MD', 'Submit request', { trail: 'arrow-right' })]);
  add(left, fillW(foot));
  return requestLayout('Request · 4 Review', ['Done', 'Done', 'Done', 'Current'], left, draftPass({ route: true,
    rows: [['Departs', '30 Oct 2026 · ±3 d', true], ['Arrival', 'Any time on the day'], DRAFT_BORDERS, ['Service', 'Road · shared load']],
    range: '$11,300 – $16,100', rangeSub: 'Not a quote. Once you approve the quotation, this becomes your travel pass.' }));
}

/* ---------------------------------------------------------------------
   Screen: Quotation
   --------------------------------------------------------------------- */
var QUOTE = [
  ['A', 'Ground transport · origin', false, [
    ['Road transfer, Phnom Penh stable → PNH cargo terminal', 'per km · 14 km · minimum charge applies', 1, 250, 'Fixed'],
    ['Loading and handling at origin', 'per horse', 2, 120, 'Fixed']]],
  ['B', 'Pre-export', false, [
    ['Pre-export isolation · Nightfall (mare)', 'per day · 14 days', 14, 85, 'Fixed'],
    ['Pre-export isolation · Shadowfax (gelding)', 'per day · 14 days', 14, 70, 'Fixed'],
    ['Veterinary inspection and bloods', 'per horse', 2, 310, 'Fixed']]],
  ['C', 'Air freight', true, [
    ['Air stall position PNH → HKG, business', 'per position · business class gives each horse 48 in · 2 × 48 in = 96 in = 1 position', 1, 16800, 'Fixed'],
    ['Airline handling and stall build-up', 'per shipment', 1, 950, 'Fixed']]],
  ['D', 'Escort', false, [
    ['Flying groom', 'one per three horses · 2 ÷ 3, rounded up = 1', 1, 1450, 'Fixed']]],
  ['E', 'Documentation', false, [
    ['Export health certificate', 'per horse', 2, 180, 'Fixed'],
    ['Customs and border documentation', 'per crossing · 1', 1, 420, 'Fixed'],
    ['Hong Kong import permit handling', 'per shipment', 1, 380, 'Fixed']]],
  ['F', 'Post-arrival', false, [
    ['Post-arrival isolation, Sha Tin', 'per horse per day · 2 × 7 days', 14, 95, 'Fixed']]],
  ['G', 'Ground transport · destination', false, [
    ['Road transfer, HKG cargo terminal → Sha Tin', 'per km · 38 km · minimum charge', 1, 300, 'Overridden', 180, 'Override: shares the truck with a second consignment on the same flight.']]],
  ['H', 'Surcharges', false, [
    ['Waiting time at the cargo terminal', 'per hour · 2 h estimated', 2, 95, 'Estimated', null, 'Billed by the hour if the flight is delayed.']]]
];
/* The customer's biggest decision, on the tracking page model: route as the
   title, the decision as the one owed item, the people who made the quote,
   how it compares with the estimate, and what accepting starts. The ledger
   underneath is unchanged. Every figure is computed from QUOTE. */
function quoteTotals(q) {
  var t = { subtotal: 0, air: 0, ground: 0, groups: {}, lines: 0 };
  (q || QUOTE).forEach(function (g) {
    var gsum = 0;
    g[3].forEach(function (l) { t.lines++; if (l[3] == null && l[5] == null) { t.missing = (t.missing || 0) + 1; return; } gsum += (l[5] != null ? l[5] : l[2] * l[3]); });
    t.groups[g[0]] = gsum;
    t.subtotal += gsum;
    if (g[2]) t.air += gsum;
  });
  t.ground = (t.groups.A || 0) + (t.groups.G || 0);
  t.volume = Math.round((t.air + t.ground) * 0.05 * 100) / 100;
  t.net = t.subtotal - t.volume;
  t.fuel = Math.round(t.air * 0.95 * 0.18 * 100) / 100;
  t.ins = 325000 * 0.015;
  t.base1 = t.net + t.fuel + t.ins;
  t.cont = Math.round(t.base1 * 0.05 * 100) / 100;
  t.base2 = t.base1 + t.cont;
  t.fee = Math.round(t.base2 * 0.12 * 100) / 100;
  t.total = Math.round((t.base2 + t.fee) * 100) / 100;
  t.deposit = Math.round(t.total * 0.30 * 100) / 100;
  return t;
}
var QUOTE_ESTIMATE = [33900, 43600];
/* the ledger, shared by the customer quotation and the staff builder.
   after(line) may return a node to place under that line (the inline override editor) */
/* notes: { groupLetter: node } drawn under that group's lines, for the reasoning that belongs to one group */
function quoteTable(lines, T, after, notes) {
  var table = panel('Quotation lines', { gap: 0, pad: 0, clip: true });
  var th = H({ name: 'Table header', gap: 16, pad: [12, 20, 12, 20], fill: 'bg/sunken' });
  addAll(th, [Tx('Item', 'Mono/Eyebrow', 'text/tertiary', { fill: true }), Tx('Qty', 'Mono/Eyebrow', 'text/tertiary', { w: 48, align: 'RIGHT' }), Tx('Rate', 'Mono/Eyebrow', 'text/tertiary', { w: 96, align: 'RIGHT' }), Tx('Amount', 'Mono/Eyebrow', 'text/tertiary', { w: 120, align: 'RIGHT' }), Tx('', 'Mono/Eyebrow', 'text/tertiary', { w: 110 })]);
  add(table, fillW(th));
  lines.forEach(function (g) {
    var gh = H({ name: 'Group ' + g[0], gap: 12, pad: [18, 20, 10, 20], cross: 'CENTER' });
    var badge = H({ name: 'Letter', w: 26, h: 26, radius: 6, fill: 'surface/muted', main: 'CENTER', cross: 'CENTER' });
    add(badge, Tx(g[0], 'Mono/Chip', 'text/secondary'));
    var gMissing = g[3].some(function (l) { return l[3] == null && l[5] == null; });
    addAll(gh, [badge, Tx(g[1], 'Heading/H4', 'text/primary', { fill: true }), Tx(gMissing ? '—' : money(T.groups[g[0]]), 'Mono/Data', 'text/secondary')]);
    add(table, fillW(gh));
    g[3].forEach(function (l) {
      var ln = inst(C.quoteLine, { Certainty: l[4] });
      var missing = l[3] == null;
      var amount = l[5] != null ? l[5] : l[2] * l[3];
      var m = { Description: l[0], Basis: l[1], Qty: String(l[2]), Rate: missing ? '—' : money(l[3]), Amount: missing ? 'No rate' : money(amount) };
      if (l[4] === 'Overridden') { m.Reason = l[6]; m.Catalog = money(l[2] * l[3]); }
      if (l[4] === 'Estimated') m.Why = l[6];
      setP(ln, m);
      if (missing) { var am = ln.findOne(function (n) { return n.type === 'TEXT' && n.name === 'Amount'; }); if (am) am.fills = [P('status/bad/fg')]; var tg = ln.findOne(function (n) { return n.name === 'Certainty'; }); if (tg) tg.visible = false; }
      /* a basis that explains itself in words is prose, so it leaves DM Mono */
      if (l[1].length > 40) { var bs = ln.findOne(function (n) { return n.type === 'TEXT' && n.name === 'Basis'; }); if (bs) restyle(bs, 'Body/S', 'text/tertiary'); }
      ln.name = 'Line · ' + l[0];
      add(table, fillW(ln));
      var extra = after && after(l);
      if (extra) add(table, fillW(extra));
    });
    if (notes && notes[g[0]]) add(table, fillW(notes[g[0]]));
  });
  return table;
}
function quoteTotalsPanel(T) {
  var tot = panel('Totals', { gap: 12 });
  [['Direct cost subtotal', 'Groups A–H', money(T.subtotal)],
   ['Volume break, 2–3 horses', '5% of air and ground lines (A, C, G) · ' + money(T.air + T.ground), '−' + money(T.volume)],
   ['Fuel surcharge', '18% of air lines (C) after the volume break · ' + money(T.air * 0.95), money(T.fuel)],
   ['Transit insurance', '1.5% of declared value · $325,000', money(T.ins)],
   ['Contingency', '5% of ' + money(T.base1), money(T.cont)],
   ['Service fee', '12% of ' + money(T.base2), money(T.fee)]].forEach(function (r) {
    var row = H({ name: r[0], gap: 16, cross: 'CENTER' });
    var l = VV({ name: 'Label', gap: 2 });
    addAll(l, [Tx(r[0], 'Label/M'), Tx(r[1], 'Mono/Caption', 'text/tertiary')]);
    addAll(row, [fillW(l), Tx(r[2], 'Mono/Data', 'text/primary', { align: 'RIGHT' })]);
    add(tot, fillW(row));
  });
  add(tot, divider());
  var tr = H({ name: 'Total', cross: 'CENTER', main: 'SPACE_BETWEEN' });
  addAll(tr, [Tx('Total, USD', 'Heading/H3'), Tx(money(T.total), 'Display/M')]);
  add(tot, fillW(tr));
  add(tot, Tx('Applied in a fixed order: the volume break on air and ground lines, fuel on the discounted air lines, insurance on declared value, then contingency, then the service fee. USD at the 23 Sep rate; rate catalog v12 is pinned to this quotation.', 'Body/S', 'text/tertiary', { fill: true }));
  return tot;
}
/* Where the money goes: one bar per ledger group, largest first, and the fees and cover added after the
   subtotal as one row, so the customer sees the shape of the price before the lines. One series, so one hue
   and no legend; the letter badges match the ledger; values and shares in mono. */
var BREAK_TRACK = 220;
function sharePct(v, total) { var x = v / total * 100; return x < 1 ? '<1%' : Math.round(x) + '%'; }
function quoteBreakdown(T, q) {
  var p = panel('Where the money goes', { gap: 12 });
  var rows = (q || QUOTE).map(function (g) { return [g[0], g[1], T.groups[g[0]]]; });
  rows.push(['+', 'Fees, fuel and cover', T.total - T.subtotal, 'Fuel, insurance, contingency and the service fee, less the volume break']);
  rows.sort(function (a, b) { return b[2] - a[2]; });
  var top = rows[0];
  var h = VV({ name: 'Head', gap: 2 });
  addAll(h, [Tx('Where the ' + money(T.total) + ' goes', 'Heading/H4'), Tx(top[1] + ' is ' + Math.round(top[2] / T.total * 100) + '% of the total. Each group is itemised in the lines below.', 'Body/S', 'text/tertiary', { fill: true })]);
  add(p, fillW(h));
  rows.forEach(function (r) {
    var row = H({ name: r[1], gap: 12, cross: 'CENTER' });
    var badge = H({ name: 'Letter', w: 26, h: 26, radius: 6, fill: 'surface/muted', main: 'CENTER', cross: 'CENTER' });
    add(badge, Tx(r[0], 'Mono/Chip', 'text/secondary'));
    var nm = VV({ name: 'Name', gap: 0 });
    add(nm, Tx(r[1], 'Label/S', 'text/primary', { fill: true }));
    if (r[3]) add(nm, Tx(r[3], 'Body/S', 'text/tertiary', { fill: true }));
    var track = F({ name: 'Track', w: BREAK_TRACK, h: 8, radius: 4, fill: 'surface/muted' });
    var bar = rect(Math.max(4, Math.round(r[2] / T.total * BREAK_TRACK)), 8, 'text/secondary', 'Bar', 4);
    track.appendChild(bar);
    addAll(row, [badge, fillW(nm), track, Tx(money(r[2]), 'Mono/Data', 'text/primary', { w: 96, align: 'RIGHT' }), Tx(sharePct(r[2], T.total), 'Mono/Caption', 'text/tertiary', { w: 40, align: 'RIGHT' })]);
    add(p, fillW(row));
  });
  return p;
}
function scrQuote() {
  var T = quoteTotals();
  var left = VV({ name: 'Lines', gap: 24 });
  /* how the air stall was sized sits under the air freight group it explains, not in the side column */
  var sizing = VV({ name: 'Group note · sizing', gap: 4, pad: [10, 20, 14, 20], fill: 'bg/sunken' });
  borderSide(sizing, 'border/default', 'top');
  addAll(sizing, [Tx('How the stall was sized', 'Label/S', 'text/secondary'), Tx('Nightfall and Shadowfax fly business class at 48 in each: 96 in, so 1 position. Flying grooms: 2 ÷ 3, rounded up, is 1. No flight vet: one joins from 8 horses, or when a horse is declared above $250,000.', 'Body/S', 'text/tertiary', { fill: true })]);
  addAll(left, [fillW(quoteBreakdown(T)), fillW(quoteTable(QUOTE, T, null, { C: sizing })), fillW(quoteTotalsPanel(T))]);

  var est = panel('Against your estimate', { gap: 12 });
  var inside = T.total >= QUOTE_ESTIMATE[0] && T.total <= QUOTE_ESTIMATE[1];
  var head = H({ name: 'Head', main: 'SPACE_BETWEEN', cross: 'CENTER', wrap: true, rowGap: 8 });
  addAll(head, [Tx('Against your estimate', 'Heading/H4'), chip(inside ? 'Ok' : 'Warn', inside ? 'Inside your range' : 'Outside your range')]);
  addAll(est, [fillW(head), dlRow('Your estimate at submission', money(QUOTE_ESTIMATE[0], 0) + ' – ' + money(QUOTE_ESTIMATE[1], 0)), dlRow('Deposit on acceptance', '30% · ' + money(T.deposit)),
    Tx('The largest line is the business-class air stall, $16,800, or ' + Math.round(16800 / T.total * 100) + '% of the total. Waiting time (H) is the only line that can change on the final invoice.', 'Body/S', 'text/tertiary', { fill: true })]);

  var next = panel('After you accept', { gap: 14 });
  add(next, Tx('After you accept', 'Heading/H4'));
  [['Your deposit is acknowledged', '30% · ' + money(T.deposit)], ['Yến approves the job and it gets its CBRT code', 'Price and horses lock'], ['Your document checklist opens', '2 horses · KH export, HK import']].forEach(function (x, i) {
    var row = H({ name: x[0], gap: 14, cross: 'MIN' });
    var n = H({ name: 'N', w: 26, h: 26, radius: 999, stroke: 'border/strong', main: 'CENTER', cross: 'CENTER' });
    add(n, Tx(String(i + 1), 'Mono/Caption', 'text/tertiary'));
    var t = VV({ name: 'Text', gap: 2 });
    addAll(t, [Tx(x[0], 'Label/S', 'text/primary', { fill: true }), Tx(x[1], 'Body/S', 'text/tertiary', { fill: true })]);
    addAll(row, [n, fillW(t)]);
    add(next, fillW(row));
  });

  var who = peoplePanel([['Yến', 'logistics manager', 'Built this quotation from rate catalog v12 on 23 Sep, and re-issued it when your departure moved to 20 Nov.']], 'Who prepared it');
  add(who, VV({ name: 'Ask', pad: [4, 0, 12, 0] }, [btn('Secondary', 'SM', 'Ask Yến about a line')]));

  /* the terms a customer checks before accepting, and the versions behind this one, in one panel */
  var terms = panel('Terms and versions', { gap: 8 });
  addAll(terms, [Tx('Terms and versions', 'Heading/H4'), Tx('Cancellation fee by notice period', 'Label/S', 'text/secondary')]);
  [['More than 30 days', '10%', true], ['15–30 days', '25%'], ['7–14 days', '50%'], ['Under 7 days', '100%']].forEach(function (b) {
    var row = H({ name: b[0], gap: 10, pad: [8, 10, 8, 10], radius: 8, cross: 'CENTER', fill: b[2] ? 'status/info/bg' : null });
    addAll(row, [Tx(b[0], 'Body/S', 'text/secondary', { fill: true })]);
    if (b[2]) add(row, chip('Info', 'Now · 55 days', { noDot: true }));
    add(row, Tx(b[1], 'Mono/Data', 'text/primary', { w: 48, align: 'RIGHT' }));
    add(terms, fillW(row));
  });
  var v2 = H({ name: 'v2', gap: 10, cross: 'CENTER' });
  addAll(v2, [Tx('v2', 'Mono/Data'), Tx('Issued 23 Sep 2026', 'Body/S', 'text/secondary', { fill: true }), chip('Info', 'Current', { noDot: true })]);
  var v1 = H({ name: 'v1', gap: 10, cross: 'CENTER' });
  addAll(v1, [Tx('v1', 'Mono/Data', 'text/tertiary'), Tx('Superseded. Departure moved from 12 Nov to 20 Nov.', 'Body/S', 'text/tertiary', { fill: true })]);
  addAll(terms, [divider(), Tx('Versions', 'Label/S', 'text/secondary'), fillW(v2), fillW(v1)]);
  /* the request as the pass it becomes, now quoted: the wizard's draft pass with the total in the stub */
  var pass = draftPass({ route: true, mode: 'air', from: ['PNH', 'Phnom Penh'], to: ['HKG', 'Hong Kong'], chip: ['Info', 'Quoted · v2'],
    rows: [['Departs', '20 Nov 2026', true], ['Mode', 'Air · business class'], ['Arrival', 'Airline schedule'], ['Service', 'Flying groom · insured with us']],
    stubLabel: 'Quoted total', range: money(T.total), rangeSub: 'Valid until 30 Sep 2026. Once you accept and Yến approves, this becomes your travel pass.' });
  var right = column([pass, est, next, who, terms]);

  var lead = owedPanel('1 item', 'Yến, logistics manager, issued version 2 on 23 Sep. Accepting locks the price and the horse list; declining closes the request.',
    [owedItem('Soon', 'Accept or decline this quotation', 'Q-2026-0188 · version 2 · ' + money(T.total), 'It holds its price for 7 days from 23 Sep. After 30 Sep it expires and Yến re-prices it from the rate catalog in force then.', 'Due in 4 days', '30 Sep 2026', 'Accept quotation', 'check', { second: 'Decline' })],
    { chipTone: 'Warn', chipLabel: 'Waiting for you' }, null);
  return trackScreen('Quotation', trackHead('Phnom Penh → Hong Kong (Sha Tin)', ['REQ-2026-0179', 'Q-2026-0188 · version 2'], [stageMark('Quotation'), chip('Neutral', 'Rates v12 pinned', { noDot: true })], true), [lead, split(left, right, 400)], '26 Sep 2026, 11:20');
}

/* ---------------------------------------------------------------------
   Screen: Load plan
   --------------------------------------------------------------------- */
function scrLoadPlan() {
  var left = VV({ name: 'Queue', gap: 16, w: 300 });
  var li = inst(C.loadItem, { State: 'Selected' });
  setP(li, { Horse: 'Silver Bell', Meta: 'Mare · 445 kg · Lipizzan' });
  addAll(left, [Tx('To load · 1', 'Label/S', 'text/secondary'), fillW(li)]);
  var rules = panel('Placement rules', { gap: 12, pad: 20 });
  add(rules, Tx('Placement rules', 'Label/M'));
  [['box', 'stall/box', 'Stallions and aggressive horses need a box stall.'], ['snowflake', 'stall/climate', 'Heat-sensitive horses need the climate stall.'], ['alert', 'status/bad/fg', 'No stallion beside or behind a mare.'], ['info', 'status/info/fg', 'Keep nervous horses away from the ramp.']].forEach(function (r) {
    var row = H({ name: r[2], gap: 10 });
    addAll(row, [Ic(r[0], 16, r[1]), Tx(r[2], 'Body/S', 'text/secondary', { fill: true })]);
    add(rules, fillW(row));
  });
  add(left, fillW(rules));

  var veh = VV({ name: 'Vehicle', gap: 14, pad: 20, radius: 16, fill: 'bg/sunken', stroke: 'border/strong' });
  var cab = H({ name: 'Cab', main: 'SPACE_BETWEEN', cross: 'CENTER', pad: [12, 16, 12, 16], radius: 8, fill: 'surface/muted' });
  var cl = H({ name: 'Cab label', gap: 8, cross: 'CENTER' });
  addAll(cl, [Ic('truck', 16, 'text/secondary'), Tx('Cab · TX-447', 'Mono/Chip', 'text/secondary')]);
  var legend = H({ name: 'Legend', gap: 14, cross: 'CENTER' });
  [['stall/standard', 'Standard'], ['stall/box', 'Box'], ['stall/climate', 'Climate']].forEach(function (l) {
    var it = H({ name: l[1], gap: 6, cross: 'CENTER' });
    addAll(it, [rect(10, 10, l[0], 'Swatch', 2), Tx(l[1], 'Mono/Caption', 'text/tertiary')]);
    add(legend, it);
  });
  addAll(cab, [cl, legend, Tx('Front', 'Mono/Chip', 'text/tertiary')]);
  add(veh, fillW(cab));
  var selbar = H({ name: 'Selection', gap: 12, pad: [10, 14, 10, 14], radius: 8, cross: 'CENTER', fill: 'accent/soft', stroke: 'accent/line' });
  addAll(selbar, [Tx('Silver Bell selected. Choose a stall.', 'Label/S', 'text/primary', { fill: true }), btn('Ghost', 'SM', 'Unload'), btn('Ghost', 'SM', 'Cancel')]);
  add(veh, fillW(selbar));
  [[stallI('Standard', 'Occupied', 1, { horse: 'Shadowfax', meta: 'Gelding · 510 kg · Calm' }), stallI('Box', 'Empty', 2)],
   [stallI('Standard', 'Conflict', 3, { horse: 'Copper King', meta: 'Stallion · 583 kg · Aggressive', issue: 'Needs a box stall (2 or 5), and stands beside a mare' }), stallI('Climate', 'Occupied', 4, { horse: 'Nightfall', meta: 'Mare · 478 kg · Nervous' })],
   [stallI('Box', 'Empty', 5), stallI('Standard', 'Target', 6, { target: 'Place Silver Bell here' })]].forEach(function (pair, i) {
    var row = H({ name: 'Row ' + (i + 1), gap: 16 });
    addAll(row, pair);
    add(veh, fillW(row));
  });
  var ramp = H({ name: 'Ramp', pad: [10, 0, 10, 0], radius: 8, main: 'CENTER', stroke: 'border/strong', dash: [6, 4] });
  add(ramp, Tx('Rear ramp', 'Mono/Chip', 'text/tertiary'));
  add(veh, fillW(ramp));

  var sum = panel('Summary', { gap: 20 });
  var cols = H({ name: 'Columns', gap: 24 });
  var c1 = VV({ name: 'Payload', gap: 8 });
  addAll(c1, [Tx('Payload', 'Body/S', 'text/tertiary'), Tx('1,571 kg of 3,200 kg', 'Mono/Data'), progress('Neutral', 40)]);
  var c2 = VV({ name: 'Crew', gap: 6 });
  addAll(c2, [Tx('Crew', 'Body/S', 'text/tertiary'), Tx('2 grooms · 1 per 3 horses', 'Mono/Data'), Tx('Trần Văn Minh (driver), Lê Thị Hoa, Phạm Quốc Tuấn', 'Body/S', 'text/secondary', { fill: true })]);
  var c3 = VV({ name: 'Clearance', gap: 8 });
  addAll(c3, [Tx('Clearance', 'Body/S', 'text/tertiary'), chip('Bad', 'Locked · 9 items'), Tx('Departure stays locked until clearance is ready.', 'Body/S', 'text/tertiary', { fill: true })]);
  addAll(cols, [fillW(c1), fillW(c2), fillW(c3)]);
  add(sum, fillW(cols));
  add(sum, divider());
  var foot = H({ name: 'Footer', main: 'SPACE_BETWEEN', cross: 'CENTER' });
  var bs = H({ name: 'Buttons', gap: 12 });
  addAll(bs, [btn('Secondary', 'MD', 'Auto-arrange'), btn('Primary', 'MD', 'Confirm load plan', { state: 'Disabled' })]);
  addAll(foot, [Tx('Place every horse and resolve 1 conflict to confirm.', 'Body/S', 'text/tertiary'), bs]);
  add(sum, fillW(foot));

  var center = VV({ name: 'Plan', gap: 20 });
  addAll(center, [fillW(veh), fillW(sum)]);
  var body = H({ name: 'Body', gap: 24 });
  addAll(body, [left, fillW(center)]);
  var tiles = H({ name: 'Tiles', gap: 16 });
  addAll(tiles, [fillW(stat('Neutral', '3/6', 'Positions filled')), fillW(stat('Bad', '1', 'Conflict')), fillW(stat('Warn', '1', 'Horse to place'))]);
  return jobScreen('Fleet & route coordinator · Load plan', 'Load plan', STAFF.khoi, [tiles, body]);
}

/* ---------------------------------------------------------------------
   Screens: Clearance (checklist + route plan)
   --------------------------------------------------------------------- */
var RULE = { passport: 'Valid through arrival + 2 days', vacc: 'Influenza booster given 7–180 days before departure', eia: 'Sampled within 60 days of departure', health: 'Issued within 10 days of departure', own: 'Presence only' };
var DOCNAME = { passport: 'Equine passport', vacc: 'Influenza vaccination', eia: 'EIA (Coggins) test', health: 'Export health certificate', own: 'Proof of ownership' };
var HEALTH = ['health', 'Required', 'Due 8–14 Oct 2026 from the Dept. of Animal Health (VN), in time for clearance on 14 Oct.', '—'];
/* canonical fixture for CBRT-2026-041 as of 26 Sep 2026, 11:20; the customer's tracking screens show the same facts */
var CHECKLIST = [
  ['Shadowfax', 'Gelding · Andalusian', '4 of 5 cleared', [
    ['passport', 'Cleared', 'Valid until 1 May 2031; covers 20 Oct 2026.', 'v1 · 2 Sep 2026'],
    ['vacc', 'Cleared', 'Given 130 days before departure.', 'v1 · 2 Sep 2026'],
    ['eia', 'Cleared', 'Sampled 20 Sep 2026; 28 days old at departure. Approved 21 Sep.', 'v1 · 21 Sep 2026'],
    HEALTH,
    ['own', 'Cleared', 'On file.', 'v1 · 2 Sep 2026']]],
  ['Nightfall', 'Mare · Thoroughbred', '3 of 5 cleared', [
    ['passport', 'Cleared', 'Valid until 14 Mar 2029; covers 20 Oct 2026.', 'v1 · 2 Sep 2026'],
    ['vacc', 'Cleared', 'Given 108 days before departure.', 'v1 · 2 Sep 2026'],
    ['eia', 'Amber', 'Valid today, but 77 days old at departure; the limit is 60. The customer must upload a new test by 4 Oct.', 'v1 · 4 Aug 2026'],
    HEALTH,
    ['own', 'Cleared', 'On file.', 'v1 · 2 Sep 2026']]],
  ['Copper King', 'Stallion · Quarter Horse', '4 of 5 cleared', [
    ['passport', 'Cleared', 'Valid until 30 Jun 2030; covers 20 Oct 2026.', 'v1 · 3 Sep 2026'],
    ['vacc', 'Cleared', 'Given 156 days before departure.', 'v1 · 3 Sep 2026'],
    ['eia', 'Cleared', 'Sampled 10 Sep 2026; 38 days old at departure.', 'v1 · 11 Sep 2026'],
    HEALTH,
    ['own', 'Cleared', 'On file.', 'v1 · 3 Sep 2026']]],
  ['Silver Bell', 'Mare · Lipizzan', '2 of 5 cleared', [
    ['passport', 'Cleared', 'Valid until 2 Feb 2027; covers 20 Oct 2026.', 'v1 · 4 Sep 2026'],
    ['vacc', 'Red', 'Booster lapsed on 16 Sep 2026. The customer must upload a new booster record by 11 Oct.', 'v1 · 22 Mar 2026'],
    ['eia', 'Cleared', 'Sampled 18 Sep 2026; 30 days old at departure.', 'v1 · 19 Sep 2026'],
    HEALTH,
    ['own', 'Red', 'Rejected 24 Sep by Lan: the bill of sale is unsigned. A signed copy was due 25 Sep.', 'v1 · 24 Sep 2026']]],
  ['Shipment', 'Documents for the whole job', '1 of 3 cleared', [
    ['Cambodia import permit', 'Required', 'With GDAHP since 15 Sep 2026 (ref KH-IP-2026-3381). Due by 11 Oct 2026.', '—', 'Valid through arrival + 2 days'],
    ['Transit insurance', 'Amber', 'Expires 15 Oct 2026, before 20 Oct 2026 (arrival + 2 days). The customer must upload an extended policy by 30 Sep.', 'v1 · PVI Insurance', 'Must cover the journey + 2 days'],
    ['Customs value declaration · Mộc Bài – Bavet', 'Cleared', 'On file.', 'v1 · 20 Sep 2026', 'One per border crossing']]]
];
/* 23 items: 14 cleared, 4 with the customer, 4 health certificates and 1 permit with authorities */
var STAFF = { yen: ['Vũ Hải Yến', 'Logistics manager', 'VY'], lan: ['Nguyễn Thị Lan', 'Transport specialist', 'NL'], khoi: ['Đỗ Minh Khôi', 'Fleet & route coordinator', 'DK'], minh: ['Trần Văn Minh', 'Driver', 'TM'], hoa: ['Lê Thị Hoa', 'Groom', 'LH'] };
var JOB = { code: 'CBRT-2026-041', title: 'Ho Chi Minh City → Phnom Penh', meta: '4 horses · trailer TX-447 · departs 18 Oct 2026, 06:00' };
/* the customer bought an arrival window for this job; the route is planned backwards from its close */
var JOB_WINDOW = { from: '11:00', until: '14:00', text: '18 Oct, 11:00–14:00' };
var JOB_TABS = [['Clearance', 'Lan, transport specialist'], ['Authorities', 'Lan, transport specialist'], ['Load plan', 'Khôi, fleet & route coordinator'], ['Route', 'Khôi, fleet & route coordinator'], ['Trip', 'Minh, driver']];
/* one header for every tab of a job: route title, code, stage, the clearance gate, then tabs with the tab's owner */
function jobHead(tab, gateBody, stage, gateState) {
  var gate = inst(C.gate, { State: gateState || 'Locked' });
  setP(gate, { Body: gateBody || '9 items must clear first: 4 uploads from the customer, 4 export health certificates and the Cambodia import permit. Pre-export quarantine runs 10–17 Oct.' });
  var tabs = H({ name: 'Tabs', gap: 24, main: 'SPACE_BETWEEN', cross: 'CENTER' });
  borderSide(tabs, 'border/default', 'bottom');
  var list = H({ name: 'Tab list', gap: 28 });
  JOB_TABS.forEach(function (tb) {
    var i = inst(C.tab, { State: tb[0] === tab ? 'Active' : 'Default' });
    setP(i, { Label: tb[0] }); i.name = 'Tab · ' + tb[0];
    add(list, i);
  });
  var owner = JOB_TABS.filter(function (tb) { return tb[0] === tab; })[0][1];
  var own = H({ name: 'Owner', gap: 6, cross: 'CENTER' });
  addAll(own, [Tx('Owner', 'Body/S', 'text/tertiary'), Tx(owner, 'Label/S', 'text/primary')]);
  addAll(tabs, [list, own]);
  /* the tabs carry the rule, so the header itself has none */
  return pageHeader({ shell: 'staff', back: 'Jobs', title: JOB.title, code: JOB.code, summary: JOB.meta, right: [stageMark(stage || 'Documents')], below: [gate, tabs], rule: false });
}
function jobScreen(name, tab, user, blocks, o) {
  o = o || {};
  return adminScreen(name, 'Jobs', ['Jobs', JOB.code, tab], user, [jobHead(tab, o.gate, o.stage, o.gateState)].concat(blocks), o.today);
}
/* Lan's checklist is the customer's All documents list, in the same words, with the holder named for staff */
function scrClearance() {
  var top = H({ name: 'Summary', gap: 16, cross: 'MAX' });
  var s = docTableSummary('staff');
  addAll(top, [fillW(s), input('Date', 'Default', 'Planned departure', '18 Oct 2026', 'Changing it re-checks all 23 documents before it saves.')]);
  return jobScreen('Transport specialist · Clearance checklist', 'Clearance', STAFF.lan, [top, docTableTabs('staff'), docTable('staff')]);
}
function scrRoute() {
  var strip = H({ name: 'Summary', gap: 40, pad: [18, 24, 18, 24], radius: 12, fill: 'surface/card', stroke: 'border/default' });
  [['Origin', 'Ho Chi Minh City, VN'], ['Destination', 'Phnom Penh, KH'], ['Distance', '240 km'], ['Duration', '6.5 h'], ['Border crossing', 'Mộc Bài – Bavet'], ['Welfare stops', '1'], ['Arrival window', JOB_WINDOW.text]].forEach(function (s) {
    var c = VV({ name: s[0], gap: 4 });
    addAll(c, [Tx(s[0], 'Body/S', 'text/tertiary'), Tx(s[1], 'Label/M')]);
    add(strip, c);
  });
  var tl = VV({ name: 'Timeline', gap: 16 });
  [['Pickup', 'Phú Thọ training centre, HCMC', '06:00', 'Loading and condition check, logged with photos.'],
   ['Border', 'Mộc Bài – Bavet border', '08:30', 'Vietnam export clearance and Cambodia entry. Recorded per leg as Cleared or Held.'],
   ['Welfare', 'Svay Rieng welfare stop', '09:30', '45-minute rest, water and hay, welfare check by the escort.'],
   ['Delivery', 'Phnom Penh Equestrian Centre', '12:30', 'Handover to the receiving groom with a final condition log. Planned 1 h 30 min before the window closes at 14:00.']].forEach(function (s) {
    var st = inst(C.stop, { Kind: s[0] });
    setP(st, { Stop: s[1], Time: s[2], Details: s[3] });
    st.name = 'Stop · ' + s[1];
    add(tl, fillW(st));
  });
  var refuse = VV({ name: 'Depart', gap: 16 });
  add(refuse, callout('Bad', 'Departure can’t be recorded yet', '9 items are outstanding: 4 uploads from the customer, 4 export health certificates and the Cambodia import permit. Pre-export quarantine runs 10–17 Oct. Record departure opens when the gate is clear.'));
  add(refuse, btn('Primary', 'MD', 'Record departure', { state: 'Disabled', lead: 'lock' }));
  return jobScreen('Fleet & route coordinator · Route plan', 'Route', STAFF.khoi, [strip, tl, refuse]);
}

/* ---------------------------------------------------------------------
   Components page toast demo + Cover
   --------------------------------------------------------------------- */
function buildCover(page) {
  var f = primaryTheme(VV({ name: 'Cover', gap: 32, pad: 96, w: 1600, h: 1000, fill: 'bg/canvas', main: 'SPACE_BETWEEN' }));
  page.appendChild(f);
  var top = VV({ name: 'Top', gap: 24 });
  var mk = H({ name: 'Mark', w: 72, h: 72, radius: 12, fill: 'accent/default', main: 'CENTER', cross: 'CENTER' });
  var eq = Tx('Eq', 'Display/M', 'accent/on', { noStyle: true });
  eq.fontName = FONT['display/Italic'];
  add(mk, eq);
  var meta = H({ name: 'Meta', gap: 8 });
  addAll(meta, [chip('Neutral', 'v1.0', { noDot: true }), chip('Neutral', '26 Sep 2026', { noDot: true }), chip('Neutral', 'Dark + Light', { noDot: true })]);
  addAll(top, [mk, Tx('EquiFreight', 'Display/XL'), Tx('Design system and screens for CBRTS, the Cross-Border Racehorse Transport System.', 'Body/L', 'text/secondary', { w: 820 }), meta]);
  var cols = H({ name: 'Contents', gap: 40 });
  [['Foundations', 'Colour variables in Dark and Light modes, space and radius variables, 15 text styles, 4 effect styles, principles.'],
   ['Components', (STATS.components - Object.keys(ICON).length) + ' components and component sets with ' + STATS.variants + ' variants, plus ' + Object.keys(ICON).length + ' icons: buttons, chips, inputs, option cards, nameplate, horse card, stall tile, document row, clearance gate, quote line and more.'],
   ['Screens', 'Home, My horses (desktop + mobile), Request transport steps 1, 3 and 4, Quotation, Load plan, Clearance checklist and route plan, plus Light-mode copies.']].forEach(function (c) {
    var col = VV({ name: c[0], gap: 8, pad: [20, 0, 0, 0] });
    borderSide(col, 'border/default', 'top');
    addAll(col, [Tx(c[0], 'Heading/H3'), Tx(c[1], 'Body/S', 'text/secondary', { fill: true })]);
    add(cols, fillW(col));
  });
  var how = Tx('Theme a frame: select it, then in the right panel under Appearance choose EquiFreight / Color → Light. Everything inside re-themes because components bind to variables.', 'Mono/Caption', 'text/tertiary', { fill: true });
  addAll(f, [top, fillW(cols), how]);
  return f;
}

