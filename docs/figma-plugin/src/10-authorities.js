/* =====================================================================
   Authorities tab (Flow 2, staff). One dossier card per authority on the
   route: state in words, what it holds, its reference and the expected
   response stated twice. A card can be filed only once its own documents
   are cleared; a late response is highlighted and says what it puts at
   risk. Quarantine is recorded against the destination's minimum.
   ===================================================================== */
/* CBRT-2026-041: customs was filed on 26 Sep; clearance completes on 14 Oct, when the certificates are back */
var CLEARANCE_041 = '14 Oct';
/* the Dept. of Animal Health dossier holds each horse's customer documents; the count derives from the checklist */
function dahDocs() {
  var n = 0;
  ALL_DOCS.forEach(function (g) { if (g[0] !== 'Shipment') g[2].forEach(function (d) { if (d[0] !== 'Export health certificate') n++; }); });
  return n + ' customer documents: passports, vaccinations, EIA tests and ownership';
}
/* d: { name, what, tone, word, due, date, dueTone, facts: [[label, value, mono]], body: [nodes], bad } */
function dossierCard(d) {
  var c = panel('Dossier · ' + d.name, { gap: 0, pad: 0, clip: true, stroke: d.bad ? 'status/bad/border' : null });
  if (d.bad) c.strokeWeight = 1.5;
  var head = H({ name: 'Head', gap: 16, pad: [18, 24, 18, 24], cross: 'CENTER' });
  var t = VV({ name: 'Authority', gap: 2 });
  addAll(t, [Tx(d.name, 'Heading/H4'), Tx(d.what, 'Body/S', 'text/tertiary', { fill: true })]);
  var st = H({ name: 'Status col', w: 190, main: 'MAX' });
  add(st, chip(d.tone, d.word, { noDot: d.tone === 'Neutral' }));
  var due = VV({ name: 'Due', gap: 2, w: 150, cross: 'MAX' });
  addAll(due, [Tx(d.due, 'Label/S', d.dueTone || 'text/primary', { align: 'RIGHT' }), Tx(d.date, 'Mono/Caption', 'text/tertiary', { align: 'RIGHT' })]);
  addAll(head, [fillW(t), st, due]);
  add(c, fillW(head));
  if (d.facts) {
    var f = H({ name: 'Facts', gap: 40, pad: [14, 24, 14, 24], fill: 'bg/sunken' });
    borderSide(f, 'border/default', 'top');
    d.facts.forEach(function (x) {
      var cell = VV({ name: x[0], gap: 3 });
      addAll(cell, [Tx(x[0], 'Body/S', 'text/tertiary'), Tx(x[1], x[2] ? 'Mono/Data' : 'Label/S', 'text/primary')]);
      add(f, x[3] ? fillW(cell) : cell);
    });
    add(c, fillW(f));
  }
  if (d.body && d.body.length) {
    var b = VV({ name: 'Body', gap: 16, pad: [18, 24, 20, 24] });
    borderSide(b, 'border/default', 'top');
    d.body.forEach(function (n) { add(b, fillW(n)); });
    add(c, fillW(b));
  }
  return c;
}
/* rows: [when, text, who] */
function logList(title, rows) {
  var v = VV({ name: title, gap: 0 });
  add(v, VV({ name: 'Title', pad: [0, 0, 8, 0] }, [Tx(title, 'Label/S', 'text/secondary')]));
  rows.forEach(function (r) {
    var row = H({ name: r[1], gap: 16, pad: [8, 0, 8, 0], cross: 'MIN' });
    borderSide(row, 'border/default', 'top');
    addAll(row, [Tx(r[0], 'Mono/Caption', 'text/tertiary', { w: 150 }), Tx(r[1], 'Body/S', r[3] || 'text/primary', { fill: true }), Tx(r[2], 'Body/S', 'text/tertiary', { w: 200, align: 'RIGHT' })]);
    add(v, fillW(row));
  });
  return v;
}
function checkRow(text, sub, prose) {
  var r = H({ name: text, gap: 12, cross: 'MIN' });
  var cb = inst(C.checkbox, { Checked: 'True' });
  setP(cb, { 'Show label': false });
  var t = VV({ name: 'Text', gap: 2 });
  addAll(t, [Tx(text, 'Body/S', 'text/primary', { fill: true }), Tx(sub, prose ? 'Body/S' : 'Mono/Caption', prose ? 'text/secondary' : 'text/tertiary', { fill: true })]);
  addAll(r, [VV({ name: 'Box col', pad: [1, 0, 0, 0] }, [cb]), fillW(t)]);
  return r;
}
function submissionForm() {
  var e = VV({ name: 'Record submission', gap: 16, pad: [18, 20, 18, 20], radius: 8, fill: 'surface/raised', stroke: 'border/strong' });
  add(e, Tx('Record the submission', 'Label/M'));
  [[['Select', 'Default', 'Authority', 'Mộc Bài border customs (VN)', 'From the regulation catalog for this crossing.'], ['Date', 'Default', 'Submitted on', '26 Sep 2026', null]],
   [['Text', 'Focus', 'Reference', 'HQ-MB-2026-18842', 'As issued by the authority’s portal or receipt.'], ['Date', 'Default', 'Expected response', '30 Sep 2026', '3 business days, from the catalog. Change it if the office quoted another date.']]].forEach(function (pair, i) {
    var row = H({ name: 'Fields ' + (i + 1), gap: 16, cross: 'MIN' });
    pair.forEach(function (f) { add(row, fillW(input(f[0], f[1], f[2], f[3], f[4]))); });
    add(e, fillW(row));
  });
  var docs = VV({ name: 'Documents included', gap: 10 });
  addAll(docs, [Tx('Documents included', 'Label/S', 'text/secondary'),
    fillW(checkRow('Customs value declaration · Mộc Bài – Bavet', 'v1 · cleared 20 Sep 2026')),
    fillW(checkRow('Equine passports · Shadowfax, Nightfall, Copper King, Silver Bell', '4 × v1 · cleared 2–4 Sep 2026'))]);
  add(e, fillW(docs));
  var acts = H({ name: 'Actions', gap: 12, cross: 'CENTER' });
  addAll(acts, [btn('Primary', 'MD', 'Record submission'), btn('Ghost', 'MD', 'Cancel'), Tx('The card then reads “With the authority” and the expected date is tracked.', 'Body/S', 'text/tertiary', { fill: true })]);
  add(e, fillW(acts));
  return e;
}
/* rows: [label, value, mono] */
function quarantinePanel(tone, word, rows, extra) {
  var p = panel('Pre-export quarantine', { gap: 14 });
  var h = H({ name: 'Head', gap: 16, main: 'SPACE_BETWEEN', cross: 'CENTER' });
  var t = VV({ name: 'Text', gap: 2 });
  addAll(t, [Tx('Pre-export quarantine', 'Heading/H4'), Tx('Củ Chi pre-export quarantine station · inspected by the station veterinarian', 'Body/S', 'text/tertiary')]);
  addAll(h, [t, chip(tone, word)]);
  add(p, fillW(h));
  var grid = H({ name: 'Facts', gap: 40 });
  rows.forEach(function (x) {
    var cell = VV({ name: x[0], gap: 3 });
    addAll(cell, [Tx(x[0], 'Body/S', 'text/tertiary'), Tx(x[1], x[2] ? 'Mono/Data' : 'Label/S', 'text/primary')]);
    add(grid, cell);
  });
  add(p, fillW(grid));
  (extra || []).forEach(function (n) { add(p, fillW(n)); });
  add(p, Tx('Cambodia requires at least 7 days. A shorter period can’t be saved.', 'Body/S', 'text/tertiary', { fill: true }));
  return p;
}

/* ---------- Sat 26 Sep: one filed, one ready to file, one waiting ---------- */
function scrAuthorities() {
  var customs = dossierCard({ name: 'Mộc Bài border customs (VN)', what: 'Export declaration and Cambodia entry at Mộc Bài – Bavet', tone: 'Ok', word: 'Ready to file', due: 'File by', date: '14 Oct',
    body: [submissionForm()] });
  var gdahp = dossierCard({ name: 'Cambodia GDAHP', what: 'General Directorate of Animal Health and Production · import permit', tone: 'Info', word: 'With the authority', due: 'In 15 days', date: '11 Oct',
    facts: [['Reference', 'KH-IP-2026-3381', true], ['Filed', '15 Sep 2026', true], ['Expected response', '11 Oct, as quoted at filing'], ['Contains', 'Import application · 4 equine passports', false, true]] });
  var waiting = logList('Waiting on', [
    ['Customer · overdue', 'Silver Bell · proof of ownership: a signed bill of sale, was due 25 Sep.', 'Saigon Turf Club', 'status/bad/fg'],
    ['Customer · 30 Sep', 'Transit insurance extended to 20 Oct.', 'Saigon Turf Club'],
    ['Customer · 4 Oct', 'Nightfall · EIA (Coggins) test sampled 19 Aug or later.', 'Saigon Turf Club'],
    ['Customer · 11 Oct', 'Silver Bell · influenza booster record.', 'Saigon Turf Club'],
    ['10 Oct', 'Pre-export quarantine starts; the certificates are issued inside it.', 'Củ Chi station']]);
  var dah = dossierCard({ name: 'Vietnam Dept. of Animal Health', what: 'Export health certificates · 4 horses', tone: 'Neutral', word: 'Not ready', due: 'Planned filing', date: '8 Oct',
    facts: [['Certificates expected', '8–14 Oct 2026'], ['Rule', 'Issued within 10 days of departure'], ['Contains', dahDocs(), false, true]], body: [waiting] });
  var q = quarantinePanel('Ok', 'Meets the minimum', [['Booked', '10–17 Oct 2026', true], ['Length', '7 days', true], ['Cambodia’s minimum', '7 days', true], ['Inspection', 'Recorded 17 Oct by the station vet']]);
  var hist = historyPanel([
    ['26 Sep · 09:02', 'Customs dossier ready: the customs value declaration and 4 passports are cleared.', 'System'],
    ['18 Sep · 14:30', 'Quarantine booked at Củ Chi, 10–17 Oct (7 days; Cambodia requires 7).', 'Lan, transport specialist'],
    ['15 Sep · 10:40', 'Import permit application filed with GDAHP, ref KH-IP-2026-3381.', 'Lan, transport specialist']], 'Show all 9 events');
  var hint = Tx('Cards that need you come first: overdue, ready to file, with an authority, not ready, approved.', 'Body/S', 'text/tertiary', { w: 760 });
  return jobScreen('Transport specialist · Authorities', 'Authorities', STAFF.lan, [customs, gdahp, dah, q, hist, hint]);
}

/* ---------- Mon 12 Oct: the import permit is a day late ---------- */
function scrAuthoritiesOverdue() {
  var acts = H({ name: 'Actions', gap: 12, cross: 'CENTER' });
  addAll(acts, [btn('Primary', 'MD', 'Log a follow-up', { lead: 'pencil' }), btn('Secondary', 'MD', 'Record the decision')]);
  var gdahp = dossierCard({ bad: true, name: 'Cambodia GDAHP', what: 'General Directorate of Animal Health and Production · import permit', tone: 'Bad', word: 'Overdue', due: 'Overdue by 1 day', date: 'was due 11 Oct', dueTone: 'status/bad/fg',
    facts: [['Reference', 'KH-IP-2026-3381', true], ['Filed', '15 Sep 2026', true], ['Expected response', '11 Oct, as quoted at filing'], ['Contains', 'Import application · 4 equine passports', false, true]],
    body: [callout('Bad', 'The 18 Oct departure holds only if the permit is back by 16 Oct', 'Clearance is planned for ' + CLEARANCE_041 + ' and quarantine ends 17 Oct. After 16 Oct there isn’t time to add the permit to the entry dossier before the 06:00 pickup.'),
      logList('Follow-ups', [['12 Oct · 09:10', 'Phoned GDAHP Phnom Penh: the permit is in final signature, promised for 13 Oct.', 'Lan, transport specialist'], ['12 Oct · 00:05', 'Response overdue; Yến alerted.', 'System']]), acts] });
  var dah = dossierCard({ name: 'Vietnam Dept. of Animal Health', what: 'Export health certificates · 4 horses', tone: 'Info', word: 'With the authority', due: 'In 2 days', date: '14 Oct',
    facts: [['Reference', 'DAH-XK-2026-0917', true], ['Filed', '9 Oct 2026', true], ['Expected response', '14 Oct'], ['Contains', dahDocs(), false, true]] });
  var customs = dossierCard({ name: 'Mộc Bài border customs (VN)', what: 'Export declaration and Cambodia entry at Mộc Bài – Bavet', tone: 'Ok', word: 'Approved', due: 'Done', date: '30 Sep', dueTone: 'status/ok/fg',
    facts: [['Reference', 'HQ-MB-2026-18842', true], ['Filed', '26 Sep 2026', true], ['Clearance number', 'TK-2026-300915', true], ['Contains', 'Customs value declaration · 4 passports', false, true]] });
  var q = quarantinePanel('Info', 'In progress · day 3 of 7', [['Booked', '10–17 Oct 2026', true], ['Length', '7 days', true], ['Cambodia’s minimum', '7 days', true], ['Inspection', 'Due 17 Oct from the station vet']],
    [progress('Neutral', 40)]);
  var hist = historyPanel([
    ['12 Oct · 09:10', 'Follow-up with GDAHP logged: promised for 13 Oct.', 'Lan, transport specialist'],
    ['12 Oct · 00:05', 'GDAHP response overdue; Yến, logistics manager, alerted.', 'System'],
    ['10 Oct · 07:30', 'Quarantine started at Củ Chi with 4 horses.', 'Lan, transport specialist'],
    ['9 Oct · 15:20', 'Export health certificate dossier filed with the Dept. of Animal Health, ref DAH-XK-2026-0917.', 'Lan, transport specialist']], 'Show all 17 events');
  return jobScreen('Transport specialist · Authorities · Overdue', 'Authorities', STAFF.lan, [gdahp, dah, customs, q, hist],
    { today: 'Mon 12 Oct 2026', stage: 'Clearance', gate: '3 things must clear first: the Cambodia import permit (overdue), 4 export health certificates (with the Dept. of Animal Health, expected ' + CLEARANCE_041 + ') and quarantine (ends 17 Oct).' });
}
async function eAuthorities() { return insertChainCall([scrAuthorities, scrAuthoritiesOverdue], 'Transport specialist · Clearance checklist'); }
