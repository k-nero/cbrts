/* =====================================================================
   Document upload and versions (Flow 2, customer). One page per required
   document: the rule in words, the file and its dates, and the automatic
   check's answer directly under the fields, before any person looks at
   it. The check reads the travel dates, not today: GREEN goes to review,
   AMBER is kept but won't clear, RED is refused and nothing is saved.
   Every version stays listed, and so does every refused attempt.
   ===================================================================== */
var EIA_RULE = 'Sampled within 60 days of departure. For your departure on 18 Oct, the test must be sampled on 19 Aug or later.';

/* the three answers the check can give today; the ranges move with today's date */
function rulePanel(today, outcomes) {
  var p = panel('The rule', { gap: 14 });
  var h = VV({ name: 'Head', gap: 6 });
  addAll(h, [Tx('What this test must show', 'Heading/H4'), Tx(EIA_RULE, 'Body/M', 'text/primary', { fill: true })]);
  add(p, fillW(h));
  var list = VV({ name: 'Outcomes', gap: 0 });
  outcomes.forEach(function (o) {
    var r = H({ name: o[1], gap: 16, pad: [10, 0, 10, 0], cross: 'CENTER' });
    borderSide(r, 'border/default', 'top');
    var st = H({ name: 'Status col', w: 184 });
    add(st, chip(o[0], o[1]));
    addAll(r, [st, Tx(o[2], 'Body/S', 'text/secondary', { fill: true })]);
    add(list, fillW(r));
  });
  add(p, fillW(list));
  add(p, Tx('Checked against 18 Oct as of ' + today + ' · Cambodia regulation catalog v7, pinned to job CBRT-2026-041', 'Body/S', 'text/tertiary', { fill: true }));
  return p;
}
function fileRow(name, size, action) {
  var r = H({ name: 'File', gap: 12, pad: [12, 16, 12, 12], radius: 8, cross: 'CENTER', fill: 'bg/sunken', stroke: 'border/default' });
  var ic = H({ name: 'Icon wrap', w: 36, h: 36, radius: 8, fill: 'surface/muted', main: 'CENTER', cross: 'CENTER' });
  add(ic, Ic('file', 18, 'text/secondary'));
  var t = VV({ name: 'Text', gap: 2 });
  addAll(t, [Tx(name, 'Mono/Data', 'text/primary'), Tx(size, 'Mono/Caption', 'text/tertiary')]);
  addAll(r, [ic, fillW(t), btn('Ghost', 'SM', action)]);
  return r;
}
/* fields: 4 × [type, state, label, value, helper] laid out two by two */
function uploadPanel(file, fields, result, actions) {
  var p = panel('Your file', { gap: 16 });
  add(p, Tx('Your file', 'Heading/H4'));
  add(p, fillW(file));
  [fields.slice(0, 2), fields.slice(2, 4)].forEach(function (pair, i) {
    var row = H({ name: 'Fields ' + (i + 1), gap: 16, cross: 'MIN' });
    pair.forEach(function (f) { add(row, fillW(input(f[0], f[1], f[2], f[3], f[4]))); });
    add(p, fillW(row));
  });
  add(p, result);
  if (actions) add(p, fillW(actions));
  return p;
}
/* versions: [code, when, detail, tone, word, dim] */
function versionsPanel(rows, note) {
  var p = panel('Versions', { gap: 0, pad: [20, 24, 16, 24] });
  add(p, VV({ name: 'Title', pad: [0, 0, 12, 0] }, [Tx('Versions', 'Heading/H4')]));
  rows.forEach(function (v) {
    var r = H({ name: v[0], gap: 12, pad: [12, 0, 12, 0], cross: 'MIN' });
    borderSide(r, 'border/default', 'top');
    var t = VV({ name: 'Text', gap: 3 });
    var top = H({ name: 'Head', gap: 8, cross: 'CENTER' });
    addAll(top, [Tx(v[0], 'Mono/Data', v[5] ? 'text/tertiary' : 'text/primary'), Tx(v[1], 'Mono/Caption', 'text/tertiary')]);
    addAll(t, [top, Tx(v[2], 'Body/S', v[5] ? 'text/tertiary' : 'text/secondary', { fill: true })]);
    addAll(r, [fillW(t), chip(v[3], v[4], { noDot: v[3] === 'Neutral' })]);
    add(p, fillW(r));
  });
  add(p, VV({ name: 'Note', pad: [8, 0, 0, 0] }, [Tx(note, 'Body/S', 'text/tertiary', { w: 352 })]));
  return p;
}
/* where the document stands now: tone + word, what happens next, the deadline twice */
function docStatusPanel(tone, word, line, facts, due) {
  var p = panel('Status', { gap: 12 });
  var h = VV({ name: 'Head', gap: 10 });
  addAll(h, [Tx('Where this test stands', 'Heading/H4'), chip(tone, word)]);
  addAll(p, [fillW(h), Tx(line, 'Body/S', 'text/secondary', { fill: true })]);
  if (due) {
    var d = H({ name: 'Due', gap: 16, main: 'SPACE_BETWEEN', cross: 'CENTER' });
    var dd = VV({ name: 'Date', gap: 2, cross: 'MAX' });
    addAll(dd, [Tx(due[1], 'Label/S', due[3] || 'text/primary', { align: 'RIGHT' }), Tx(due[2], 'Mono/Caption', 'text/tertiary', { align: 'RIGHT' })]);
    addAll(d, [Tx(due[0], 'Body/S', 'text/secondary'), dd]);
    add(p, fillW(d));
  }
  facts.forEach(function (f) { add(p, dlRow(f[0], f[1], { valueStyle: f[2] ? 'Mono/Data' : 'Label/S' })); });
  return p;
}
function docHead() {
  return trackHead('Nightfall · EIA (Coggins) test', ['REQ-2026-0162', 'job CBRT-2026-041 · Ho Chi Minh City → Phnom Penh · departs 18 Oct 2026'], [stageMark('Documents')], 'Your documents');
}
var LAN_CHECKS = [['Lan', 'transport specialist', 'Reviews the test after the automatic check, usually within 1 business day. Only a test she approves counts toward clearance.']];

/* ---------- GREEN: the new test passes and goes to Lan (Fri 2 Oct) ---------- */
function scrDocUpload() {
  var rule = rulePanel('2 Oct', [
    ['Ok', 'Passes', 'Sampled 19 Aug or later. Goes to Lan for review.'],
    ['Warn', 'Expires in transit', 'Sampled 3–18 Aug. Still valid today but too old at departure, so it is kept and a replacement is needed by 4 Oct.'],
    ['Bad', 'Refused', 'Sampled 2 Aug or earlier. Already more than 60 days old, so it is refused and not saved.']
  ]);
  var res = callout('Ok', 'Passes: sampled 1 Oct, 17 days before departure', 'The limit is 60 days, so this test covers 18 Oct with 43 days to spare. Sent to Lan, transport specialist, for review; her decision appears here.');
  var up = uploadPanel(fileRow('EIA_Nightfall_2026-10-01.pdf', 'PDF · 412 KB · uploaded 2 Oct 2026, 10:12', 'Replace file'), [
    ['Date', 'Default', 'Sample date', '1 Oct 2026', 'As printed on the certificate. The rule counts from this date.'],
    ['Select', 'Default', 'Issuing laboratory', 'NAVETCO Laboratory, Ho Chi Minh City', 'An approved laboratory for Cambodia.'],
    ['Select', 'Default', 'Result', 'Negative', null],
    ['Date', 'Default', 'Valid until', '30 Nov 2026', 'Not printed on this test, so worked out as the sample date + 60 days.']
  ], res, null);
  var status = docStatusPanel('Info', 'In review', 'Nothing more is needed from you for this test. If Lan approves it, Nightfall’s EIA test is cleared.', [['With', 'Lan, transport specialist'], ['Uploaded', '2 Oct 2026, 10:12', true]], ['Your deadline', 'Met 2 days early', 'was due 4 Oct', 'status/ok/fg']);
  var ver = versionsPanel([
    ['v2', '2 Oct 2026', 'Sampled 1 Oct · NAVETCO · 17 days old at departure.', 'Info', 'In review'],
    ['Attempt', '27 Sep 2026', 'Sampled 20 Jul · 90 days old at departure. Refused at upload; the file was not saved.', 'Bad', 'Refused', true],
    ['v1', '4 Aug 2026', 'Sampled 2 Aug · 77 days old at departure. Kept for the record; replaced by v2.', 'Neutral', 'Replaced', true]
  ], 'Every version is kept, and Lan sees the same list. Refused attempts are listed but their files are never stored.');
  var hist = historyPanel([
    ['2 Oct · 10:12', 'EIA test sampled 1 Oct uploaded as v2. Automatic check: passes, 17 of 60 days.', 'You, then the system'],
    ['27 Sep · 16:40', 'Upload refused: the test was sampled 20 Jul, 90 days before departure.', 'System'],
    ['4 Aug · 09:03', 'v1 uploaded. Automatic check: valid then, but 77 days old at departure.', 'You, then the system']
  ], null);
  return trackScreen('Tracking · Document upload', docHead(), [split(column([rule, up]), column([status, ver, peoplePanel(LAN_CHECKS, 'Who checks it')]), SIDE.narrow), hist], '2 Oct 2026, 10:15');
}

/* ---------- RED: the wrong test is refused on the spot (Sun 27 Sep) ---------- */
function scrDocRefused() {
  var rule = rulePanel('27 Sep', [
    ['Ok', 'Passes', 'Sampled 19 Aug or later. Goes to Lan for review.'],
    ['Warn', 'Expires in transit', 'Sampled 29 Jul – 18 Aug. Still valid today but too old at departure, so it is kept and a replacement is needed by 4 Oct.'],
    ['Bad', 'Refused', 'Sampled 28 Jul or earlier. Already more than 60 days old, so it is refused and not saved.']
  ]);
  var res = callout('Bad', 'Refused: this test is too old', 'Sampled 20 Jul, which is 90 days before your 18 Oct departure and already 69 days old today; the limit is 60 days. A test sampled on 19 Aug or later passes. Nothing was saved.');
  var acts = H({ name: 'Actions', gap: 16, main: 'SPACE_BETWEEN', cross: 'CENTER' });
  var due = VV({ name: 'Due', gap: 2 });
  addAll(due, [Tx('Due in 7 days', 'Label/S', 'text/primary'), Tx('4 Oct 2026', 'Mono/Caption', 'text/tertiary')]);
  addAll(acts, [due, btn('Primary', 'MD', 'Choose another file', { lead: 'upload' })]);
  var up = uploadPanel(fileRow('EIA_Nightfall_2026-07-20.pdf', 'PDF · 388 KB · checked 27 Sep 2026, 16:40 · not saved', 'Remove'), [
    ['Date', 'Error', 'Sample date', '20 Jul 2026', null],
    ['Select', 'Default', 'Issuing laboratory', 'NAVETCO Laboratory, Ho Chi Minh City', 'An approved laboratory for Cambodia.'],
    ['Select', 'Default', 'Result', 'Negative', null],
    ['Date', 'Default', 'Valid until', '18 Sep 2026', 'Not printed on this test, so worked out as the sample date + 60 days.']
  ], res, acts);
  var status = docStatusPanel('Warn', 'Expires in transit', 'Your current test (v1) is valid today but will be 77 days old at departure, so it won’t clear. Upload a test sampled on 19 Aug or later.', [['Current version', 'v1 · 4 Aug 2026', true], ['Checked by', 'Lan, transport specialist']], ['Replacement', 'Due in 7 days', '4 Oct 2026']);
  var ver = versionsPanel([
    ['Attempt', '27 Sep 2026', 'Sampled 20 Jul. Not saved.', 'Bad', 'Refused'],
    ['v1', '4 Aug 2026', 'Sampled 2 Aug · 77 days old at departure. Kept, but it won’t clear.', 'Warn', 'Expires in transit']
  ], 'Every version is kept, and Lan sees the same list. Refused attempts are listed but their files are never stored.');
  return trackScreen('Tracking · Document upload · Refused', docHead(), [split(column([rule, up]), column([status, ver, peoplePanel(LAN_CHECKS, 'Who checks it')]), SIDE.narrow)], '27 Sep 2026, 16:40');
}

/* ---------- the customer's full list: 23 documents, who holds each ---------- */
/* rows: [document, rule, tone, word, holder, due, date, dueTone, result] */
var ALL_DOCS = [
  ['Shadowfax', 'Gelding · Andalusian', [
    ['Equine passport', RULE.passport, 'Ok', 'Cleared', 'Cleared by Lan', 'Done', '2 Sep'],
    ['Influenza vaccination', RULE.vacc, 'Ok', 'Cleared', 'Cleared by Lan', 'Done', '2 Sep'],
    ['EIA (Coggins) test', RULE.eia, 'Ok', 'Cleared', 'Cleared by Lan', 'Done', '21 Sep'],
    ['Export health certificate', RULE.health, 'Neutral', 'Not issued yet', 'the vet authority', 'In 12 days', '8–14 Oct'],
    ['Proof of ownership', RULE.own, 'Ok', 'Cleared', 'Cleared by Lan', 'Done', '2 Sep']]],
  ['Nightfall', 'Mare · Thoroughbred', [
    ['Equine passport', RULE.passport, 'Ok', 'Cleared', 'Cleared by Lan', 'Done', '2 Sep'],
    ['Influenza vaccination', RULE.vacc, 'Ok', 'Cleared', 'Cleared by Lan', 'Done', '2 Sep'],
    ['EIA (Coggins) test', RULE.eia, 'Warn', 'Expires in transit', 'You', 'Due in 8 days', '4 Oct', null, '77 days old at departure. Upload a test sampled on 19 Aug or later.'],
    ['Export health certificate', RULE.health, 'Neutral', 'Not issued yet', 'the vet authority', 'In 12 days', '8–14 Oct'],
    ['Proof of ownership', RULE.own, 'Ok', 'Cleared', 'Cleared by Lan', 'Done', '2 Sep']]],
  ['Copper King', 'Stallion · Quarter Horse', [
    ['Equine passport', RULE.passport, 'Ok', 'Cleared', 'Cleared by Lan', 'Done', '3 Sep'],
    ['Influenza vaccination', RULE.vacc, 'Ok', 'Cleared', 'Cleared by Lan', 'Done', '3 Sep'],
    ['EIA (Coggins) test', RULE.eia, 'Ok', 'Cleared', 'Cleared by Lan', 'Done', '11 Sep'],
    ['Export health certificate', RULE.health, 'Neutral', 'Not issued yet', 'the vet authority', 'In 12 days', '8–14 Oct'],
    ['Proof of ownership', RULE.own, 'Ok', 'Cleared', 'Cleared by Lan', 'Done', '3 Sep']]],
  ['Silver Bell', 'Mare · Lipizzan', [
    ['Equine passport', RULE.passport, 'Ok', 'Cleared', 'Cleared by Lan', 'Done', '4 Sep'],
    ['Influenza vaccination', RULE.vacc, 'Bad', 'Fails rule', 'You', 'Due in 15 days', '11 Oct', null, 'The booster lapsed on 16 Sep. Give a new one at least 7 days before departure.'],
    ['EIA (Coggins) test', RULE.eia, 'Ok', 'Cleared', 'Cleared by Lan', 'Done', '19 Sep'],
    ['Export health certificate', RULE.health, 'Neutral', 'Not issued yet', 'the vet authority', 'In 12 days', '8–14 Oct'],
    ['Proof of ownership', RULE.own, 'Bad', 'Rejected', 'You', 'Overdue by 1 day', 'was due 25 Sep', 'status/bad/fg', 'Rejected 24 Sep by Lan: the bill of sale is unsigned.']]],
  ['Shipment', 'Documents for the whole job', [
    ['Cambodia import permit', 'Valid through arrival + 2 days', 'Info', 'With the authority', 'Cambodia’s GDAHP', 'Expected in 15 days', '11 Oct', null, 'Filed 15 Sep by Lan · ref KH-IP-2026-3381.'],
    ['Transit insurance', 'Must cover the journey + 2 days', 'Warn', 'Expires in transit', 'You', 'Due in 4 days', '30 Sep', 'status/warn/fg', 'Ends 15 Oct, before 20 Oct. Upload the extended policy.'],
    ['Customs value declaration · Mộc Bài – Bavet', 'One per border crossing', 'Ok', 'Cleared', 'Cleared by Lan', 'Done', '20 Sep']]]
];
/* one document row for both sides: the rule result as a chip, who holds it, the deadline twice.
   The customer reads "With you"; staff read "With the customer". */
function allDocRow(d, viewer) {
  var r = H({ name: d[0], gap: 16, pad: [12, 20, 12, 20], cross: 'CENTER' });
  borderSide(r, 'border/default', 'bottom');
  var st = H({ name: 'Status col', w: 182 });
  add(st, chip(d[2], d[3], { noDot: d[2] === 'Neutral' }));
  var info = VV({ name: 'Info', gap: 3 });
  addAll(info, [Tx(d[0], 'Label/M', 'text/primary', { fill: true }), Tx(d[1], 'Body/S', 'text/tertiary', { fill: true })]);
  if (d[8]) add(info, Tx(d[8], 'Body/S', d[2] === 'Bad' ? 'status/bad/fg' : d[2] === 'Warn' ? 'status/warn/fg' : 'text/secondary', { fill: true }));
  var who = VV({ name: 'Holder', gap: 2, w: 190 });
  var mine = d[4] === 'You' && viewer !== 'staff';
  addAll(who, [Tx(d[4] === 'You' ? (viewer === 'staff' ? 'With the customer' : 'With you') : d[4].indexOf('Cleared') === 0 ? d[4] : 'With ' + d[4], 'Label/S', mine ? 'text/primary' : 'text/secondary')]);
  var due = VV({ name: 'Due', gap: 2, w: 150, cross: 'MAX' });
  addAll(due, [Tx(d[5], 'Label/S', d[7] || (d[5] === 'Done' ? 'status/ok/fg' : 'text/primary'), { align: 'RIGHT' }), Tx(d[6], 'Mono/Caption', 'text/tertiary', { align: 'RIGHT' })]);
  var open = H({ name: 'Open', w: 24, main: 'MAX', cross: 'CENTER' });
  add(open, Ic('arrow-right', 16, 'text/tertiary'));
  addAll(r, [st, fillW(info), who, due, open]);
  return r;
}
function docTableSummary(viewer) {
  var sum = panel('Summary', { gap: 12 });
  var sh = H({ name: 'Head', gap: 24, main: 'SPACE_BETWEEN', cross: 'MAX' });
  var st = VV({ name: 'Text', gap: 4 });
  addAll(st, [Tx('All 23 documents', 'Heading/H3'), Tx(viewer === 'staff' ? 'One row per horse and document, plus the shipment’s own papers, in the words the customer sees. Only cleared documents open the departure gate.' : 'One row per horse and document, plus the shipment’s own papers. Each is checked against your travel dates, and only cleared documents open the departure gate.', 'Body/S', 'text/secondary', { fill: true })]);
  addAll(sh, [fillW(st), Tx('14 cleared · 4 with ' + (viewer === 'staff' ? 'the customer' : 'you') + ' · 5 with the authorities', 'Label/S', 'text/secondary', { align: 'RIGHT' })]);
  addAll(sum, [fillW(sh), progress('Ok', 60)]);
  return sum;
}
function docTableTabs(viewer) {
  var tabs = H({ name: 'Tabs', gap: 28 });
  borderSide(tabs, 'border/default', 'bottom');
  [['All · 23', 'Active'], [(viewer === 'staff' ? 'With the customer' : 'With you') + ' · 4', 'Default'], ['With the authorities · 5', 'Default'], ['Cleared · 14', 'Default']].forEach(function (t) { var i = inst(C.tab, { State: t[1] }); setP(i, { Label: t[0] }); i.name = 'Tab · ' + t[0]; add(tabs, i); });
  return tabs;
}
function docTable(viewer) {
  var list = panel('Documents', { gap: 0, pad: 0, clip: true });
  ALL_DOCS.forEach(function (g) {
    var cleared = g[2].filter(function (d) { return d[2] === 'Ok'; }).length;
    var gh = H({ name: g[0], gap: 12, pad: [14, 20, 14, 20], cross: 'CENTER', fill: 'bg/sunken' });
    borderSide(gh, 'border/default', 'bottom');
    addAll(gh, [Tx(g[0], 'Heading/H4'), Tx(g[1], 'Body/S', 'text/tertiary', { fill: true }), Tx(cleared + ' of ' + g[2].length + ' cleared', 'Mono/Caption', 'text/secondary')]);
    add(list, fillW(gh));
    g[2].forEach(function (d) { add(list, fillW(allDocRow(d, viewer))); });
  });
  return list;
}
function scrAllDocs() {
  var sum = docTableSummary('owner'), tabs = docTableTabs('owner'), list = docTable('owner');
  var note = Tx('Export health certificates are issued by the Dept. of Animal Health (VN) 8–14 Oct, inside the 10 days before departure; Lan requests them for you. Open any row to see its versions.', 'Body/S', 'text/tertiary', { w: 760 });
  return trackScreen('Tracking · All documents', trackHead('Ho Chi Minh City → Phnom Penh', ['REQ-2026-0162', 'job CBRT-2026-041 · 4 horses · departs 18 Oct 2026, 06:00'], [stageMark('Documents'), chip('Bad', 'Departure locked')], 'Back to the request'), [sum, tabs, list, note], '26 Sep 2026, 11:20');
}

/* ---------- MCP entry ---------- */
/* the three frames follow "Documents needed" in date order; a rebuilt frame keeps its slot */
async function insertChainCall(builders, afterName) {
  var page = await rehydrate(PAGE_NAMES[3]);
  var made = [];
  for (var i = 0; i < builders.length; i++) {
    var s = builders[i]();
    await flush();
    var old = page.children.filter(function (n) { return n.name === s.name && n !== s; });
    if (old.length) { s.x = old[0].x; s.y = old[0].y; old.forEach(function (n) { n.remove(); }); }
    else {
      var after = page.children.filter(function (n) { return n.name === afterName; })[0];
      var x = after.x + after.width + 120, shift = s.width + 120;
      page.children.forEach(function (n) { if (n !== s && n.type === 'FRAME' && Math.abs(n.y - after.y) < 1 && n.x >= x - 1) n.x += shift; });
      s.x = x; s.y = after.y;
    }
    afterName = s.name;
    made.push(s.name + ' ' + s.id + ' ' + Math.round(s.width) + '×' + Math.round(s.height));
  }
  return report({ screens: made });
}
async function eDocScreens() { return insertChainCall([scrAllDocs, scrDocRefused, scrDocUpload], 'Tracking · Documents needed'); }

/* =====================================================================
   Document review (Flow 2, staff). Lan reads the paper beside what the
   customer typed and ticks what only a person can confirm. Approve needs
   every check ticked; Reject needs a reason the customer sees verbatim.
   The file preview is a picture of paper, so it always renders light.
   ===================================================================== */
/* fields: [label, value]; o: { head, sub, ref, title, result, signs: [[who, name, signed]] } */
function paperDoc(o) {
  var p = VV({ name: 'Paper', gap: 18, pad: [36, 40, 36, 40], radius: 4, fill: 'surface/card', stroke: 'border/strong' });
  if (COLL.light) p.setExplicitVariableModeForCollection(COLL.color, COLL.light);
  var top = H({ name: 'Letterhead', gap: 16, main: 'SPACE_BETWEEN', cross: 'MIN' });
  var lh = VV({ name: 'Issuer', gap: 2 });
  addAll(lh, [Tx(o.head, 'Heading/H3', 'text/primary'), Tx(o.sub, 'Body/S', 'text/secondary', { fill: true })]);
  addAll(top, [fillW(lh), Tx(o.ref, 'Mono/Caption', 'text/secondary', { align: 'RIGHT' })]);
  addAll(p, [fillW(top), divider(), Tx(o.title, 'Label/M', 'text/primary')]);
  var grid = VV({ name: 'Fields', gap: 0 });
  o.fields.forEach(function (f) {
    var r = H({ name: f[0], gap: 16, pad: [7, 0, 7, 0], cross: 'CENTER' });
    borderSide(r, 'border/default', 'bottom');
    addAll(r, [Tx(f[0], 'Body/S', 'text/secondary', { w: 170 }), Tx(f[1], 'Mono/Data', 'text/primary', { fill: true })]);
    add(grid, fillW(r));
  });
  add(p, fillW(grid));
  if (o.result) {
    var res = H({ name: 'Result', gap: 16, pad: [12, 16, 12, 16], radius: 4, stroke: 'text/primary', sw: 1.5, cross: 'CENTER' });
    addAll(res, [Tx('Result', 'Body/S', 'text/secondary'), Tx(o.result, 'Heading/H4', 'text/primary')]);
    add(p, res);
  }
  var signs = H({ name: 'Signatures', gap: 24, pad: [8, 0, 0, 0] });
  o.signs.forEach(function (sg) {
    var box = VV({ name: 'Sign · ' + sg[0], gap: 6, pad: [10, 12, 10, 12], radius: 4, stroke: sg[2] ? 'border/default' : 'status/bad/fg', sw: sg[2] ? 1 : 1.5, dash: sg[2] ? null : [4, 3] });
    var line = H({ name: 'Line', h: 40, cross: 'MAX' });
    if (sg[2]) {
      var sig = Tx(sg[2], 'Heading/H3', 'text/primary', { noStyle: true });
      if (FONT['display/Italic']) sig.fontName = FONT['display/Italic'];
      add(line, sig);
    } else add(line, chip('Bad', 'Not signed'));
    addAll(box, [fillW(line), divider(), Tx(sg[0], 'Body/S', 'text/secondary'), Tx(sg[1], 'Label/S', 'text/primary')]);
    add(signs, fillW(box));
  });
  add(p, fillW(signs));
  return p;
}
function fileViewer(name, paper) {
  var v = panel('File', { gap: 0, pad: 0, clip: true });
  var bar = H({ name: 'Toolbar', gap: 12, pad: [12, 16, 12, 20], cross: 'CENTER' });
  borderSide(bar, 'border/default', 'bottom');
  addAll(bar, [Ic('file', 16, 'text/secondary'), Tx(name, 'Mono/Data', 'text/primary', { fill: true }), Tx('Page 1 of 1', 'Mono/Caption', 'text/tertiary'), btn('Ghost', 'SM', 'Open original')]);
  var well = VV({ name: 'Well', pad: [32, 40, 40, 40], fill: 'bg/sunken' });
  add(well, fillW(paper));
  addAll(v, [fillW(bar), fillW(well)]);
  return v;
}
/* checks: [state 'on' | 'off' | 'bad', text, sub] */
function checksList(rows, done) {
  var p = panel('Your checks', { gap: 0, pad: [20, 24, 12, 24] });
  var h = H({ name: 'Head', main: 'SPACE_BETWEEN', cross: 'CENTER', pad: [0, 0, 12, 0] });
  addAll(h, [Tx('Your checks', 'Heading/H4'), Tx(done, 'Label/S', rows.some(function (r) { return r[0] !== 'on'; }) ? 'status/bad/fg' : 'status/ok/fg')]);
  add(p, fillW(h));
  rows.forEach(function (r) {
    var row = H({ name: r[1], gap: 12, pad: [10, 0, 10, 0], cross: 'MIN' });
    borderSide(row, 'border/default', 'top');
    var cb = inst(C.checkbox, { Checked: r[0] === 'on' ? 'True' : 'False' });
    setP(cb, { 'Show label': false });
    if (r[0] === 'bad') cb.findOne(function (n) { return n.name === 'Box'; }).strokes = [P('status/bad/fg')];
    var t = VV({ name: 'Text', gap: 2 });
    add(t, Tx(r[1], 'Body/S', 'text/primary', { fill: true }));
    if (r[2]) add(t, Tx(r[2], 'Body/S', r[0] === 'bad' ? 'status/bad/fg' : 'text/tertiary', { fill: true }));
    addAll(row, [VV({ name: 'Box col', pad: [1, 0, 0, 0] }, [cb]), fillW(t)]);
    add(p, fillW(row));
  });
  return p;
}
function autoCheck(tone, word, text) {
  var p = panel('Automatic check', { gap: 10 });
  var h = H({ name: 'Head', gap: 12, main: 'SPACE_BETWEEN', cross: 'CENTER' });
  addAll(h, [Tx('Automatic check', 'Heading/H4'), chip(tone, word)]);
  addAll(p, [fillW(h), Tx(text, 'Body/S', 'text/secondary', { fill: true })]);
  return p;
}
function docReviewScreen(name, crumb, title, meta, due, dueDate, dueTone, left, right, hist, today, queued) {
  var d = VV({ name: 'Review due', gap: 2, cross: 'MAX' });
  addAll(d, [Tx(due, 'Label/S', dueTone, { align: 'RIGHT' }), Tx(dueDate, 'Mono/Caption', 'text/tertiary', { align: 'RIGHT' })]);
  var head = builderHead(title, 'CBRT-2026-041', meta, 'Documents', [stageMark('Documents'), chip('Info', 'In review'), d]);
  head.findOne(function (n) { return n.name === 'Status'; }).itemSpacing = 12;
  var body = H({ name: 'Body', gap: 24 });
  right.resize(SIDE.narrow, right.height); right.layoutSizingHorizontal = 'FIXED';
  addAll(body, [fillW(left), right]);
  /* the Documents badge counts what waits for Lan's review that day, this one included */
  return adminScreen(name, 'Documents', ['Documents', crumb], STAFF.lan, [head, body].concat(hist ? [hist] : []), today, { badges: { Documents: String(queued) } });
}

/* ---------- approve: Nightfall's EIA test v2 (Fri 2 Oct) ---------- */
function scrDocReviewNotSent() { return scrDocReview('notsent'); }
function scrDocReview(state) {
  var paper = paperDoc({ head: 'NAVETCO Laboratory', sub: 'National Centre for Veterinary Diagnostics · Ho Chi Minh City branch', ref: 'Accreditation VILAS 214\nCertificate EIA-2610-0873',
    title: 'Equine Infectious Anaemia · AGID (Coggins) test',
    fields: [['Horse', 'Nightfall'], ['Sex · breed', 'Mare · Thoroughbred'], ['Microchip', '250 259 600 223 311'], ['Owner', 'Saigon Turf Club'], ['Date sampled', '01/10/2026'], ['Date tested', '02/10/2026'], ['Method', 'Agar gel immunodiffusion']],
    result: 'NEGATIVE', signs: [['Sampling veterinarian', 'Dr Trần Văn Phúc', 'T. V. Phúc'], ['Laboratory head · stamp', 'Dr Lê Thị Mai', 'L. T. Mai']] });
  var left = fileViewer('EIA_Nightfall_2026-10-01.pdf', paper);
  var checks = checksList([
    ['on', 'The sample date on the paper matches the entered date', '01/10/2026 on the certificate; 1 Oct 2026 entered.'],
    ['on', 'The laboratory is on Cambodia’s approved list', 'NAVETCO, accreditation VILAS 214.'],
    ['on', 'The result is negative'],
    ['on', 'The microchip matches Nightfall’s passport', '…223 311 on both; passport v1, cleared 2 Sep.'],
    ['on', 'Signed and stamped by the veterinarian']
  ], 'All 5 ticked');
  var dec = panel('Decision', { gap: 12 });
  if (state === 'notsent')
    /* a decision that didn't reach the server: say what did not happen, keep the work, and hold the queue */
    addAll(dec, [Tx('Your decision', 'Heading/H4'), fillW(callout('Bad', 'Not sent', 'Nothing was recorded and Saigon Turf Club wasn’t told. Your 5 ticks are kept.')),
      btn('Primary', 'MD', 'Try again', { fill: true, lead: 'check' }), Tx('Your queue waits here until this is sent: 2 more after it.', 'Body/S', 'text/tertiary', { fill: true }),
      btn('Ghost', 'MD', 'Keep for later', { fill: true })]);
  else
    addAll(dec, [Tx('Your decision', 'Heading/H4'), Tx('Approving clears Nightfall’s EIA test: 15 of 23 documents cleared. The departure gate still waits for 8.', 'Body/S', 'text/secondary', { fill: true }),
      btn('Primary', 'MD', 'Approve and open next', { fill: true, lead: 'check' }), Tx('Then 2 more in your queue: Silver Bell’s bill of sale and the transit insurance.', 'Body/S', 'text/tertiary', { fill: true }),
      btn('Ghost', 'MD', 'Reject with a reason', { fill: true })]);
  var ver = versionsPanel([
    ['v2', '2 Oct 2026', 'Sampled 1 Oct · NAVETCO · 17 days old at departure. This version.', 'Info', 'In review'],
    ['Attempt', '27 Sep 2026', 'Sampled 20 Jul · 90 days old at departure. Refused at upload; not saved.', 'Bad', 'Refused', true],
    ['v1', '4 Aug 2026', 'Sampled 2 Aug · 77 days old at departure. Replaced by v2.', 'Neutral', 'Replaced', true]
  ], 'The customer sees the same list. Approving or rejecting is added to both histories.');
  var right = column([autoCheck('Ok', 'Passes', 'Sampled 1 Oct, 17 days before the 18 Oct departure; the limit is 60 (Cambodia regulation catalog v7, pinned to this job).'), checks, dec, ver]);
  var hist = historyPanel([['2 Oct · 10:12', 'v2 uploaded by Saigon Turf Club. Automatic check: passes, 17 of 60 days.', 'System'], ['2 Oct · 10:12', 'Assigned to Lan for review; due by end of Mon 5 Oct.', 'System'], ['27 Sep · 16:40', 'Upload refused at the automatic check: sampled 20 Jul.', 'System']], null);
  return docReviewScreen('Transport specialist · Document review' + (state === 'notsent' ? ' · Not sent' : ''), 'Nightfall · EIA test', 'Nightfall · EIA (Coggins) test', 'REQ-2026-0162 · Saigon Turf Club · departs 18 Oct 2026', 'Due in 1 business day', '5 Oct', 'text/primary', left, right, hist, 'Fri 2 Oct 2026', 3);
}

/* ---------- reject: Silver Bell's unsigned bill of sale (Thu 24 Sep) ---------- */
function scrDocReject() {
  var paper = paperDoc({ head: 'Bill of sale', sub: 'Sale of a registered horse · Đà Lạt, 20 Aug 2026', ref: 'Ref HGS-2026-017',
    title: 'The seller transfers full ownership of the horse below to the buyer.',
    fields: [['Seller', 'Hoàng Gia Stud, Đà Lạt'], ['Buyer', 'Saigon Turf Club, Ho Chi Minh City'], ['Horse', 'Silver Bell'], ['Sex · breed', 'Mare · Lipizzan'], ['Microchip', '203 098 100 554 120'], ['Price', '₫ 1,850,000,000'], ['Handover', '22 Aug 2026']],
    signs: [['Seller', 'Hoàng Gia Stud', null], ['Buyer', 'Saigon Turf Club', 'N. Q. Huy']] });
  var left = fileViewer('Silver-Bell_bill-of-sale.pdf', paper);
  var checks = checksList([
    ['on', 'The horse and microchip match Silver Bell’s passport', '…554 120 on both.'],
    ['on', 'The buyer is Saigon Turf Club'],
    ['bad', 'Signed by both parties', 'The seller’s signature is missing (bottom left).']
  ], '1 of 3 not ticked');
  var comp = VV({ name: 'Reject with a reason', gap: 12, pad: 16, radius: 8, fill: 'surface/raised', stroke: 'border/strong' });
  var due = H({ name: 'New version due', gap: 16, main: 'SPACE_BETWEEN', cross: 'CENTER' });
  var dd = VV({ name: 'Date', gap: 2, cross: 'MAX' });
  addAll(dd, [Tx('Due tomorrow', 'Label/S', 'status/warn/fg', { align: 'RIGHT' }), Tx('25 Sep 2026', 'Mono/Caption', 'text/tertiary', { align: 'RIGHT' })]);
  addAll(due, [Tx('New version due', 'Body/S', 'text/secondary'), dd]);
  addAll(comp, [Tx('Reject with a reason', 'Label/M'),
    fillW(noteField('Reason, shown to Saigon Turf Club', 'The bill of sale is not signed by the seller (bottom left). Upload a copy signed by both Hoàng Gia Stud and Saigon Turf Club.', 'Required. The customer sees it exactly as written; the item returns to Required and this version is kept.')),
    fillW(due), btn('Primary', 'MD', 'Reject and open next', { fill: true, trail: 'arrow-right' }), Tx('Saigon Turf Club is told at once, with your reason. Then 1 more in your queue, from CBRT-2026-038.', 'Body/S', 'text/tertiary', { fill: true })]);
  var dec = panel('Decision', { gap: 12 });
  addAll(dec, [Tx('Your decision', 'Heading/H4'), fillW(comp), divider(), btn('Secondary', 'MD', 'Approve', { fill: true, state: 'Disabled' }), Tx('Approve needs every check ticked. 1 isn’t: signed by both parties.', 'Body/S', 'text/tertiary', { fill: true })]);
  var ver = versionsPanel([['v1', '24 Sep 2026', 'Bill of sale dated 20 Aug 2026. This version; kept after a rejection.', 'Info', 'In review']], 'The customer sees the same list. A rejected version stays in the history.');
  var right = column([autoCheck('Ok', 'Present', 'Proof of ownership has a presence-only rule, so the system checks that a file is there. It can’t check a signature.'), checks, dec, ver]);
  return docReviewScreen('Transport specialist · Document review · Reject', 'Silver Bell · Proof of ownership', 'Silver Bell · Proof of ownership', 'REQ-2026-0162 · Saigon Turf Club · departs 18 Oct 2026', 'Due today', '24 Sep', 'status/warn/fg', left, right, null, 'Thu 24 Sep 2026', 2);
}
async function eDocReview() { return staffScreensCall([scrDocReview, scrDocReviewNotSent, scrDocReject]); }
