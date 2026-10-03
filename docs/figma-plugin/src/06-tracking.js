/* =====================================================================
   Owner · Request tracking (customer). Desktop 1440. "Owed first":
   the page opens on what the customer owes, then where the move stands.
   Gold marks only the one forward action; status uses status tones.
   DM Mono is for codes, dates, times and counts; names and prose are not.
   ===================================================================== */
var URGENCY = {
  Overdue: { fg: 'status/bad/fg', bg: 'status/bad/bg', icon: 'alert', btn: 'Primary' },
  Soon: { fg: 'status/warn/fg', bg: 'status/warn/bg', icon: 'clock', btn: 'Primary' },
  Upcoming: { fg: 'text/secondary', bg: 'surface/muted', icon: 'upload', btn: 'Secondary' },
  Done: { fg: 'status/ok/fg', bg: 'status/ok/bg', icon: 'check', btn: 'Ghost' }
};
/* one tone per stage, shared by list and detail chips */
/* one process vocabulary everywhere: the seven stages, named the same on
   Home, the request wizard, tracking, the quotation and the staff jobs.
   A stage mark says where a request is, not how urgent it is: urgency lives
   in the owed items and deadlines, so a stage is plain words, never a toned chip. */
var STAGES = ['Request', 'Quotation', 'Approval', 'Documents', 'Clearance', 'Trip', 'Handover'];
/* a stage is a position, not a state, so it is said in words without a pill: the stage name, then where it sits in the seven */
function stageMark(s) {
  var h = H({ name: 'Stage · ' + s, gap: 6, cross: 'CENTER' });
  addAll(h, [Tx(s, 'Label/S', 'text/primary', { name: 'Stage' }), Tx((STAGES.indexOf(s) + 1) + ' of 7', 'Mono/Caption', 'text/tertiary', { name: 'Position' })]);
  return h;
}

function buildTrackingComponents(board) {
  var b = docBlock(board, 'Request tracking', 'Customer-side tracking pieces. Owed item: one thing the customer owes, with its reason and a two-line deadline (time left, then the date); urgency drives tone, and only the top item’s action is gold. Stage row: a stage (or a collapsed run of stages) with its owner and a two-line deadline. Route stop: a checkpoint on the schematic route; positions come from recorded checkpoints only. Status tones only, never gold.');

  var owed = Object.keys(URGENCY).map(function (u) {
    var s = URGENCY[u];
    var c = H({ component: true, name: 'Urgency=' + u, gap: 16, pad: [16, 20, 16, 20], cross: 'CENTER', w: 1100, fill: 'surface/card' });
    borderSide(c, 'border/default', 'top');
    var ic = H({ name: 'Icon wrap', w: 36, h: 36, radius: 8, fill: s.bg, main: 'CENTER', cross: 'CENTER' });
    add(ic, Ic(s.icon, 18, s.fg));
    var txt = VV({ name: 'Text', gap: 3 });
    addAll(txt, [
      Tx('Owed item title', 'Label/M', u === 'Done' ? 'text/tertiary' : 'text/primary', { name: 'Title', fill: true }),
      Tx('Horse · document', 'Label/S', 'text/tertiary', { name: 'Subject', fill: true }),
      Tx('Why this is needed.', 'Body/S', 'text/secondary', { name: 'Reason', fill: true })
    ]);
    var due = VV({ name: 'Due col', gap: 2, w: 140, cross: 'MAX' });
    addAll(due, [Tx('Due in 8 days', 'Label/S', s.fg, { name: 'Due', align: 'RIGHT' }), Tx('4 Oct 2026', 'Mono/Caption', 'text/tertiary', { name: 'Date', align: 'RIGHT' })]);
    var act = H({ name: 'Action col', gap: 8, main: 'MAX', cross: 'CENTER' });
    var a2 = btn('Secondary', 'SM', 'Report a problem'); a2.name = 'Action 2';
    var a = btn(s.btn, 'SM', u === 'Done' ? 'View' : 'Upload', u === 'Done' ? {} : { lead: 'upload' }); a.name = 'Action';
    addAll(act, [a2, a]);
    addAll(c, [ic, fillW(txt), due, act]);
    return c;
  });
  C.owed = combine(owed, b, 'Owed item');
  wireText(C.owed, ['Title', 'Subject', 'Reason', 'Due', 'Date']);
  wire(C.owed, 'Show second action', 'BOOLEAN', false, 'Action 2', 'visible');

  var MARK = {
    Done: { fill: 'status/ok/bg', stroke: 'status/ok/border', ink: 'status/ok/fg' },
    Current: { fill: 'status/info/bg', stroke: 'status/info/fg', ink: 'status/info/fg' },
    Upcoming: { fill: null, stroke: 'border/strong', ink: 'text/tertiary' },
    Blocked: { fill: 'status/bad/bg', stroke: 'status/bad/border', ink: 'status/bad/fg' }
  };
  var stages = Object.keys(MARK).map(function (st) {
    var k = MARK[st];
    var c = H({ component: true, name: 'State=' + st, gap: 14, pad: [12, 0, 12, 0], cross: 'MIN', w: 640 });
    borderSide(c, 'border/default', 'top');
    var m = H({ name: 'Marker', w: 28, h: 28, radius: 999, main: 'CENTER', cross: 'CENTER', fill: k.fill, stroke: k.stroke, sw: st === 'Current' ? 1.5 : 1 });
    if (st === 'Done') add(m, Ic('check', 14, k.ink));
    else if (st === 'Blocked') add(m, Ic('lock', 14, k.ink));
    else add(m, Tx('1', 'Mono/Caption', k.ink, { name: 'Number' }));
    var t = VV({ name: 'Text', gap: 2 });
    addAll(t, [Tx('Stage', 'Label/M', st === 'Upcoming' ? 'text/secondary' : 'text/primary', { name: 'Stage', fill: true }), Tx('Who does what next.', 'Body/S', st === 'Current' || st === 'Blocked' ? 'text/secondary' : 'text/tertiary', { name: 'Detail', fill: true })]);
    var meta = VV({ name: 'Meta col', gap: 2, w: 130, cross: 'MAX' });
    addAll(meta, [Tx('Due in 2 days', 'Label/S', st === 'Current' ? 'status/info/fg' : st === 'Blocked' ? 'status/bad/fg' : 'text/secondary', { name: 'Meta', align: 'RIGHT' }), Tx('28 Sep', 'Mono/Caption', 'text/tertiary', { name: 'Meta 2', align: 'RIGHT' })]);
    addAll(c, [m, fillW(t), meta]);
    return c;
  });
  C.stageRow = combine(stages, b, 'Stage row');
  wireText(C.stageRow, ['Stage', 'Detail', 'Meta', 'Meta 2', 'Number']);

  var stops = ['Done', 'Current', 'Upcoming'].map(function (st) {
    var c = VV({ component: true, name: 'State=' + st, gap: 6, w: 132, cross: 'CENTER' });
    var mark = H({ name: 'Marker', w: 20, h: 20, main: 'CENTER', cross: 'CENTER' });
    var d = dot(st === 'Current' ? 20 : 14, st === 'Done' ? 'status/ok/fg' : 'bg/canvas', 'Point');
    if (st === 'Upcoming') { d.strokes = [P('border/strong')]; d.strokeWeight = 2; }
    if (st === 'Current') { d.fills = [P('status/info/bg')]; d.strokes = [P('status/info/fg')]; d.strokeWeight = 2; }
    add(mark, d);
    addAll(c, [mark,
      Tx('Stop', 'Label/S', st === 'Upcoming' ? 'text/secondary' : 'text/primary', { name: 'Stop', w: 132, align: 'CENTER' }),
      Tx('Kind', 'Mono/Eyebrow', 'text/tertiary', { name: 'Kind', w: 132, align: 'CENTER' }),
      Tx('06:00', 'Mono/Caption', st === 'Current' ? 'status/info/fg' : 'text/tertiary', { name: 'Time', w: 132, align: 'CENTER' })]);
    return c;
  });
  C.stop2 = combine(stops, b, 'Route stop');
  wireText(C.stop2, ['Stop', 'Kind', 'Time']);
}

/* ---------- builders ---------- */
function trackScreen(name, head, blocks, asOf) {
  return screen(name, 'My requests', [head].concat(blocks), { gap: 28, asOf: asOf });
}
/* meta: [code, prose] so the code stays mono and the rest reads as prose */
/* a back link names its destination: "My requests" by default, or the page it returns to */
function trackHead(title, meta, chips, back) {
  return pageHeader({ back: back ? (typeof back === 'string' ? back : 'My requests') : null, title: title, code: meta[0], summary: meta[1], right: chips });
}
function owedItem(u, title, subject, reason, due, date, action, icon, o) {
  o = o || {};
  var it = inst(C.owed, { Urgency: u });
  setP(it, { Title: title, Subject: subject, Reason: reason, Due: due, Date: date });
  var a = nested(it, 'Action');
  if (a) {
    var m = { Label: action };
    if (icon) m['Leading icon'] = ICON[icon]; else m['Show leading icon'] = false;
    setP(a, m);
    if (o.secondary) setP(a, { Variant: 'Secondary' });
    if (icon) tint(a.children[0], o.secondary ? 'text/primary' : BTN_FG[URGENCY[u].btn]);
  }
  if (o.second) {
    setP(it, { 'Show second action': true });
    var a2 = nested(it, 'Action 2');
    if (a2) setP(a2, { Label: o.second });
  }
  it.name = 'Owed · ' + title;
  return fillW(it);
}
/* status: { text, note, pct } → progress bar; or { text, chipTone, chipLabel } → words + chip */
function owedPanel(count, sub, items, status, footer) {
  var p = panel('You owe', { gap: 0, pad: 0, clip: true });
  var head = H({ name: 'Head', gap: 24, pad: [20, 20, 16, 20], main: 'SPACE_BETWEEN', cross: 'CENTER' });
  var t = VV({ name: 'Text', gap: 4 });
  addAll(t, [Tx('You owe ' + count, 'Heading/H3'), Tx(sub, 'Body/S', 'text/secondary', { w: 620 })]);
  var pr = VV({ name: 'Status', gap: 6, w: 280, cross: 'MAX' });
  if (status.text) add(pr, Tx(status.text, 'Label/S', 'text/secondary', { align: 'RIGHT' }));
  if (status.pct != null) add(pr, progress('Ok', status.pct));
  if (status.chipLabel) add(pr, chip(status.chipTone, status.chipLabel));
  if (status.note) add(pr, Tx(status.note, 'Body/S', 'text/tertiary', { w: 280, align: 'RIGHT' }));
  addAll(head, [t, pr]);
  add(p, fillW(head));
  items.forEach(function (i) { add(p, i); });
  if (footer) {
    var f = H({ name: 'Footer', pad: [10, 12, 10, 12], fill: 'bg/sunken' });
    borderSide(f, 'border/default', 'top');
    add(f, btn('Ghost', 'SM', footer));
    add(p, fillW(f));
  }
  return p;
}
/* nothing owed: the next owner and step, with the deadline shown twice */
function nothingOwed(title, next, dueText, dueDate) {
  var p = H({ name: 'You owe · nothing', gap: 16, pad: [20, 20, 20, 20], radius: 12, cross: 'CENTER', fill: 'surface/card', stroke: 'border/default' });
  var ic = H({ name: 'Icon wrap', w: 40, h: 40, radius: 999, fill: 'status/ok/bg', main: 'CENTER', cross: 'CENTER' });
  add(ic, Ic('check', 20, 'status/ok/fg'));
  var t = VV({ name: 'Text', gap: 4 });
  addAll(t, [Tx(title, 'Heading/H3'), Tx(next, 'Body/M', 'text/secondary', { fill: true })]);
  var d = VV({ name: 'Next due', gap: 2, w: 160, cross: 'MAX' });
  addAll(d, [Tx(dueText, 'Label/S', 'status/info/fg', { align: 'RIGHT' }), Tx(dueDate, 'Mono/Caption', 'text/tertiary', { align: 'RIGHT' })]);
  addAll(p, [ic, fillW(t), d]);
  return p;
}
function joinNames(list) { return list.length < 2 ? list.join('') : list.slice(0, -1).join(', ') + ' and ' + list[list.length - 1]; }
/* compact track: done stages collapse to one row, then the current stage and
   the one after it in full, then the remaining stages as one summary row.
   rows: 7 × [state, detail, meta, meta2] */
function stagePanel(rows, title) {
  var p = panel('Where it stands', { gap: 0, pad: [20, 24, 8, 24] });
  add(p, VV({ name: 'Title', pad: [0, 0, 12, 0] }, [Tx(title || 'Where it stands', 'Heading/H4')]));
  var put = function (state, stage, detail, meta, meta2, number) {
    var s = inst(C.stageRow, { State: state });
    setP(s, { Stage: stage, Detail: detail, Meta: meta || '', 'Meta 2': meta2 || '' });
    if (number) setP(s, { Number: number });
    s.name = 'Stage · ' + stage;
    add(p, fillW(s));
  };
  var done = [], i = 0;
  while (i < rows.length && rows[i][0] === 'Done') { done.push(i); i++; }
  if (done.length > 1) {
    var last = rows[done[done.length - 1]];
    put('Done', joinNames(done.map(function (d) { return STAGES[d]; })), rows[0][1] ? 'Done. ' + last[1] : 'Done.', last[2], last[3]);
  } else if (done.length === 1) put('Done', STAGES[0], rows[0][1], rows[0][2], rows[0][3]);
  var shown = 0;
  while (i < rows.length && shown < 2) { var r = rows[i]; put(r[0], STAGES[i], r[1], r[2], r[3], String(i + 1)); i++; shown++; }
  if (i < rows.length) {
    var rest = [];
    for (var j = i; j < rows.length; j++) rest.push(STAGES[j]);
    put('Upcoming', 'Then ' + joinNames(rest).toLowerCase(), rows[rows.length - 1][1], rows[rows.length - 1][2], rows[rows.length - 1][3], '+' + rest.length);
  }
  return p;
}
/* horizontal route for full-width use */
function routeStrip(stops, gate) {
  var line = H({ name: 'Route line', gap: 0 });
  var legTone = function (ok) { return ok ? 'status/ok/fg' : 'border/strong'; };
  if (gate) {
    var g = VV({ name: 'Gate', gap: 6, w: 96, cross: 'CENTER' });
    var lk = H({ name: 'Lock', w: 20, h: 20, radius: 999, main: 'CENTER', cross: 'CENTER', fill: gate === 'Locked' ? 'status/bad/bg' : 'status/ok/bg' });
    add(lk, Ic(gate === 'Locked' ? 'lock' : 'unlock', 12, gate === 'Locked' ? 'status/bad/fg' : 'status/ok/fg'));
    addAll(g, [lk, Tx('Clearance', 'Label/S', 'text/primary', { w: 96, align: 'CENTER' }), Tx(gate === 'Locked' ? 'Locked' : 'Clear', 'Mono/Eyebrow', gate === 'Locked' ? 'status/bad/fg' : 'status/ok/fg', { w: 96, align: 'CENTER' })]);
    add(line, g);
    add(line, fillW(VV({ name: 'Leg', pad: [9, 0, 0, 0] }, [fillW(rect(20, 2, legTone(gate !== 'Locked'), 'Leg line'))])));
  }
  stops.forEach(function (s, i) {
    var n = inst(C.stop2, { State: s[0] });
    setP(n, { Stop: s[1], Kind: s[2], Time: s[3] });
    n.name = 'Stop · ' + s[1];
    add(line, n);
    if (i < stops.length - 1) {
      var ok = s[0] === 'Done' && (stops[i + 1][0] === 'Done' || stops[i + 1][0] === 'Current');
      add(line, fillW(VV({ name: 'Leg', pad: [9, 0, 0, 0] }, [fillW(rect(20, 2, legTone(ok), 'Leg line'))])));
    }
  });
  return line;
}
/* vertical checkpoint list for side columns */
function routeList(stops, gate) {
  var v = VV({ name: 'Route list', gap: 0 });
  var rows = [];
  if (gate) rows.push(['Gate', 'Clearance', gate === 'Locked' ? 'Departure locked' : 'Clear to depart', '', gate]);
  stops.forEach(function (s) { rows.push([s[0], s[1], s[2], s[3]]); });
  rows.forEach(function (r, i) {
    var last = i === rows.length - 1;
    var row = H({ name: r[1], gap: 12 });
    var mk = VV({ name: 'Marker', gap: 4, w: 20, cross: 'CENTER' });
    var passed = r[0] === 'Done' || (r[0] === 'Gate' && r[4] !== 'Locked');
    if (r[0] === 'Gate') {
      var lk = H({ name: 'Lock', w: 20, h: 20, radius: 999, main: 'CENTER', cross: 'CENTER', fill: r[4] === 'Locked' ? 'status/bad/bg' : 'status/ok/bg' });
      add(lk, Ic(r[4] === 'Locked' ? 'lock' : 'unlock', 12, r[4] === 'Locked' ? 'status/bad/fg' : 'status/ok/fg'));
      add(mk, lk);
    } else {
      var d = dot(14, r[0] === 'Done' ? 'status/ok/fg' : 'bg/canvas', 'Point');
      if (r[0] === 'Upcoming') { d.strokes = [P('border/strong')]; d.strokeWeight = 2; }
      if (r[0] === 'Current') { d.fills = [P('status/info/bg')]; d.strokes = [P('status/info/fg')]; d.strokeWeight = 2; }
      add(mk, d);
    }
    var next = rows[i + 1];
    if (!last) add(mk, rect(2, 28, passed && next && (next[0] === 'Done' || next[0] === 'Current') ? 'status/ok/fg' : 'border/strong', 'Leg'));
    var t = VV({ name: 'Text', gap: 2 });
    addAll(t, [Tx(r[1], 'Label/S', r[0] === 'Upcoming' ? 'text/secondary' : 'text/primary'), Tx(r[2], 'Mono/Eyebrow', r[4] === 'Locked' ? 'status/bad/fg' : 'text/tertiary')]);
    addAll(row, [mk, fillW(t), Tx(r[3], 'Mono/Caption', r[0] === 'Current' ? 'status/info/fg' : 'text/tertiary', { w: 110, align: 'RIGHT' })]);
    add(v, fillW(row));
  });
  return v;
}
/* facts: [label, value, mono?] — mono only for codes, counts and distances */
function factRow(f) {
  var r = H({ name: f[0], gap: 16, cross: 'CENTER', main: 'SPACE_BETWEEN' });
  addAll(r, [Tx(f[0], 'Body/S', 'text/secondary', { name: 'Label' }), Tx(f[1], f[2] ? 'Mono/Data' : 'Label/S', 'text/primary', { name: 'Value', align: 'RIGHT' })]);
  return fillW(r);
}
function routePanel(title, sub, stops, gate, facts) {
  var p = panel('Route', { gap: 18 });
  var h = VV({ name: 'Title', gap: 2 });
  addAll(h, [Tx(title, 'Heading/H4'), Tx(sub, 'Body/S', 'text/tertiary', { fill: true })]);
  addAll(p, [fillW(h), fillW(routeList(stops, gate))]);
  if (facts) {
    add(p, divider());
    facts.forEach(function (f) { add(p, factRow(f)); });
  }
  return p;
}
function historyPanel(rows, more) {
  var p = panel('History', { gap: 0, pad: [20, 24, 12, 24] });
  add(p, VV({ name: 'Title', pad: [0, 0, 12, 0] }, [Tx('History', 'Heading/H4')]));
  rows.forEach(function (r) {
    var row = H({ name: r[1], gap: 20, pad: [10, 0, 10, 0], cross: 'CENTER' });
    borderSide(row, 'border/default', 'top');
    addAll(row, [Tx(r[0], 'Mono/Caption', 'text/tertiary', { w: 150 }), Tx(r[1], 'Body/S', 'text/primary', { fill: true }), Tx(r[2], 'Body/S', 'text/tertiary', { w: 220, align: 'RIGHT' })]);
    add(p, fillW(row));
  });
  if (more) add(p, VV({ name: 'More', pad: [8, 0, 4, 0] }, [btn('Ghost', 'SM', more)]));
  return p;
}
/* people on the move: first name + role + what they handle */
function peoplePanel(people, title) {
  title = title || 'Who is on your move';
  var p = panel(title, { gap: 0, pad: [20, 24, 8, 24] });
  add(p, VV({ name: 'Title', pad: [0, 0, 12, 0] }, [Tx(title, 'Heading/H4')]));
  people.forEach(function (x) {
    var row = H({ name: x[0], gap: 12, pad: [10, 0, 10, 0], cross: 'CENTER' });
    borderSide(row, 'border/default', 'top');
    var av = H({ name: 'Avatar', w: 32, h: 32, radius: 999, fill: 'surface/muted', main: 'CENTER', cross: 'CENTER' });
    add(av, Tx(x[0].charAt(0), 'Label/S', 'text/secondary'));
    var t = VV({ name: 'Text', gap: 2 });
    addAll(t, [Tx(x[0] + ', ' + x[1], 'Label/S', 'text/primary'), Tx(x[2], 'Body/S', 'text/tertiary', { fill: true })]);
    addAll(row, [av, fillW(t)]);
    add(p, fillW(row));
  });
  return p;
}
function split(left, right, rightW) {
  var r = H({ name: 'Status row', gap: 24 });
  right.resize(rightW || SIDE.wide, right.height);
  right.layoutSizingHorizontal = 'FIXED';
  addAll(r, [fillW(left), right]);
  return r;
}
function column(kids) { var c = VV({ name: 'Column', gap: 24 }); kids.forEach(function (k) { add(c, fillW(k)); }); return c; }
var HCMC_PNH = [
  ['Ho Chi Minh City', 'Pickup', '06:00'], ['Mộc Bài – Bavet', 'Border', '08:30'], ['Svay Rieng', 'Welfare stop', '09:30'], ['Phnom Penh', 'Delivery', '12:30']
];
function stopsWith(states, times) { return HCMC_PNH.map(function (s, i) { return [states[i], s[0], s[1], times ? times[i] : s[2]]; }); }

/* ---------- My requests ---------- */
/* the requests table, the same with no rows (first run) or three; a row opens with its chevron */
var REQ_COLS = [['Request', 150, null, 'Mono/Caption', null, 'Unsorted'], ['Route', null], ['Horses', 70, 'RIGHT', 'Mono/Data'], ['Departs', 110, null, 'Mono/Caption', 'text/secondary', 'Unsorted'], ['Stage', 170, null, null, null, 'Unsorted'], ['', 150, 'RIGHT'], ['', 24, 'RIGHT']];
function rowOpen() { var i = Ic('arrow-right', 16, 'text/tertiary'); i.name = 'Open'; return i; }
function scrMyRequests() {
  var owe = function (n, tone) { return n ? chip(tone, 'You owe ' + n) : Tx('Nothing needed', 'Body/S', 'text/tertiary'); };
  var route = function (a, b) { var v = VV({ name: 'Stack', gap: 2 }); addAll(v, [Tx(a, 'Label/S'), Tx(b, 'Body/S', 'text/tertiary')]); return v; };
  /* the customer's reference never changes; quotation and job codes sit beside it once they exist */
  var ref = function (req, also) { var v = VV({ name: 'Reference', gap: 2 }); add(v, Tx(req, 'Mono/Caption', 'text/primary')); if (also) add(v, Tx(also, 'Mono/Caption', 'text/tertiary')); return v; };
  var t = tbl('Requests', REQ_COLS, [
    { cells: [ref('REQ-2026-0162', 'Job CBRT-2026-041'), route('Ho Chi Minh City → Phnom Penh', 'Road, private trailer'), '4', '18 Oct 2026', stageMark('Documents'), owe(4, 'Bad'), rowOpen()], hl: true },
    { cells: [ref('REQ-2026-0179', 'Quote Q-2026-0188'), route('Phnom Penh → Hong Kong (Sha Tin)', 'Air, business class'), '2', '20 Nov 2026', stageMark('Quotation'), owe(1, 'Warn'), rowOpen()] },
    { cells: [ref('REQ-2026-0193'), route('Ho Chi Minh City → Bangkok', 'Road, shared load'), '2', '30 Oct 2026', stageMark('Request'), owe(0), rowOpen()] }
  ]);
  tableFoot(t, 3, 3, 'requests');
  var list = tableBlock({ tabs: [['Active · 3', 'Active'], ['Past · 1', 'Default']], filters: [filterField('Search', 'Search', 'Code, route or horse', { placeholder: true })],
    count: '3 active requests', order: 'Order: what needs you first', table: t });
  var hint = Tx('Your request number stays the same from submission to handover; the quotation and job codes appear beside it once they exist.', 'Body/S', 'text/tertiary', { w: 760 });
  return trackScreen('Tracking · My requests', trackHead('My requests', [null, '3 active, 1 past · Saigon Turf Club'], [], false), [list, hint], '26 Sep 2026');
}

/* ---------- Detail: in review (submitted Sat 26 Sep) ---------- */
function scrTrackReview() {
  var lead = nothingOwed('Nothing needed from you right now', 'Next: Yến, logistics manager, checks the route, dates and capacity within 1 business day. You will get the itemised quotation here.', 'Due Monday', '28 Sep 2026');
  var stagesP = stagePanel([
    ['Current', 'Submitted Sat 26 Sep. Yến, logistics manager, is reviewing feasibility.', 'Due Monday', '28 Sep'],
    ['Upcoming', 'Itemised and valid for 7 days. You accept and pay a 30% deposit.', '', ''],
    ['Upcoming', 'Price and horse list lock; the job gets its CBRT code.', '', ''],
    ['Upcoming', 'Your document checklist opens after approval.', '', ''],
    ['Upcoming', 'Two border crossings must clear before departure.', '', ''],
    ['Upcoming', 'Departs 30 Oct 2026, flexible by 3 days.', '', ''],
    ['Upcoming', 'Departure 30 Oct; you confirm handover on arrival.', 'In 34 days', '30 Oct']
  ]);
  var est = panel('Estimate', { gap: 10 });
  addAll(est, [Tx('Your estimate at submission', 'Heading/H4'), Tx('$11,300 – $16,100', 'Display/M'), Tx('An indicative range, not a quote. The quotation will be itemised line by line.', 'Body/S', 'text/tertiary', { fill: true }), divider(),
    fillW(requestSummary(REQ_0193, { title: 'What you sent', bare: true, only: ['Horses', 'Service', 'Route', 'Departure'] }))]);
  var hist = historyPanel([['26 Sep · 09:14', 'Request submitted with 2 horses and a climate-controlled stall.', 'You'], ['26 Sep · 09:14', 'Lead time checked: 34 days before departure, 21 required.', 'System']], null);
  return trackScreen('Tracking · In review', trackHead('Ho Chi Minh City → Bangkok', ['REQ-2026-0193', '2 horses · road, shared load · departs 30 Oct 2026'], [stageMark('Request')], true), [lead, split(stagesP, est), hist], '26 Sep 2026, 11:20');
}

/* ---------- Detail: documents needed ---------- */
function scrTrackDocs() {
  var items = [
    owedItem('Overdue', 'Upload a signed bill of sale', 'Silver Bell · Proof of ownership', 'Rejected 24 Sep by Lan, transport specialist: the bill of sale is unsigned. Upload a signed copy.', 'Overdue by 1 day', 'Was due 25 Sep', 'Upload signed copy', 'upload'),
    owedItem('Soon', 'Extend transit insurance to 20 Oct', 'Shipment · PVI Insurance policy', 'The policy ends 15 Oct, before arrival plus 2 days (20 Oct). Upload the extended policy.', 'Due in 4 days', '30 Sep 2026', 'Upload extended policy', 'upload', { secondary: true }),
    owedItem('Upcoming', 'Book a new EIA (Coggins) test', 'Nightfall · EIA (Coggins) test', 'Valid today, but 77 days old at departure; the limit is 60. The new test must be dated 19 Aug or later.', 'Due in 8 days', '4 Oct 2026', 'Upload test result', 'upload'),
    owedItem('Upcoming', 'Upload a new influenza booster record', 'Silver Bell · Influenza vaccination', 'The booster lapsed on 16 Sep. Give a new booster at least 7 days before departure and upload the record.', 'Due in 15 days', '11 Oct 2026', 'Upload booster record', 'upload')
  ];
  var lead = owedPanel('4 items', 'One is overdue. Each upload is checked against your travel dates the moment you send it, so you will know at once if it passes.', items,
    { text: '14 of 23 documents cleared', pct: 60, note: '4 owed by you. The vet authority issues 4 export health certificates (8–14 Oct); the import permit is with the Cambodian authority.' }, 'See all 23 documents');
  var stagesP = stagePanel([
    ['Done', 'You submitted the request with 4 horses.', '', '2 Sep'],
    ['Done', 'Quotation v2 accepted; deposit paid.', '', '10 Sep'],
    ['Done', 'Approved by Yến, logistics manager. Job CBRT-2026-041.', 'Done', '12 Sep'],
    ['Current', 'You upload; Lan, transport specialist, checks each document.', 'Last due in 15 days', '11 Oct'],
    ['Blocked', 'Lan files the dossiers once documents are cleared. Departure stays locked until then.', 'Expected in 18 days', '14 Oct'],
    ['Upcoming', 'Minh, driver, with two grooms. Pickup 06:00.', '', ''],
    ['Upcoming', 'Pickup 06:00 on 18 Oct; you confirm handover in Phnom Penh.', 'In 22 days', '18 Oct']
  ]);
  var people = peoplePanel([['Lan', 'transport specialist', 'Checks your documents and files the border dossiers.'], ['Yến', 'logistics manager', 'Approved the job; handles changes to dates or price.'], ['Minh', 'driver', 'Drives trailer TX-447 on 18 Oct with two grooms.']]);
  var route = routePanel('Route', 'Planned. Positions will come from checkpoints recorded by the escort.', stopsWith(['Upcoming', 'Upcoming', 'Upcoming', 'Upcoming']), 'Locked', [['Vehicle', 'Trailer TX-447', true], ['Driver', 'Minh'], ['Grooms', '2, one per 3 horses'], ['Distance', '240 km · 6.5 h', true]]);
  var hist = historyPanel([
    ['24 Sep · 16:02', 'Proof of ownership for Silver Bell rejected: the bill of sale is unsigned.', 'Lan, transport specialist'],
    ['21 Sep · 10:15', 'EIA test for Shadowfax uploaded and approved.', 'You, then Lan'],
    ['16 Sep · 02:00', 'Silver Bell’s influenza booster lapsed; the item was reopened.', 'System'],
    ['12 Sep · 11:30', 'Job approved as CBRT-2026-041; document checklist created (23 items).', 'Yến, logistics manager'],
    ['10 Sep · 18:44', 'Quotation v2 accepted; 30% deposit confirmed.', 'You']
  ], 'Show all 14 events');
  return trackScreen('Tracking · Documents needed', trackHead('Ho Chi Minh City → Phnom Penh', ['REQ-2026-0162', 'job CBRT-2026-041 · 4 horses · road, private trailer · departs 18 Oct 2026, 06:00'], [stageMark('Documents'), chip('Bad', 'Departure locked')], true), [lead, split(column([stagesP, people]), route, SIDE.wide), hist], '26 Sep 2026, 11:20');
}

/* ---------- Detail: in transit ---------- */
/* CBRT-2026-041 on 18 Oct at 08:41: the last confirmed checkpoint and what is next; Tracking · In transit and Home share it */
function onTheRoad() {
  var route = panel('Route', { gap: 20 });
  var rh = H({ name: 'Head', main: 'SPACE_BETWEEN', cross: 'MAX' });
  addAll(rh, [VV({ name: 'Title', gap: 2 }, [Tx('On the road', 'Heading/H3'), Tx('Positions come from checkpoints the escort records. Between checkpoints we show the last confirmed one, never a guess.', 'Body/S', 'text/tertiary')]), Tx('Updated 08:41', 'Mono/Caption', 'text/tertiary')]);
  addAll(route, [fillW(rh), fillW(routeStrip(stopsWith(['Done', 'Current', 'Upcoming', 'Upcoming'], ['06:05 · departed', '08:34 · cleared', 'exp. 09:30', 'exp. 12:30']), 'Clear'))]);
  return route;
}
function scrTrackTransit() {
  var lead = nothingOwed('Nothing needed from you', 'Your horses cleared the Mộc Bài – Bavet border at 08:34. Next checkpoint: the Svay Rieng welfare stop.', 'Expected in 49 min', '09:30');
  var route = onTheRoad();
  var log = panel('Condition log', { gap: 12 });
  add(log, Tx('Latest condition log', 'Heading/H4'));
  [['08:40', 'All four horses settled and drinking after the border check. Nightfall sweated during loading and is calm now.', 'Hoa, groom'], ['06:02', 'Loaded without incident. Copper King in the box stall, Nightfall in the climate stall.', 'Minh, driver']].forEach(function (r) {
    var e = VV({ name: r[0], gap: 4, pad: [12, 0, 0, 0] });
    borderSide(e, 'border/default', 'top');
    var h = H({ name: 'Head', gap: 10, cross: 'CENTER' });
    addAll(h, [Tx(r[0], 'Mono/Data', 'text/primary'), Tx(r[2], 'Body/S', 'text/tertiary')]);
    addAll(e, [h, Tx(r[1], 'Body/S', 'text/secondary', { fill: true })]);
    add(log, fillW(e));
  });
  var stagesP = stagePanel([
    ['Done', 'Submitted with 4 horses.', '', '2 Sep'], ['Done', 'Quotation v2 accepted.', '', '10 Sep'], ['Done', 'Approved. Job CBRT-2026-041.', '', '12 Sep'],
    ['Done', '23 of 23 documents cleared.', '', '14 Oct'], ['Done', 'Dossiers approved; quarantine complete.', 'Done', '17 Oct'],
    ['Current', 'On the road with Minh, driver, and two grooms since 06:05. Planned to arrive inside your ' + JOB_WINDOW.from + '–' + JOB_WINDOW.until + ' window.', 'Arrives in about 4 h', '12:30'], ['Upcoming', 'You confirm handover and condition on arrival.', 'Due within 2 days', 'by 20 Oct']
  ], 'Where it stands');
  var hist = historyPanel([['18 Oct · 08:34', 'Cleared Vietnam export and Cambodia entry at Mộc Bài – Bavet.', 'Minh, driver'], ['18 Oct · 06:05', 'Departed Phú Thọ training centre.', 'Minh, driver'], ['17 Oct · 16:20', 'Clearance complete; departure unlocked.', 'Lan, transport specialist']], 'Show all 31 events');
  return trackScreen('Tracking · In transit', trackHead('Ho Chi Minh City → Phnom Penh', ['REQ-2026-0162', 'job CBRT-2026-041 · 4 horses · departed 18 Oct 2026, 06:05'], [stageMark('Trip')], true), [lead, route, split(stagesP, log, SIDE.wide), hist], '18 Oct 2026, 08:41');
}

/* ---------- Detail: delivered ---------- */
function scrTrackDelivered() {
  var items = [owedItem('Soon', 'Confirm handover and condition', 'Shipment · 4 horses delivered 12:41', 'Hoa, groom, logged all four horses sound on arrival. Confirm receipt, or report a problem. If you don’t reply by 20 Oct, the handover is taken as accepted on Hoa’s record.', 'Due in 2 days', '20 Oct 2026', 'Confirm handover', 'check', { second: 'Report a problem' })];
  var lead = owedPanel('1 item', 'Your horses arrived at Phnom Penh Equestrian Centre at 12:41, eleven minutes after the planned time.', items,
    { chipTone: 'Warn', chipLabel: 'Waiting for you' }, null);
  var route = routePanel('Route', 'Completed. Every checkpoint was recorded by the escort.', stopsWith(['Done', 'Done', 'Done', 'Done'], ['06:05', '08:34', '09:36', '12:41']), 'Clear', [['On time', 'Yes, 11 min after plan'], ['Distance', '240 km', true], ['Border', 'Cleared, no hold']]);
  var arr = panel('Arrival record', { gap: 12 });
  add(arr, Tx('Arrival condition', 'Heading/H4'));
  [['Shadowfax', 'Sound. Ate on arrival.'], ['Nightfall', 'Sound. Slight sweat at unloading, settled within 10 min.'], ['Copper King', 'Sound. Walked off calmly.'], ['Silver Bell', 'Sound. Drinking well.']].forEach(function (h) {
    var row = H({ name: h[0], gap: 16, pad: [10, 0, 10, 0], cross: 'CENTER' });
    borderSide(row, 'border/default', 'top');
    addAll(row, [Tx(h[0], 'Heading/H4', 'text/primary', { w: 140 }), Tx(h[1], 'Body/S', 'text/secondary', { fill: true }), chip('Ok', 'Sound')]);
    add(arr, fillW(row));
  });
  add(arr, Tx('Logged at 12:48 by Hoa, groom. Handed over to Sophea, receiving groom.', 'Body/S', 'text/tertiary', { fill: true }));
  var stagesP = stagePanel([
    ['Done', 'Submitted with 4 horses.', '', '2 Sep'], ['Done', '', '', ''], ['Done', '', '', ''], ['Done', '', '', ''], ['Done', '', '', ''],
    ['Done', 'Delivered at 12:41, 11 minutes after plan.', 'Done', '18 Oct'],
    ['Current', 'Confirm receipt and condition, or report a problem.', 'Due in 2 days', '20 Oct']
  ]);
  var hist = historyPanel([['18 Oct · 12:48', 'Arrival condition logged for 4 horses.', 'Hoa, groom'], ['18 Oct · 12:41', 'Delivered at Phnom Penh Equestrian Centre.', 'Minh, driver'], ['18 Oct · 09:36', 'Welfare stop at Svay Rieng, 45 minutes.', 'Minh, driver']], 'Show all 36 events');
  return trackScreen('Tracking · Delivered', trackHead('Ho Chi Minh City → Phnom Penh', ['REQ-2026-0162', 'job CBRT-2026-041 · 4 horses · delivered 18 Oct 2026, 12:41'], [stageMark('Handover')], true), [lead, split(column([arr, stagesP]), route, SIDE.wide), hist], '18 Oct 2026, 12:50');
}

/* ---------- entries ---------- */
var TRACK_ORDER = ['Tracking · My requests', 'Tracking · In review', 'Tracking · Documents needed', 'Tracking · In transit', 'Tracking · Delivered'];
function trackRowLabel(page) {
  var name = 'Row label · Owner · Request tracking';
  var label = page.children.filter(function (n) { return n.name === name; })[0];
  if (label) return label;
  var bottom = 0;
  page.children.forEach(function (n) { bottom = Math.max(bottom, n.y + n.height); });
  label = Tx('Owner · Request tracking', 'Display/M', 'text/primary', { name: name });
  page.appendChild(label);
  label.x = 0; label.y = bottom + 240;
  return label;
}
/* rebuilds keep row order: a replaced frame takes the old frame's slot */
async function trackScreensCall(builders) {
  var page = await rehydrate(PAGE_NAMES[3]);
  var made = [];
  for (var i = 0; i < builders.length; i++) {
    var s = primaryTheme(builders[i]());
    await flush();
    var old = page.children.filter(function (n) { return n.name === s.name && n !== s; });
    var label = trackRowLabel(page), y = label.y + 120;
    if (old.length) { s.x = old[0].x; s.y = old[0].y; old.forEach(function (n) { n.remove(); }); }
    else {
      var idx = TRACK_ORDER.indexOf(s.name), x = 0;
      page.children.forEach(function (n) { if (n !== s && n.type === 'FRAME' && Math.abs(n.y - y) < 1 && TRACK_ORDER.indexOf(n.name) < idx) x = Math.max(x, n.x + n.width + 120); });
      s.x = x; s.y = y;
    }
    made.push(s.name + ' ' + s.id + ' ' + Math.round(s.width) + '×' + Math.round(s.height));
  }
  return report({ screens: made });
}
async function eTrackComponents() {
  var page = await rehydrate(PAGE_NAMES[2]);
  var board = page.children.filter(function (n) { return n.name === 'Components'; })[0];
  board.children.filter(function (n) { return n.name === 'Request tracking'; }).forEach(function (n) { n.remove(); });
  buildTrackingComponents(board);
  await flush();
  return report({ owed: C.owed.id, stageRow: C.stageRow.id, stop: C.stop2.id });
}
async function eTrackScreensA() { return trackScreensCall([scrMyRequests, scrTrackReview, scrTrackDocs]); }
async function eTrackScreensB() { return trackScreensCall([scrTrackTransit, scrTrackDelivered]); }
