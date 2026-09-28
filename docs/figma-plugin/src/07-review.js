/* =====================================================================
   Request review (Flow 1, feasibility). The logistics manager decides
   whether a request can be taken before any price exists: five checks,
   each with its evidence, then one of four outcomes (quote, ask for
   information, reject, or grant a lead-time override). The customer's
   side of "ask for information" is a tracking page with one owed item.
   ===================================================================== */
var CHECK_TONE = { ok: 'Ok', pending: 'Info', warn: 'Warn', bad: 'Bad' };

/* rows: [state, check, word, evidence, sub] */
function checksPanel(rows) {
  var p = panel('Feasibility checks', { gap: 0, pad: [20, 24, 8, 24] });
  /* only an 'ok' check passes; pending is said as pending, never counted as a pass */
  var pass = rows.filter(function (r) { return r[0] === 'ok'; }).length, pending = rows.filter(function (r) { return r[0] === 'pending'; }).length;
  var head = H({ name: 'Head', main: 'SPACE_BETWEEN', cross: 'CENTER', pad: [0, 0, 12, 0] });
  var tally = pass === rows.length ? 'All ' + rows.length + ' pass' : pass + ' of ' + rows.length + ' pass' + (pending ? ' · ' + pending + ' pending' : '');
  addAll(head, [Tx('Feasibility checks', 'Heading/H4'), Tx(tally, 'Label/S', pass === rows.length ? 'status/ok/fg' : 'text/secondary')]);
  add(p, fillW(head));
  rows.forEach(function (r) {
    var row = H({ name: r[1], gap: 16, pad: [14, 0, 14, 0], cross: 'MIN' });
    borderSide(row, 'border/default', 'top');
    var st = H({ name: 'Status col', w: 116 });
    add(st, chip(CHECK_TONE[r[0]], r[2]));
    var t = VV({ name: 'Text', gap: 3 });
    addAll(t, [Tx(r[1], 'Label/M', 'text/primary', { fill: true }), Tx(r[3], 'Body/S', 'text/secondary', { fill: true })]);
    if (r[4]) add(t, Tx(r[4], 'Body/S', 'text/tertiary', { fill: true }));
    addAll(row, [st, fillW(t)]);
    add(p, fillW(row));
  });
  return p;
}
function sentPanel(title, facts) {
  var p = panel(title, { gap: 10 });
  add(p, Tx(title, 'Heading/H4'));
  facts.forEach(function (f) { add(p, factRow(f)); });
  return p;
}
/* a multi-line field: the Input component has no textarea. Filled or empty, it has
   the control border; gold is only ever the focused Input, never a resting field */
function noteField(label, value, helper, empty) {
  var v = VV({ name: 'Field · ' + label, gap: 8 });
  var box = VV({ name: 'Control', pad: [12, 12, 12, 12], radius: 8, fill: 'bg/input', stroke: 'border/strong' });
  add(box, Tx(value, 'Body/S', empty ? 'text/tertiary' : 'text/primary', { fill: true }));
  box.resize(100, 104); box.layoutSizingVertical = 'FIXED';
  addAll(v, [Tx(label, 'Label/S', 'text/primary'), fillW(box), Tx(helper, 'Body/S', 'text/tertiary', { fill: true })]);
  return v;
}
function reviewHead(title, code, meta, due, date) {
  var d = VV({ name: 'Review due', gap: 2, cross: 'MAX' });
  addAll(d, [Tx(due, 'Label/S', 'status/warn/fg', { align: 'RIGHT' }), Tx(date, 'Mono/Caption', 'text/tertiary', { align: 'RIGHT' })]);
  var h = pageHeader({ shell: 'staff', back: 'Requests', title: title, code: code, summary: meta, right: [stageChip('Request'), d] });
  h.findOne(function (n) { return n.name === 'Status'; }).itemSpacing = 16;
  return h;
}
function reviewScreen(name, code, head, left, right) {
  var body = H({ name: 'Body', gap: 24 });
  right.resize(SIDE.narrow, right.height); right.layoutSizingHorizontal = 'FIXED';
  addAll(body, [fillW(left), right]);
  return adminScreen(name, 'Requests', ['Requests', code], STAFF.yen, [head, body], 'Mon 28 Sep 2026');
}

/* ---------- REQ-2026-0193: a horse conflict, so ask for information ---------- */
var REVIEW_NOTE = 'Shadowfax and Nightfall will be in Phnom Penh from 18 Oct (job CBRT-2026-041). Should we collect them in Phnom Penh, move the date, or choose other horses?';
function scrReview() {
  var checks = checksPanel([
    ['ok', 'Route served', 'Served', 'Vietnam → Cambodia → Thailand via Mộc Bài – Bavet and Poipet – Aranyaprathet. Regulation catalogs VN v5, KH v7 and TH v4 will be pinned.'],
    ['ok', 'Lead time', 'Met', 'Submitted 34 days before departure; 21 required for a cross-border move.'],
    ['ok', 'Blackout dates', 'Clear', 'No blackout on this route between 27 Oct and 2 Nov, the ±3-day window.'],
    ['pending', 'Capacity', 'Pending', 'The fleet calendar shows 2 shared-load trailers with a climate stall on Ho Chi Minh City → Bangkok in the window.', 'Asked Khôi, fleet & route coordinator, to confirm at 09:32 · waiting'],
    ['bad', 'Horses', 'Conflict', 'Shadowfax and Nightfall are on job CBRT-2026-041 and arrive in Phnom Penh on 18 Oct. They are also on quotation Q-2026-0188, in pre-export isolation in Phnom Penh from 6 Nov.']
  ]);
  var sent = requestSummary(REQ_0193, { title: 'What the customer sent · v1', extra: [['Estimate they saw', '$11,300 – $16,100', true]] });
  var hist = historyPanel([['28 Sep · 09:32', 'Asked Khôi to confirm shared-load capacity for 27 Oct – 2 Nov.', 'Yến, logistics manager'], ['28 Sep · 09:31', 'Horse conflict found: Shadowfax and Nightfall are booked on CBRT-2026-041.', 'System'], ['26 Sep · 09:14', 'Submitted with 2 horses; lead time checked, 34 of 21 days.', 'Saigon Turf Club']], null);
  var left = column([checks, sent, hist]);

  var dec = panel('Decision', { gap: 16 });
  var dh = VV({ name: 'Head', gap: 4 });
  addAll(dh, [Tx('Your decision', 'Heading/H4'), Tx('Ask the customer before quoting.', 'Body/S', 'text/secondary', { fill: true })]);
  add(dec, fillW(dh));
  var ask = VV({ name: 'Ask for information', gap: 12, pad: 16, radius: 8, fill: 'surface/raised', stroke: 'border/strong' });
  addAll(ask, [Tx('Ask for information', 'Label/M'), fillW(noteField('Note to Saigon Turf Club', REVIEW_NOTE, 'Required. The customer sees it exactly as written; the request goes back to them with your note.')), btn('Primary', 'MD', 'Send to customer', { fill: true, trail: 'arrow-right' })]);
  add(dec, fillW(ask));
  add(dec, divider());
  var other = VV({ name: 'Other outcomes', gap: 10 });
  addAll(other, [Tx('Other outcomes', 'Label/S', 'text/secondary'), btn('Secondary', 'MD', 'Start quotation', { fill: true }), Tx('Waits on the Horses check.', 'Body/S', 'text/tertiary', { fill: true }), btn('Ghost', 'MD', 'Reject with a reason', { fill: true })]);
  add(dec, fillW(other));
  var right = column([dec]);
  return reviewScreen('Logistics manager · Request review', 'REQ-2026-0193', reviewHead('Ho Chi Minh City → Bangkok', 'REQ-2026-0193', 'Saigon Turf Club · 2 horses · road, shared load · departs 30 Oct 2026 ±3 d', 'Due today', '28 Sep'), left, right);
}

/* ---------- REQ-2026-0190: inside the lead time, so an express override ---------- */
function scrReviewOverride() {
  var checks = checksPanel([
    ['ok', 'Route served', 'Served', 'Vietnam → Laos via Cầu Treo – Nam Phao. Regulation catalogs VN v5 and LA v3 will be pinned.'],
    ['bad', 'Lead time', 'Too short', 'Submitted 25 days before departure; 30 required for Vietnam → Laos. Without an override, the earliest departure is 25 Oct 2026.', 'The customer asked for an express override: “Race entry at Vientiane closes 22 Oct.”'],
    ['ok', 'Blackout dates', 'Clear', 'No blackout on this route on 20 Oct.'],
    ['ok', 'Capacity', 'Confirmed', 'One private trailer free 19–21 Oct.', 'Confirmed by Khôi, fleet & route coordinator, 26 Sep 16:10'],
    ['ok', 'Horses', 'Free', 'Lotus Crown has no other bookings and is already in quarantine at Sóc Sơn until 15 Oct.']
  ]);
  var sent = sentPanel('What the customer sent · v1', [['Horses', 'Lotus Crown'], ['Service', 'Road, private trailer'], ['Pickup', 'Sóc Sơn quarantine station, Hanoi'], ['Crossing', 'Cầu Treo – Nam Phao'], ['Departure', '20 Oct 2026, fixed', true], ['Estimate they saw', '$3,900 – $5,600', true]]);
  var rates = callout('Info', '2 rates are missing on Hanoi → Vientiane', 'Rate catalog v12 has no road rate or border fee for this corridor yet. Lan, transport specialist, adds them before the quotation can be issued. This does not block the review.');
  var hist = historyPanel([['26 Sep · 16:10', 'Capacity confirmed: one private trailer, 19–21 Oct.', 'Khôi, fleet & route coordinator'], ['25 Sep · 14:40', 'Submitted inside the lead time, with an express-override request.', 'Hanoi Riding Club']], null);
  var left = column([checks, rates, sent, hist]);

  var dec = panel('Decision', { gap: 16 });
  var dh = VV({ name: 'Head', gap: 4 });
  addAll(dh, [Tx('Your decision', 'Heading/H4'), Tx('Only the lead time fails. An express override lets the request continue; it is recorded on the request with your reason.', 'Body/S', 'text/secondary', { fill: true })]);
  add(dec, fillW(dh));
  var ov = VV({ name: 'Express override', gap: 12, pad: 16, radius: 8, fill: 'surface/raised', stroke: 'border/strong' });
  addAll(ov, [Tx('Grant express override', 'Label/M'), fillW(noteField('Reason for the override', 'Why this move can go at 25 days’ notice…', 'Required, and kept on the request. Grant stays unavailable until you write one.', true)), btn('Secondary', 'MD', 'Grant override', { fill: true, state: 'Disabled' })]);
  add(dec, fillW(ov));
  add(dec, divider());
  var other = VV({ name: 'Other outcomes', gap: 10 });
  addAll(other, [Tx('Other outcomes', 'Label/S', 'text/secondary'), btn('Secondary', 'MD', 'Refuse override and reject', { fill: true }), Tx('Rejects with your reason; the customer can copy the request into a new draft dated 25 Oct or later.', 'Body/S', 'text/tertiary', { fill: true })]);
  add(dec, fillW(other));
  return reviewScreen('Logistics manager · Request review · Override', 'REQ-2026-0190', reviewHead('Hanoi → Vientiane', 'REQ-2026-0190', 'Hanoi Riding Club · 1 horse · road, private trailer · departs 20 Oct 2026', 'Due today', '28 Sep'), left, column([dec]));
}

/* ---------- the customer's side: the request came back with a question ---------- */
function scrTrackInfo() {
  /* the question has three answers, so the customer picks one here; each opens the matching edit, prefilled */
  var answer = VV({ name: 'Your answer', gap: 12, pad: [0, 20, 20, 72] });
  var go = H({ name: 'Actions', gap: 16, cross: 'CENTER' });
  addAll(go, [btn('Primary', 'MD', 'Continue with this answer', { trail: 'arrow-right' }), Tx('Opens your request with the pickup set to Phnom Penh Equestrian Centre. Check it, then send it back as version 2.', 'Body/S', 'text/tertiary', { fill: true })]);
  addAll(answer, [Tx('Your answer', 'Label/S', 'text/secondary'), fillW(svcOptions([
    ['Selected', 'Collect them in Phnom Penh', 'Both arrive at Phnom Penh Equestrian Centre on 18 Oct.', 'Pickup moves; the estimate updates', null],
    ['Default', 'Move the date', 'Pick a later departure. Yến checks it against their other bookings.', 'Lead time checked again', null],
    ['Default', 'Choose other horses', 'Swap in horses from your list that are free on 30 Oct.', 'The estimate updates', null]], true)), fillW(go)]);
  var items = [owedItem('Soon', 'Answer Yến’s question', 'REQ-2026-0193 · version 1', REVIEW_NOTE + ' Reply by 9 Oct to keep the 30 Oct departure; after that the 21-day lead time moves it.', 'Reply in 11 days', '9 Oct 2026', 'Withdraw request', null, { secondary: true }), fillW(answer)];
  var lead = owedPanel('1 item', 'Yến, logistics manager, reviewed your request this morning and needs one answer before she can quote.', items, { chipTone: 'Warn', chipLabel: 'Waiting for you' }, null);
  var stagesP = stagePanel([
    ['Current', 'Returned to you on 28 Sep with one question from Yến. Your answer is above.', '', ''],
    ['Upcoming', 'Itemised and valid for 7 days. You accept and your 30% deposit is acknowledged.', '', ''],
    ['Upcoming', 'Price and horse list lock; the job gets its CBRT code.', '', ''],
    ['Upcoming', 'Your document checklist opens after approval.', '', ''],
    ['Upcoming', 'Two border crossings must clear before departure.', '', ''],
    ['Upcoming', 'Departs 30 Oct 2026, flexible by 3 days.', '', ''],
    ['Upcoming', 'Departure 30 Oct; you confirm handover on arrival.', 'In 32 days', '30 Oct']
  ]);
  var ver = panel('Versions', { gap: 10 });
  var v1 = H({ name: 'v1', gap: 10, cross: 'CENTER' });
  addAll(v1, [Tx('v1', 'Mono/Data'), Tx('Submitted 26 Sep 09:14 · returned 28 Sep 09:41', 'Body/S', 'text/secondary', { fill: true }), chip('Info', 'Current', { noDot: true })]);
  addAll(ver, [Tx('Versions', 'Heading/H4'), fillW(v1), Tx('Your changes become v2. You and Yến both keep v1, so nothing you sent is lost.', 'Body/S', 'text/tertiary', { fill: true })]);
  var est = panel('Estimate', { gap: 10 });
  addAll(est, [Tx('Your estimate at submission', 'Heading/H4'), Tx('$11,300 – $16,100', 'Display/M'), Tx('Still an indicative range. It updates if you change the horses, route or date.', 'Body/S', 'text/tertiary', { fill: true })]);
  var hist = historyPanel([['28 Sep · 09:41', 'Returned with a question: where to collect Shadowfax and Nightfall.', 'Yến, logistics manager'], ['26 Sep · 09:14', 'Request submitted with 2 horses and a climate-controlled stall.', 'You'], ['26 Sep · 09:14', 'Lead time checked: 34 days before departure, 21 required.', 'System']], null);
  return trackScreen('Tracking · Info required', trackHead('Ho Chi Minh City → Bangkok', ['REQ-2026-0193', '2 horses · road, shared load · departs 30 Oct 2026'], [stageChip('Request')], true), [lead, split(stagesP, column([ver, est])), hist], '28 Sep 2026, 10:05');
}

/* =====================================================================
   Quotation builder (EPIC-F1B). The same ledger the customer reads, built
   from the pinned rate catalog. Quantities are derived, percentages name
   their base, overrides carry a reason, and the total is never typed.
   ===================================================================== */
function builderHead(title, code, meta, back, chips) { return pageHeader({ shell: 'staff', back: back, title: title, code: code, summary: meta, right: chips }); }
/* the override opens in place under its line; focus/selection accent only */
function overrideEditor(catalog, value, reason) {
  var e = VV({ name: 'Override editor', gap: 14, pad: [16, 20, 16, 20], fill: 'surface/raised', stroke: 'border/strong' });
  var top = H({ name: 'Values', gap: 24, cross: 'MAX' });
  var cat = VV({ name: 'Catalog value', gap: 6 });
  addAll(cat, [Tx('Catalog value · v12', 'Label/S', 'text/secondary'), Tx(catalog, 'Mono/Data L', 'text/tertiary', { strike: true })]);
  addAll(top, [cat, input('Text', 'Focus', 'New amount', value, null)]);
  var acts = H({ name: 'Actions', gap: 8 });
  addAll(acts, [btn('Secondary', 'SM', 'Save override'), btn('Ghost', 'SM', 'Remove override')]);
  addAll(e, [Tx('Override this line', 'Label/M'), top, fillW(noteField('Reason, shown to the customer', reason, 'Required. The catalog value is kept beside the override on the quotation.')), acts]);
  return e;
}
function issuePanel(o) {
  var p = panel('Issue', { gap: 12 });
  add(p, Tx(o.title, 'Heading/H4'));
  add(p, dlRow('Total', o.total));
  if (o.deposit) add(p, dlRow('Deposit on acceptance', o.deposit));
  var v = H({ name: 'Validity', gap: 16, main: 'SPACE_BETWEEN', cross: 'CENTER' });
  var vd = VV({ name: 'Until', gap: 2, cross: 'MAX' });
  addAll(vd, [Tx(o.validFor, 'Label/S', 'text/primary', { align: 'RIGHT' }), Tx(o.validUntil, 'Mono/Caption', 'text/tertiary', { align: 'RIGHT' })]);
  addAll(v, [Tx('Validity', 'Body/S', 'text/secondary'), vd]);
  add(p, fillW(v));
  add(p, dlRow('Currency', 'USD · FX pinned at issue', { valueStyle: 'Label/S' }));
  (o.facts || []).forEach(function (f) { add(p, dlRow(f[0], f[1], { valueStyle: 'Label/S' })); });
  add(p, divider());
  var ready = H({ name: 'Readiness', gap: 10, cross: 'CENTER' });
  addAll(ready, [chip(o.ready ? 'Ok' : 'Neutral', o.ready ? 'Ready' : 'Waiting on rates', { noDot: !o.ready }), Tx(o.readyText, 'Body/S', 'text/secondary', { fill: true })]);
  add(p, fillW(ready));
  /* a blocked issue is not gold: an unavailable action is drawn as Secondary, with its reason beside it */
  add(p, btn(o.ready ? 'Primary' : 'Secondary', 'MD', o.issue, { fill: true, state: o.ready ? 'Default' : 'Disabled' }));
  if (o.ready) add(p, btn('Secondary', 'MD', 'Preview as the customer sees it', { fill: true }));
  else if (o.blockedWhy) add(p, Tx(o.blockedWhy, 'Body/S', 'text/tertiary', { fill: true }));
  return p;
}
function builderScreen(name, crumbs, head, left, right, today) {
  var body = H({ name: 'Body', gap: 24 });
  right.resize(SIDE.narrow, right.height); right.layoutSizingHorizontal = 'FIXED';
  addAll(body, [fillW(left), right]);
  return adminScreen(name, 'Requests', crumbs, STAFF.yen, [head, body], today);
}

/* ---------- Q-2026-0188 v2: ready to issue ---------- */
function quoteV1() {
  return QUOTE.map(function (g) { return [g[0], g[1], g[2], g[3].map(function (l) { var c = l.slice(); if (/^Air stall position/.test(c[0])) c[3] = 17400; return c; })]; });
}
function scrBuilder() {
  var T = quoteTotals(), T1 = quoteTotals(quoteV1());
  var overrides = 0, estimated = 0;
  QUOTE.forEach(function (g) { g[3].forEach(function (l) { if (l[4] === 'Overridden') overrides++; if (l[4] === 'Estimated') estimated++; }); });
  var table = quoteTable(QUOTE, T, function (l) { return l[4] === 'Overridden' ? overrideEditor(money(l[2] * l[3]), money(l[5]), l[6].replace(/^Override: (.)/, function (m, c) { return c.toUpperCase(); })) : null; });
  var left = column([table, quoteTotalsPanel(T)]);
  var issue = issuePanel({ title: 'Issue version 2', total: money(T.total), deposit: '30% · ' + money(T.deposit), validFor: 'In 7 days', validUntil: '30 Sep 2026', ready: true,
    readyText: 'All ' + T.lines + ' lines priced · ' + overrides + ' override · ' + estimated + ' estimated', issue: 'Issue quotation v2' });
  var ch = panel('Changed since v1', { gap: 10 });
  addAll(ch, [Tx('Changed since v1', 'Heading/H4'), dlRow('Departure', '12 Nov → 20 Nov'), dlRow('Rate catalog', 'v11 → v12'), dlRow('Air stall position', '$17,400.00 → $16,800.00'), dlRow('Total', money(T1.total) + ' → ' + money(T.total)),
    Tx('Re-issuing pins the current rate catalog. Every other line is unchanged.', 'Body/S', 'text/tertiary', { fill: true })]);
  var ver = panel('Versions', { gap: 10 });
  var v2 = H({ name: 'v2', gap: 10, cross: 'CENTER' });
  addAll(v2, [Tx('v2', 'Mono/Data'), Tx('Draft · 23 Sep 2026', 'Body/S', 'text/secondary', { fill: true }), chip('Neutral', 'Draft', { noDot: true })]);
  var v1 = H({ name: 'v1', gap: 10, cross: 'CENTER' });
  addAll(v1, [Tx('v1', 'Mono/Data', 'text/tertiary'), Tx('Issued 15 Sep · superseded when the departure moved', 'Body/S', 'text/tertiary', { fill: true })]);
  addAll(ver, [Tx('Versions', 'Heading/H4'), fillW(v2), fillW(v1)]);
  return builderScreen('Logistics manager · Quotation builder', ['Requests', 'REQ-2026-0179', 'Quotation'],
    builderHead('Phnom Penh → Hong Kong (Sha Tin)', 'Q-2026-0188', 'v2 draft · Saigon Turf Club · 2 horses · air, business class · departs 20 Nov 2026', 'REQ-2026-0179', [stageChip('Quotation'), chip('Neutral', 'Rates v12 pinned', { noDot: true })]),
    left, column([issue, ch, ver]), 'Wed 23 Sep 2026');
}

/* ---------- REQ-2026-0190 v1: two rates missing, so issuing is blocked ---------- */
var QUOTE_HAN = [
  ['A', 'Ground transport · origin', false, [
    ['Loading and handling at Sóc Sơn', 'per horse', 1, 120, 'Fixed']]],
  ['B', 'Pre-export', false, [
    ['Pre-export isolation · Lotus Crown (gelding)', 'per day · 5 days, 15–20 Oct', 5, 70, 'Fixed'],
    ['Veterinary inspection and bloods', 'per horse', 1, 310, 'Fixed']]],
  ['C', 'Road freight', false, [
    ['Road transfer Hanoi → Vientiane, private trailer', 'per km · about 700 km', 700, null, 'Fixed']]],
  ['D', 'Escort', false, [
    ['Groom, road escort', 'one per three horses · 1 ÷ 3, rounded up = 1', 1, 480, 'Fixed']]],
  ['E', 'Documentation', false, [
    ['Export health certificate', 'per horse', 1, 180, 'Fixed'],
    ['Customs and border documentation · Cầu Treo – Nam Phao', 'per crossing · 1', 1, null, 'Fixed'],
    ['Laos import permit handling', 'per shipment', 1, 260, 'Fixed']]]
];
function scrBuilderBlocked() {
  var T = quoteTotals(QUOTE_HAN);
  var table = quoteTable(QUOTE_HAN, T);
  var tot = panel('Totals', { gap: 10 });
  addAll(tot, [Tx('Totals', 'Heading/H4'), dlRow('Priced lines', money(T.subtotal)), dlRow('Total', '—')]);
  var left = column([callout('Bad', T.missing + ' rates are missing on Hanoi → Vientiane', 'Rate catalog v12 has no private-trailer road rate for this corridor and no border fee for Cầu Treo – Nam Phao. Reported to Lan, transport specialist, 29 Sep 09:05 · waiting.'), table, tot]);
  var issue = issuePanel({ title: 'Issue version 1', total: '—', validFor: 'In 7 days from issue', validUntil: 'not issued', ready: false,
    readyText: (T.lines - T.missing) + ' of ' + T.lines + ' lines priced', issue: 'Issue quotation', 
    facts: [['Lead-time override', 'Granted 28 Sep by Yến']] });
  return builderScreen('Logistics manager · Quotation builder · Blocked', ['Requests', 'REQ-2026-0190', 'Quotation'],
    builderHead('Hanoi → Vientiane', 'REQ-2026-0190', 'quotation v1 draft · Hanoi Riding Club · 1 horse · road, private trailer · departs 20 Oct 2026', 'REQ-2026-0190', [stageChip('Request'), chip('Neutral', 'Rates v12 pinned', { noDot: true })]),
    left, column([issue]), 'Tue 29 Sep 2026');
}

/* ---------- MCP entries ---------- */
/* the customer frame goes right after "In review"; later frames in the row move right to make room */
async function insertAfterCall(builder, afterName) {
  var page = await rehydrate(PAGE_NAMES[3]);
  var s = builder();
  await flush();
  page.children.filter(function (n) { return n.name === s.name && n !== s; }).forEach(function (n) { n.remove(); });
  var after = page.children.filter(function (n) { return n.name === afterName; })[0];
  var x = after.x + after.width + 120, shift = s.width + 120;
  page.children.forEach(function (n) { if (n !== s && n.type === 'FRAME' && Math.abs(n.y - after.y) < 1 && n.x >= x - 1) n.x += shift; });
  s.x = x; s.y = after.y;
  return report({ screens: [s.name + ' ' + s.id + ' ' + Math.round(s.width) + '×' + Math.round(s.height)] });
}
async function eReviewScreens() { return staffScreensCall([scrReview, scrReviewOverride]); }
async function eBuilderScreens() { return staffScreensCall([scrBuilder, scrBuilderBlocked]); }
async function eReviewCustomer() { return insertChainCall([scrTrackInfo], 'Tracking · In review'); }
