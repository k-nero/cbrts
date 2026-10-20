/* =====================================================================
   Trip: the escort's cab surface (Flow 4, on the road). Not the office
   job page with bigger buttons: a tablet in a sunlit cab, used with
   gloves between tasks. So: the Light theme (read in glare), one line of
   context at the top, the task first, 48 px toggles, times at 28 px, and
   the one gold action docked at the bottom edge. These records are the
   only source of the customer's route positions and arrival condition.
   ===================================================================== */
var TRIP_LOAD = [['Shadowfax', 'Stall 1 · standard'], ['Copper King', 'Stall 2 · box'], ['Nightfall', 'Stall 4 · climate'], ['Silver Bell', 'Stall 6 · standard']];
/* the canonical trip log for CBRT-2026-041 on 18 Oct: every other count derives from it */
var TRIP_LOG = [
  ['06:02', 'Loaded without incident. Copper King in the box stall, Nightfall in the climate stall.', 'Minh, driver'],
  ['06:05', 'Departed Phú Thọ training centre.', 'Minh, driver'],
  ['07:58', 'Arrived at Mộc Bài – Bavet; queue of 3 trailers.', 'Minh, driver'],
  ['08:34', 'Cleared Vietnam export and Cambodia entry at Mộc Bài – Bavet.', 'Minh, driver'],
  ['08:40', 'Condition checked after the border: all four settled and drinking.', 'Hoa, groom'],
  ['09:36', 'Arrived at the Svay Rieng welfare stop.', 'Minh, driver'],
  ['09:40', 'Condition logged: Nightfall is stressed, the others are stable.', 'Hoa, groom'],
  ['10:21', 'Left the Svay Rieng welfare stop.', 'Minh, driver'],
  ['12:41', 'Delivered at Phnom Penh Equestrian Centre.', 'Minh, driver'],
  ['12:48', 'Handed over to Sophea, receiving groom; arrival condition logged for 4 horses.', 'Hoa, groom']
];
function tripLogUntil(t) { return TRIP_LOG.filter(function (r) { return r[0] <= t; }); }
function tripLogSummary(t) { var l = tripLogUntil(t); return l.length + ' records, ' + l[0][0] + ' – ' + l[l.length - 1][0]; }
/* clock arithmetic for the demo times, so every delay and countdown derives from its fixture */
function toMin(t) { var p = t.split(':'); return +p[0] * 60 + +p[1]; }
function fromMin(m) { var h = Math.floor(m / 60), n = m % 60; return (h < 10 ? '0' : '') + h + ':' + (n < 10 ? '0' : '') + n; }
function durText(m) { var h = Math.floor(m / 60), n = m % 60; return h ? h + ' h' + (n ? ' ' + n + ' min' : '') : n + ' min'; }
/* CBRT-2026-040, 29 Sep: the escort's record of the hold is quoted verbatim wherever it appears */
var INC40 = { loaded: '05:30', held: '08:12', planned: '13:30', restEvery: 6,
  record: 'Mộc Bài is closed to vehicles over 10 t until 16:00 for a bridge inspection. We are parked in the Bavet exit lane. Mekong Star is settled.', by: 'Tùng, driver' };
function unloadBy() { return fromMin(toMin(INC40.loaded) + INC40.restEvery * 60); }
function onTrailer(now) { return durText(toMin(now) - toMin(INC40.loaded)); }
function arrivesLate(t) { return 'About ' + t + ' · ' + durText(toMin(t) - toMin(INC40.planned)) + ' late'; }
var ARRIVAL = [
  ['Shadowfax', 'Stall 1 · standard', 'Stable', null, null, 'Ate on arrival.'],
  ['Nightfall', 'Stall 4 · climate', 'Stable', null, null, 'Slight sweat at unloading, settled within 10 min.'],
  ['Copper King', 'Stall 2 · box', 'Stable', null, null, 'Walked off calmly.'],
  ['Silver Bell', 'Stall 6 · standard', 'Stable', null, null, 'Drinking well.']
];

function tallBtn(variant, label, o) { var b = btn(variant, 'MD', label, o); b.resize(b.width, 56); return fillW(b); }
/* one line of context: job, route, stage, the state that matters now, sync, time, who */
function cabBar(o) {
  var bar = H({ name: 'Cab bar', gap: 20, pad: [14, 32, 14, 32], cross: 'CENTER', fill: 'surface/card' });
  borderSide(bar, 'border/default', 'bottom');
  var job = H({ name: 'Job', gap: 12, cross: 'CENTER' });
  addAll(job, [Tx(o.code, 'Mono/Data', 'text/secondary'), Tx(o.route, 'Heading/H4'), stageMark('Trip'), chip(o.pillTone, o.pill)]);
  var sync = H({ name: 'Sync', gap: 8, cross: 'CENTER' });
  addAll(sync, [Ic(o.synced ? 'check' : 'clock', 18, o.synced ? 'status/ok/fg' : 'status/warn/fg'), Tx(o.sync, 'Label/S', o.synced ? 'text/secondary' : 'status/warn/fg')]);
  var who = H({ name: 'Who', gap: 10, cross: 'CENTER' });
  var av = H({ name: 'Avatar', w: 36, h: 36, radius: 999, fill: 'surface/muted', main: 'CENTER', cross: 'CENTER' });
  add(av, Tx(o.user[2], 'Label/S', 'text/secondary'));
  var wt = VV({ name: 'Text', gap: 0 });
  addAll(wt, [Tx(o.user[0], 'Label/S'), Tx(o.user[1], 'Body/S', 'text/tertiary')]);
  addAll(who, [av, wt]);
  addAll(bar, [fillW(job), sync, Tx(o.now, 'Mono/Data L', 'text/primary'), who]);
  return bar;
}
/* the route as big cells: stop, kind, and its time at 28 px */
function cabStrip(stops) {
  var row = H({ name: 'Route', gap: 12 });
  stops.forEach(function (s) {
    /* Current is info; Held is the current stop when the load is stopped, in the bad tone of the Held chip */
    var held = s[0] === 'Held', cur = s[0] === 'Current' || held, done = s[0] === 'Done', tn = held ? 'status/bad/' : 'status/info/';
    var c = VV({ name: s[1], gap: 4, pad: [14, 16, 14, 16], radius: 12, fill: cur ? tn + 'bg' : 'surface/card', stroke: cur ? tn + 'border' : 'border/default', sw: cur ? 1.5 : 1 });
    var h = H({ name: 'Head', gap: 8, cross: 'CENTER' });
    addAll(h, [dot(10, done ? 'status/ok/fg' : cur ? tn + 'fg' : 'border/strong', 'Point'), Tx(s[1], 'Label/M', 'text/primary')]);
    addAll(c, [h, Tx(s[2], 'Body/S', 'text/secondary'), Tx(s[3], 'Mono/Data L', done ? 'text/secondary' : 'text/primary'), Tx(s[4], 'Body/S', cur ? tn + 'fg' : 'text/tertiary')]);
    add(row, fillW(c));
  });
  return row;
}
var CAB_STOPS = [['Ho Chi Minh City', 'Pickup'], ['Mộc Bài – Bavet', 'Border'], ['Svay Rieng', 'Welfare stop'], ['Phnom Penh', 'Delivery']];
function stripAt(states, times, notes) { return cabStrip(CAB_STOPS.map(function (s, i) { return [states[i], s[0], s[1], times[i], notes[i]]; })); }
/* the dock: what will be saved, and the one gold action under the thumb */
function cabDock(summary, sub, action, secondary) {
  var d = H({ name: 'Dock', gap: 20, pad: [16, 32, 20, 32], cross: 'CENTER', fill: 'surface/card' });
  borderSide(d, 'border/strong', 'top');
  var t = VV({ name: 'Summary', gap: 2 });
  addAll(t, [Tx(summary, 'Label/M'), Tx(sub, 'Body/S', 'text/secondary', { fill: true })]);
  add(d, fillW(t));
  if (secondary) { var s = btn('Secondary', 'MD', secondary); s.resize(s.width, 64); add(d, s); }
  if (action) { var b = btn('Primary', 'MD', action, { lead: 'check' }); b.resize(440, 64); add(d, b); }
  return d;
}
function cabScreen(name, bar, strip, task, right, dock) {
  var s = VV({ name: name, w: SCREEN_W, fill: 'bg/canvas' });
  if (COLL.light) s.setExplicitVariableModeForCollection(COLL.color, COLL.light);
  var body = H({ name: 'Body', gap: 24 });
  right.resize(SIDE.narrow, right.height); right.layoutSizingHorizontal = 'FIXED';
  addAll(body, [fillW(task), right]);
  var main = VV({ name: 'Main', gap: 20, pad: [20, 32, 28, 32] });
  addAll(main, [fillW(strip), fillW(body)]);
  addAll(s, [fillW(bar), fillW(main), fillW(dock)]);
  return s;
}
/* a 48 px toggle. Ticked is a strong neutral box, the same as the Checkbox everywhere:
   green is kept for facts that are done, gold for the one action */
var CODES = /^[A-Z]{2,}-[A-Z0-9-]+( · [A-Z]{2,}-[A-Z0-9-]+)*$/;
function toggle48(label, on, sub) {
  var t = H({ name: 'Toggle · ' + label, gap: 12, pad: [0, 16, 0, 12], h: 48, radius: 8, cross: 'CENTER', fill: 'bg/input', stroke: 'border/strong' });
  var box = H({ name: 'Box', w: 24, h: 24, radius: 6, main: 'CENTER', cross: 'CENTER', fill: on ? 'text/primary' : null, stroke: on ? null : 'border/strong', sw: 1.5 });
  if (on) add(box, Ic('check', 16, 'bg/canvas'));
  addAll(t, [box, Tx(label, 'Label/M', 'text/primary')]);
  if (sub) add(t, fillW(Tx(sub, CODES.test(sub) ? 'Mono/Caption' : 'Body/S', 'text/secondary', { align: 'RIGHT' })));
  return t;
}
function nextStop(title, sub, due, date) {
  var p = panel('Next stop', { gap: 6 });
  addAll(p, [Tx(title, 'Heading/H3'), Tx(sub, 'Body/S', 'text/secondary', { fill: true })]);
  var d = H({ name: 'Due', gap: 12, cross: 'MAX' });
  addAll(d, [Tx(date, 'Mono/Data L', 'text/primary'), Tx(due, 'Label/M', 'status/info/fg')]);
  add(p, d);
  return p;
}
function loadPanel() {
  var p = panel('On board', { gap: 0, pad: [20, 24, 12, 24] });
  add(p, VV({ name: 'Title', pad: [0, 0, 10, 0] }, [Tx('On board', 'Heading/H4')]));
  TRIP_LOAD.forEach(function (h) {
    var r = H({ name: h[0], gap: 12, pad: [10, 0, 10, 0], cross: 'CENTER', main: 'SPACE_BETWEEN' });
    borderSide(r, 'border/default', 'top');
    addAll(r, [Tx(h[0], 'Label/M'), Tx(h[1], 'Body/S', 'text/secondary')]);
    add(p, fillW(r));
  });
  var crew = H({ name: 'Crew', gap: 12, pad: [10, 0, 10, 0], cross: 'CENTER', main: 'SPACE_BETWEEN' });
  borderSide(crew, 'border/default', 'top');
  addAll(crew, [Tx('Crew', 'Label/M'), Tx('Minh, driver · Hoa and Tuấn, grooms', 'Body/S', 'text/secondary')]);
  add(p, fillW(crew));
  return p;
}
function customerSees(text) {
  var p = panel('What the customer sees', { gap: 6 });
  addAll(p, [Tx('What the customer sees', 'Heading/H4'), Tx(text, 'Body/S', 'text/secondary', { fill: true })]);
  return p;
}
/* The four Flow 4 issue categories at touch size. The chosen one is said three ways so it survives glare in a sunlit cab:
   a check before the word, a 1.5px border in the full status colour, and its tone fill */
function conditionControl(pick) {
  var tones = { Stable: 'Ok', 'Off feed': 'Bad', Stressed: 'Warn', 'Climate change': 'Warn' };
  var s = H({ name: 'Condition', gap: 0, radius: 8, stroke: 'border/strong', clip: true });
  ['Stable', 'Off feed', 'Stressed', 'Climate change'].forEach(function (w, i) {
    var on = w === pick, tn = TONE[tones[w]];
    var c = H({ name: w, gap: 6, w: 132, h: 52, main: 'CENTER', cross: 'CENTER', fill: on ? tn.bg : null });
    if (on) { c.strokes = [P(tn.fg)]; c.strokeWeight = 1.5; c.strokeAlign = 'INSIDE'; add(c, Ic('check', 16, tn.fg)); }
    else if (i) { c.strokes = [P('border/strong')]; c.strokeAlign = 'INSIDE'; c.strokeTopWeight = 0; c.strokeBottomWeight = 0; c.strokeRightWeight = 0; c.strokeLeftWeight = 1; }
    add(c, Tx(w, 'Label/M', on ? tn.fg : 'text/secondary'));
    add(s, c);
  });
  return s;
}
function tick(label, on) {
  var cb = inst(C.checkbox, { Checked: on ? 'True' : 'False' });
  setP(cb, { Label: label });
  cb.name = 'Tick · ' + label;
  return cb;
}
function lineField(value, empty) {
  var f = H({ name: 'Note', pad: [14, 14, 14, 14], cross: 'CENTER', radius: 8, fill: 'bg/input', stroke: 'border/strong' });
  add(f, Tx(value, 'Body/M', empty ? 'text/tertiary' : 'text/primary', { fill: true }));
  return f;
}
/* one horse at a stop: name and stall, the condition word, 48 px toggles and a note */
function conditionRow(c) {
  var r = VV({ name: c[0], gap: 12, pad: [16, 24, 16, 24], fill: c[2] !== 'Stable' ? 'surface/raised' : null });
  borderSide(r, 'border/default', 'top');
  var top = H({ name: 'Top', gap: 20, cross: 'CENTER' });
  var n = VV({ name: 'Horse', gap: 2 });
  addAll(n, [Tx(c[0], 'Heading/H4'), Tx(c[1], 'Body/S', 'text/secondary')]);
  addAll(top, [fillW(n), conditionControl(c[2])]);
  var bottom = H({ name: 'Bottom', gap: 12, cross: 'CENTER' });
  if (c[3] != null) addAll(bottom, [toggle48('Drinking', c[3]), toggle48('Eating', c[4])]);
  add(bottom, fillW(lineField(c[5] || 'Add a note (optional)', !c[5])));
  addAll(r, [fillW(top), fillW(bottom)]);
  return r;
}
function taskHead(title, sub) {
  var h = VV({ name: 'Head', gap: 6, pad: [22, 24, 18, 24] });
  addAll(h, [Tx(title, 'Display/M'), Tx(sub, 'Body/M', 'text/secondary', { fill: true })]);
  return h;
}
function bar041(o) { o.code = 'CBRT-2026-041'; o.route = 'Ho Chi Minh City → Phnom Penh'; return cabBar(o); }

/* ---------- 08:34 at Mộc Bài – Bavet: record the crossing ---------- */
function scrTripCheckpoint() {
  var task = panel('Record this checkpoint', { gap: 0, pad: 0, clip: true });
  add(task, fillW(taskHead('Mộc Bài – Bavet', 'Border crossing: Vietnam exit and Cambodia entry. Arrived 07:58.')));
  var body = VV({ name: 'Fields', gap: 20, pad: [4, 24, 24, 24] });
  var out = VV({ name: 'Outcome', gap: 10 });
  addAll(out, [Tx('Outcome', 'Label/M', 'text/secondary'), fillW(svcOptions([
    ['Selected', 'Cleared', 'Both border posts stamped the papers and the trip goes on.', 'The customer sees “Cleared 08:34”', 'check'],
    ['Default', 'Held', 'The load is stopped at the border and can’t go on yet.', 'Alerts Yến, logistics manager, when you save', 'alert']], true))]);
  var docs = VV({ name: 'Documents shown', gap: 8 });
  addAll(docs, [Tx('Documents shown at the border', 'Label/M', 'text/secondary'),
    fillW(toggle48('Cambodia import permit', true, 'KH-IP-2026-3381')),
    fillW(toggle48('Export health certificates · 4 horses', true, 'DAH-XK-2026-0917')),
    fillW(toggle48('Customs clearance', true, 'TK-2026-300915'))]);
  var note = VV({ name: 'Note block', gap: 8 });
  addAll(note, [Tx('Note (optional)', 'Label/M', 'text/secondary'), fillW(lineField('Stamped at the Bavet desk; the load was not opened.'))]);
  addAll(body, [fillW(out), fillW(docs), fillW(note)]);
  add(task, fillW(body));
  var right = column([nextStop('Svay Rieng welfare stop', 'Water, rest and a condition check · 45 min.', 'in 56 min', '09:30'), loadPanel(),
    customerSees('The last checkpoint you recorded, with its time. Between checkpoints they see that one, never an estimate.')]);
  return cabScreen('Escort · Checkpoint', bar041({ pill: 'Clear to depart', pillTone: 'Ok', synced: true, sync: 'All records sent', now: '08:34', user: STAFF.minh }),
    stripAt(['Done', 'Current', 'Upcoming', 'Upcoming'], ['06:05', '07:58', '09:30', '12:30'], ['Departed', 'Arrived · recording now', 'Planned', 'Planned']),
    task, right, cabDock('Cleared at 08:34 · 3 documents shown', 'Saved on this tablet first and sent as soon as there is signal. You can amend it for 15 minutes.', 'Record: cleared at 08:34', 'Change time'));
}

/* ---------- 09:40 at Svay Rieng: each horse's condition ---------- */
var TRIP_CONDITION = [
  ['Shadowfax', 'Stall 1 · standard', 'Stable', true, true, 'Calm; ate hay straight away.'],
  ['Nightfall', 'Stall 4 · climate', 'Stressed', true, false, 'Light sweat on the neck again; drank about 8 L; settled within 10 minutes.'],
  ['Copper King', 'Stall 2 · box', 'Stable', true, true, ''],
  ['Silver Bell', 'Stall 6 · standard', 'Stable', true, true, '']
];
function scrTripWelfare() {
  var task = panel('Condition of each horse', { gap: 0, pad: 0, clip: true });
  add(task, fillW(taskHead('Condition of each horse', 'Check each horse in its stall before you leave. Record any concern for the logistics manager to review.')));
  var quick = H({ name: 'Shortcut', gap: 16, pad: [0, 24, 18, 24], cross: 'CENTER' });
  var q = btn('Secondary', 'MD', 'All stable · drinking · eating', { lead: 'check' }); q.resize(q.width, 52);
  addAll(quick, [q, Tx('Applied at 09:38. Then change only the horse that differs: Nightfall.', 'Body/S', 'text/secondary', { fill: true })]);
  add(task, fillW(quick));
  TRIP_CONDITION.forEach(function (c) { add(task, fillW(conditionRow(c))); });
  var prev = panel('Previous log', { gap: 6 });
  addAll(prev, [Tx('Last check · 08:40 at the border', 'Heading/H4'), Tx('All four horses settled and drinking after the border check. Nightfall sweated during loading and is calm now.', 'Body/S', 'text/secondary', { fill: true }), Tx('Hoa, groom', 'Body/S', 'text/tertiary')]);
  var right = column([nextStop('Phnom Penh Equestrian Centre', 'Delivery and handover to Sophea, receiving groom.', 'in 2 h 50 min', '12:30'), prev,
    customerSees('Each horse’s word and your note, under “Latest condition log”. They read the word you chose.')]);
  return cabScreen('Escort · Welfare stop', bar041({ pill: 'Clear to depart', pillTone: 'Ok', synced: true, sync: 'All records sent', now: '09:40', user: STAFF.hoa }),
    stripAt(['Done', 'Done', 'Current', 'Upcoming'], ['06:05', '08:34', '09:36', '12:30'], ['Departed', 'Cleared', 'Arrived · 6 min late', 'Planned']),
    task, right, cabDock('Leave in 41 min · by 10:21', '1 horse stressed, 3 stable. Saved on this tablet first; amend within 15 minutes.', 'Save condition log'));
}

/* ---------- 12:48 at Phnom Penh: hand over the horses ---------- */
function signatureBox(name, when) {
  var b = VV({ name: 'Signature', gap: 8, pad: [12, 16, 12, 16], radius: 8, fill: 'bg/input', stroke: 'border/strong' });
  var line = H({ name: 'Line', h: 64, cross: 'MAX' });
  var sig = Tx(name, 'Display/M', 'text/primary', { noStyle: true });
  if (FONT['display/Italic']) sig.fontName = FONT['display/Italic'];
  add(line, sig);
  var foot = H({ name: 'Foot', main: 'SPACE_BETWEEN', cross: 'CENTER' });
  var clr = btn('Secondary', 'MD', 'Clear signature'); clr.resize(clr.width, 48);
  addAll(foot, [Tx(when, 'Body/S', 'text/secondary'), clr]);
  addAll(b, [fillW(line), divider(), fillW(foot)]);
  return b;
}
function scrTripDelivery() {
  var task = panel('Hand over the horses', { gap: 0, pad: 0, clip: true });
  add(task, fillW(taskHead('Hand over the horses', 'Record each horse as it comes off the trailer, then have the receiving groom sign. Arrived 12:41 at Phnom Penh Equestrian Centre.')));
  ARRIVAL.forEach(function (c) { add(task, fillW(conditionRow(c))); });
  var hand = VV({ name: 'Handed over', gap: 8, pad: [18, 24, 18, 24] });
  borderSide(hand, 'border/default', 'top');
  addAll(hand, [Tx('Handed over', 'Label/M', 'text/secondary'),
    fillW(toggle48('4 horses', true, 'Shadowfax · Nightfall · Copper King · Silver Bell')),
    fillW(toggle48('4 equine passports', true)),
    fillW(toggle48('Import permit and 4 health certificates', true, 'KH-IP-2026-3381 · DAH-XK-2026-0917')),
    fillW(toggle48('Trip log', true, tripLogSummary('12:41') + '. This handover is record ' + TRIP_LOG.length + '.'))]);
  add(task, fillW(hand));
  var rec = VV({ name: 'Received by', gap: 12, pad: [18, 24, 24, 24] });
  borderSide(rec, 'border/default', 'top');
  var who = H({ name: 'Who', gap: 16, cross: 'MIN' });
  addAll(who, [fillW(input('Select', 'Default', 'Received by', 'Sophea · receiving groom', 'Named by the centre on the delivery order.')), fillW(signatureBox('Sophea', 'Signed on this tablet · 12:47'))]);
  add(rec, fillW(who));
  add(task, fillW(rec));
  var next = panel('What happens next', { gap: 8 });
  var d = H({ name: 'Due', gap: 12, cross: 'MAX' });
  addAll(d, [Tx('20 Oct', 'Mono/Data L', 'text/primary'), Tx('in 2 days', 'Label/M', 'status/info/fg')]);
  addAll(next, [Tx('The customer confirms', 'Heading/H4'), Tx('Saigon Turf Club confirms the handover and each horse’s condition, or reports a problem.', 'Body/S', 'text/secondary', { fill: true }), d,
    Tx('If they don’t reply by 20 Oct, the handover is taken as accepted on this record and Yến is told.', 'Body/S', 'text/secondary', { fill: true })]);
  var right = column([next, customerSees('Your condition words and notes under “Arrival condition”, with Sophea’s name and the time she signed.')]);
  return cabScreen('Escort · Delivery', bar041({ pill: 'Arrived 12:41', pillTone: 'Ok', synced: false, sync: '1 record waiting to send', now: '12:48', user: STAFF.hoa }),
    stripAt(['Done', 'Done', 'Done', 'Current'], ['06:05', '08:34', '09:36', '12:41'], ['Departed', 'Cleared', '45 min stop', 'Arrived · 11 min late']),
    task, right, cabDock('4 horses sound · signed by Sophea', 'Saved on this tablet first and sent as soon as there is signal.', 'Record handover at 12:48'));
}

/* ---------- CBRT-2026-040, 29 Sep 08:55: held, and what the escort does while waiting ---------- */
function scrTripHeld() {
  var task = panel('Held', { gap: 0, pad: 0, clip: true });
  add(task, fillW(taskHead('Held at Bavet – Mộc Bài', 'Mộc Bài is closed to heavy vehicles until 16:00. You recorded the hold at ' + INC40.held + '.')));
  var body = VV({ name: 'Fields', gap: 18, pad: [4, 24, 24, 24] });
  add(body, callout('Info', 'Yến was alerted at ' + INC40.held + ' and is deciding', 'She’ll choose between waiting, re-routing via Xa Mát or returning, and call you. Stay in the exit lane. Unload only if Mekong Star needs it.'));
  var clock = H({ name: 'Clock', gap: 24, pad: [16, 20, 16, 20], radius: 12, fill: 'status/warn/bg', stroke: 'status/warn/border', cross: 'CENTER' });
  var ct = VV({ name: 'Text', gap: 2 });
  addAll(ct, [Tx('On the trailer since ' + INC40.loaded, 'Label/M'), Tx('Unload to rest by ' + unloadBy() + ': at least every ' + INC40.restEvery + ' hours.', 'Body/S', 'text/secondary', { fill: true })]);
  addAll(clock, [Tx(onTrailer('08:55'), 'Mono/Data L', 'status/warn/fg'), fillW(ct)]);
  add(body, fillW(clock));
  var acts = H({ name: 'While you wait', gap: 12 });
  var a1 = btn('Secondary', 'MD', 'Log water or a check', { lead: 'plus' }); a1.resize(a1.width, 56);
  var a2 = btn('Secondary', 'MD', 'Call Yến', { lead: 'phone' }); a2.resize(a2.width, 56);
  addAll(acts, [a1, a2]);
  add(body, acts);
  add(task, fillW(body));
  var rec = panel('What you recorded', { gap: 6 });
  addAll(rec, [Tx('What you recorded', 'Heading/H4'), Tx('“' + INC40.record + '”', 'Body/S', 'text/primary', { fill: true }), stamp(INC40.held, INC40.by + ' · sent')]);
  var right = column([rec, customerSees('“Held at Bavet – Mộc Bài since ' + INC40.held + '”, and Yến’s message once she decides. Never a guessed arrival time.')]);
  return cabScreen('Escort · Held', cabBar({ code: 'CBRT-2026-040', route: 'Phnom Penh → Ho Chi Minh City', pill: 'Held at the border', pillTone: 'Bad', synced: true, sync: 'All records sent', now: '08:55', user: ['Nguyễn Văn Tùng', 'Driver', 'NT'] }),
    cabStrip([['Done', 'Phnom Penh', 'Pickup', INC40.loaded, 'Departed'], ['Held', 'Bavet – Mộc Bài', 'Border', INC40.held, 'Held since'], ['Upcoming', 'Tây Ninh', 'Welfare stop', '—', 'Waits on the decision'], ['Upcoming', 'Ho Chi Minh City', 'Delivery', '—', 'Waits on the decision']]),
    task, right, cabDock('Waiting for Yến’s decision', 'Nothing to record until she decides; any water or checks you log go on the trip record.', null));
}
/* ---------- The office side of the same trip: Khôi at 08:41 on 18 Oct ----------
   The coordinator watches what the cab records against the route he planned. Positions come
   only from recorded checkpoints, as on the customer's page, so nothing here is a guess.
   There is no gold: while the trip runs to plan the office has nothing to move forward. */
var NOW041 = '08:41';
/* [stop, kind, planned, recorded, what was recorded, chip tone, chip word] */
var TRIP_PLAN = [
  ['Phú Thọ training centre', 'Pickup · Ho Chi Minh City', '06:00', '06:05', 'Departed · Minh, driver', 'Ok', 'Departed'],
  ['Mộc Bài – Bavet', 'Border · Vietnam exit, Cambodia entry', '08:30', '08:34', 'Arrived 07:58, cleared both sides · Minh, driver', 'Ok', 'Cleared'],
  ['Svay Rieng welfare stop', 'Welfare stop · 45 min rest', '09:30', null, 'Expected in ' + durText(toMin('09:30') - toMin(NOW041)), 'Info', 'Next'],
  ['Phnom Penh Equestrian Centre', 'Delivery · handover to the receiving groom', '12:30', null, 'Window ' + JOB_WINDOW.from + '–' + JOB_WINDOW.until + ', ' + durText(toMin(JOB_WINDOW.until) - toMin('12:30')) + ' to spare at plan', 'Neutral', 'Upcoming']
];
function againstPlan(planned, recorded) {
  if (!recorded) return '—';
  var d = toMin(recorded) - toMin(planned);
  return d === 0 ? 'On time' : (d > 0 ? '+' : '−') + durText(Math.abs(d));
}
function scrTripCoordinator() {
  var last = TRIP_PLAN.filter(function (r) { return r[3]; }).pop();
  var log = tripLogUntil(NOW041);
  var tiles = H({ name: 'Tiles', gap: 16 });
  addAll(tiles, [
    fillW(stat('Neutral', againstPlan(last[2], last[3]), 'Against plan at ' + last[0])),
    fillW(stat('Neutral', JOB_WINDOW.from + '–' + JOB_WINDOW.until, 'Arrival window · plan arrives ' + TRIP_PLAN[3][2])),
    fillW(stat('Info', TRIP_PLAN[2][2], 'Next checkpoint · Svay Rieng')),
    fillW(stat('Ok', '4 of 4', 'Horses sound at the last check, ' + log[log.length - 1][0]))
  ]);

  var stops = tbl('Checkpoints', [['Checkpoint', null], ['Planned', 90, null, 'Mono/Data'], ['Recorded', 280], ['Against plan', 110, 'RIGHT', 'Mono/Data'], ['Status', 110, 'RIGHT']], TRIP_PLAN.map(function (r) {
    var name = VV({ name: r[0], gap: 2 });
    addAll(name, [Tx(r[0], 'Label/M'), Tx(r[1], 'Body/S', 'text/tertiary', { fill: true })]);
    var rec = VV({ name: 'Recorded', gap: 2 });
    if (r[3]) add(rec, Tx(r[3], 'Mono/Data', 'text/primary'));
    add(rec, Tx(r[4], 'Body/S', r[3] ? 'text/tertiary' : (r[5] === 'Info' ? 'status/info/fg' : 'text/tertiary'), { fill: true }));
    return { cells: [fillW(name), r[2], fillW(rec), againstPlan(r[2], r[3]), chip(r[5], r[6], r[5] === 'Neutral' ? { noDot: true } : null)], hl: r[6] === 'Next' };
  }));

  var lp = panel('Escort’s log', { gap: 0, pad: [20, 24, 12, 24] });
  var lh = VV({ name: 'Title', gap: 2, pad: [0, 0, 12, 0] });
  addAll(lh, [Tx('Escort’s log', 'Heading/H4'), Tx(tripLogSummary(NOW041) + '. Every record also reaches the customer’s page.', 'Body/S', 'text/tertiary')]);
  add(lp, fillW(lh));
  log.slice().reverse().forEach(function (r) {
    var row = H({ name: r[0], gap: 20, pad: [10, 0, 10, 0], cross: 'CENTER' });
    borderSide(row, 'border/default', 'top');
    addAll(row, [Tx(r[0], 'Mono/Caption', 'text/tertiary', { w: 56 }), Tx(r[1], 'Body/S', 'text/primary', { fill: true }), Tx(r[2], 'Body/S', 'text/tertiary', { w: 120, align: 'RIGHT' })]);
    add(lp, fillW(row));
  });
  var plan = titled('Checkpoints, planned against recorded', 'From the route plan you confirmed on 16 Oct; recorded times come from the cab.', stops, Tx('Updated ' + NOW041, 'Mono/Caption', 'text/tertiary'));

  /* each horse's condition from the last check, using the same four categories as the cab */
  var board = panel('On board', { gap: 0, pad: [20, 24, 12, 24] });
  var bh = VV({ name: 'Title', gap: 2, pad: [0, 0, 10, 0] });
  addAll(bh, [Tx('On board', 'Heading/H4'), Tx('Last condition check ' + log[log.length - 1][0] + ' by ' + log[log.length - 1][2] + '. Next at the welfare stop.', 'Body/S', 'text/tertiary', { fill: true })]);
  add(board, fillW(bh));
  var notes = { Nightfall: 'Sweated at loading; calm since the border.' };
  TRIP_LOAD.forEach(function (h) {
    var r = H({ name: h[0], gap: 12, pad: [10, 0, 10, 0], cross: 'CENTER' });
    borderSide(r, 'border/default', 'top');
    var t = VV({ name: 'Text', gap: 2 });
    add(t, Tx(h[0], 'Label/M'));
    add(t, Tx(notes[h[0]] ? h[1] + ' · ' + notes[h[0]] : h[1], 'Body/S', 'text/tertiary', { fill: true }));
    addAll(r, [fillW(t), chip('Ok', 'Stable')]);
    add(board, fillW(r));
  });
  var crew = panel('Crew and vehicle', { gap: 12 });
  add(crew, Tx('Crew and vehicle', 'Heading/H4'));
  [['Vehicle', 'Trailer TX-447', true], ['Driver', STAFF.minh[0]], ['Grooms', 'Lê Thị Hoa, Phạm Quốc Tuấn'], ['Records', 'All sent · last ' + log[log.length - 1][0]]].forEach(function (f) { add(crew, factRow(f)); });
  add(crew, btn('Secondary', 'MD', 'Call the cab', { fill: true }));
  var stop = panel('If the trip stops', { gap: 10 });
  addAll(stop, [Tx('If the trip stops', 'Heading/H4'),
    Tx('A hold recorded in the cab opens an incident for Yến, logistics manager, and tells the customer. Raise one yourself for anything the cab can’t record.', 'Body/S', 'text/secondary', { fill: true }),
    btn('Secondary', 'MD', 'Raise an incident', { lead: 'alert' })]);
  /* the table takes the full width; below it, what was recorded and what the customer reads, beside the horses and the crew */
  var left = column([lp, customerSees('Your horses cleared the Mộc Bài – Bavet border at 08:34. Next checkpoint: the Svay Rieng welfare stop, expected 09:30.')]);
  var right = column([board, crew, stop]);

  return jobScreen('Fleet & route coordinator · Trip', 'Trip', STAFF.khoi, [tiles, plan, split(left, right, SIDE.narrow)], {
    stage: 'Trip', gateState: 'Clear', today: 'Sun 18 Oct 2026',
    gate: 'Cleared 17 Oct, 16:20 by Lan, transport specialist. Departure recorded 06:05 by Minh, driver.'
  });
}
async function eTripA() { return insertChainCall([scrTripCoordinator, scrTripCheckpoint, scrTripWelfare], 'Fleet & route coordinator · Route plan'); }
async function eTripB() { return insertChainCall([scrTripDelivery, scrTripHeld], 'Escort · Welfare stop'); }
