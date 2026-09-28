/* =====================================================================
   Incidents (Flow 5). Every incident has one owner, Yến. The page puts
   the facts, the options with their cost (time, documents, the horse)
   and a recorded decision in one place, and tells the people affected.
   Nothing on these pages judges fault.
   ===================================================================== */
function incidentScreen(name, head, left, right, today, crumbs) {
  var body = H({ name: 'Body', gap: 24 });
  right.resize(SIDE.narrow, right.height); right.layoutSizingHorizontal = 'FIXED';
  addAll(body, [fillW(left), right]);
  return adminScreen(name, 'Incidents', crumbs, STAFF.yen, [head, body], today);
}
function dueStack(a, b, tone) {
  var d = VV({ name: 'Due', gap: 2, cross: 'MAX' });
  addAll(d, [Tx(a, 'Label/S', tone || 'text/primary', { align: 'RIGHT' }), Tx(b, 'Mono/Caption', 'text/tertiary', { align: 'RIGHT' })]);
  return d;
}
/* when and who: the time is data (Mono), the person is a name (Outfit) */
function stamp(time, who) {
  var r = H({ name: 'Stamp', gap: 8, cross: 'CENTER' });
  addAll(r, [Tx(time, 'Mono/Caption', 'text/tertiary'), Tx(who, 'Body/S', 'text/tertiary')]);
  return r;
}
/* rows: [time, text, who] for the narrow right column */
function miniTimeline(rows) {
  var p = panel('Timeline', { gap: 0, pad: [20, 24, 12, 24] });
  add(p, VV({ name: 'Title', pad: [0, 0, 10, 0] }, [Tx('Timeline', 'Heading/H4')]));
  rows.forEach(function (r) {
    var row = VV({ name: r[1], gap: 2, pad: [9, 0, 9, 0] });
    borderSide(row, 'border/default', 'top');
    var top = H({ name: 'Head', gap: 8, cross: 'CENTER' });
    addAll(top, [Tx(r[0], 'Mono/Caption', 'text/tertiary'), Tx(r[2], 'Body/S', 'text/tertiary')]);
    addAll(row, [top, Tx(r[1], 'Body/S', 'text/primary', { fill: true })]);
    add(p, fillW(row));
  });
  return p;
}
/* a fact that is true (done) or that will happen (pending); never a control */
function factLine(text, sub, done) {
  var r = H({ name: text, gap: 12, cross: 'MIN' });
  var ic = H({ name: 'Mark', w: 24, h: 24, radius: 999, fill: done ? 'status/ok/bg' : 'surface/muted', main: 'CENTER', cross: 'CENTER' });
  add(ic, Ic(done ? 'check' : 'arrow-right', 14, done ? 'status/ok/fg' : 'text/secondary'));
  var t = VV({ name: 'Text', gap: 2 });
  add(t, Tx(text, 'Body/S', 'text/primary', { fill: true }));
  if (sub) add(t, Tx(sub, 'Body/S', 'text/secondary', { fill: true }));
  addAll(r, [ic, fillW(t)]);
  return r;
}
function radioMark(sel) {
  var r = H({ name: 'Radio', w: 20, h: 20, radius: 999, main: 'CENTER', cross: 'CENTER', fill: 'bg/input', stroke: sel ? 'text/primary' : 'border/strong', sw: sel ? 1.5 : 1 });
  if (sel) add(r, dot(10, 'text/primary', 'Dot'));
  return r;
}
/* the canonical times for the CBRT-2026-036 report: the reply is due 2 hours after it arrives */
var INC36 = { reported: '17:30', opened: '17:31', notified: '18:02', vet: '18:04', due: '19:30', now: '18:05', left: '1 h 25 min', draft: '17:26' };
/* an option with its consequences side by side: facts [label, value, tone] */
function optionRow(sel, title, desc, facts) {
  var r = VV({ name: 'Option · ' + title, gap: 12, pad: [16, 20, 16, 20], radius: 12, fill: sel ? 'surface/raised' : 'surface/card', stroke: sel ? 'text/secondary' : 'border/default', sw: sel ? 1.5 : 1 });
  var h = H({ name: 'Head', gap: 12, cross: 'MIN' });
  var t = VV({ name: 'Text', gap: 2 });
  addAll(t, [Tx(title, 'Heading/H4'), Tx(desc, 'Body/S', 'text/secondary', { fill: true })]);
  addAll(h, [VV({ name: 'Box col', pad: [3, 0, 0, 0] }, [radioMark(sel)]), fillW(t)]);
  var f = H({ name: 'Facts', gap: 24, pad: [0, 0, 0, 30] });
  facts.forEach(function (x) {
    var c = VV({ name: x[0], gap: 2 });
    addAll(c, [Tx(x[0], 'Body/S', 'text/tertiary'), Tx(x[1], 'Label/S', x[2] || 'text/primary', { fill: true })]);
    add(f, fillW(c));
  });
  addAll(r, [fillW(h), fillW(f)]);
  return r;
}

/* ---------- CBRT-2026-040, Tue 29 Sep 09:10: held at the border ---------- */
var NOW40 = '09:10';
function scrIncidentHeld() {
  var head = builderHead('Held at Bavet – Mộc Bài', 'CBRT-2026-040', 'Phnom Penh → Ho Chi Minh City · Mekong Star · shared load · departed 05:30', 'Incidents',
    [stageChip('Trip'), chip('Bad', 'Held'), dueStack('Held for ' + durText(toMin(NOW40) - toMin(INC40.held)), 'since ' + INC40.held, 'status/bad/fg')]);
  head.findOne(function (n) { return n.name === 'Status'; }).itemSpacing = 12;
  var rec = panel('What the escort recorded', { gap: 12 });
  var rh = H({ name: 'Head', gap: 12, main: 'SPACE_BETWEEN', cross: 'CENTER' });
  addAll(rh, [Tx('What the escort recorded', 'Heading/H4'), stamp(INC40.held, INC40.by)]);
  addAll(rec, [fillW(rh), Tx('“' + INC40.record + '”', 'Body/M', 'text/primary', { fill: true }),
    dlRow('Checkpoint', 'Bavet (Cambodia exit) → Mộc Bài (Vietnam entry)', { valueStyle: 'Label/S' }), dlRow('Horse', 'Mekong Star · Sound, on the trailer', { valueStyle: 'Label/S' })]);
  var opts = VV({ name: 'Options', gap: 12 });
  addAll(opts, [Tx('What happens now', 'Heading/H4'),
    fillW(optionRow(false, 'Wait for Mộc Bài to reopen', 'The inspection ends at 16:00; the trailer waits in the exit lane.', [['Arrives', arrivesLate('19:30')], ['Documents', 'Unchanged'], ['Horse', 'Unloaded at the Bavet holding yard by ' + unloadBy() + '; yard fee applies', 'status/warn/fg']])),
    fillW(optionRow(true, 'Re-route via Xa Mát – Trapeang Phlong', '+95 km through Kampong Cham to the Xa Mát crossing, then on to Ho Chi Minh City.', [['Arrives', arrivesLate('15:40')], ['Documents', '1 new: a customs value declaration for Xa Mát', 'status/warn/fg'], ['Horse', 'Rests unloaded at the Xa Mát yard at 11:10, inside 6 h']])),
    fillW(optionRow(false, 'Return to Phnom Penh', 'Back to the owner’s stable; the move needs a new date.', [['Arrives', 'Back by 11:00'], ['Documents', 'All re-checked against the new date', 'status/warn/fg'], ['Horse', 'Inside 6 h']]))]);
  var comp = VV({ name: 'Decision', gap: 14, pad: [18, 20, 18, 20], radius: 12, fill: 'surface/raised', stroke: 'border/strong' });
  addAll(comp, [Tx('Re-route via Xa Mát – Trapeang Phlong', 'Label/M'),
    Tx('When you decide', 'Label/S', 'text/secondary'),
    fillW(factLine('Lan files the customs value declaration for Xa Mát', 'Electronic filing takes about an hour; it’s needed by 10:50.', false)),
    fillW(factLine('Tùng gets the new route and the Xa Mát rest stop', 'On his cab tablet, as soon as you decide.', false)),
    fillW(factLine('Sokha Stables is told, with your message', 'It also appears on their request page.', false)),
    fillW(noteField('Message to Sokha Stables', 'Mộc Bài is closed until 16:00 for a bridge inspection. We are re-routing Mekong Star through Xa Mát, with a rest stop at 11:10. New arrival about 15:40 at your yard.', 'Required. Sent as written.')),
    btn('Primary', 'MD', 'Re-route via Xa Mát', { fill: true, trail: 'arrow-right' })]);
  var left = column([rec, opts, comp]);
  var clock = panel('Time on the trailer', { gap: 10 });
  addAll(clock, [Tx('Time on the trailer', 'Heading/H4'), Tx(onTrailer(NOW40), 'Mono/Data L', 'status/warn/fg'), dlRow('Loaded', INC40.loaded),
    (function () { var r = H({ name: 'Unload by', main: 'SPACE_BETWEEN', cross: 'CENTER' }); addAll(r, [Tx('Unload by', 'Body/S', 'text/secondary'), dueStack('In ' + durText(toMin(unloadBy()) - toMin(NOW40)), unloadBy(), 'status/warn/fg')]); return fillW(r); })(),
    Tx('A horse is unloaded to rest at least every ' + INC40.restEvery + ' hours.', 'Body/S', 'text/tertiary', { fill: true })]);
  var people = peoplePanel([['Tùng', 'driver', 'At the Bavet exit lane with Mekong Star.'], ['Lan', 'transport specialist', 'Files documents for any new crossing.'], ['Sokha', 'owner, Sokha Stables', 'Told of your decision with your message.']], 'Who is involved');
  var tl = miniTimeline([['08:40', 'Mekong Star watered; settled.', 'Tùng'], [INC40.held, 'Incident opened for you at once; Lan copied.', 'System'], [INC40.held, 'Held at Bavet: Mộc Bài closed until 16:00.', 'Tùng']]);
  return incidentScreen('Logistics manager · Incident · Held', head, left, column([clock, people, tl]), 'Tue 29 Sep 2026', ['Incidents', 'CBRT-2026-040']);
}

/* ---------- CBRT-2026-036: the customer reports a problem (Thu 24 Sep) ---------- */
var REPORT_TEXT = 'A cut about 6 cm on the left hind cannon, still bleeding a little when she came off the trailer. She is walking sound.';
function photoThumbs(names, addBox) {
  var r = H({ name: 'Photos', gap: 12 });
  names.forEach(function (n) {
    var v = VV({ name: n, gap: 6 });
    var box = H({ name: 'Thumb', w: 120, h: 90, radius: 8, fill: 'surface/muted', main: 'CENTER', cross: 'CENTER' });
    add(box, Ic('eye', 20, 'text/tertiary'));
    addAll(v, [box, Tx(n, 'Mono/Caption', 'text/tertiary')]);
    add(r, v);
  });
  if (addBox) {
    var a = VV({ name: 'Add', gap: 6, w: 120, h: 90, radius: 8, stroke: 'border/strong', dash: [4, 3], main: 'CENTER', cross: 'CENTER' });
    addAll(a, [Ic('plus', 18, 'text/secondary'), Tx('Add photo', 'Label/S', 'text/secondary')]);
    add(r, a);
  }
  return r;
}
function escortRecord(title) {
  var p = panel('Escort record', { gap: 10 });
  var h = VV({ name: 'Head', gap: 8 });
  addAll(h, [Tx(title, 'Heading/H4'), chip('Ok', 'Sound')]);
  addAll(p, [fillW(h), Tx('“Walked off well; drinking.”', 'Body/S', 'text/primary', { fill: true }), Tx('Logged at 16:10 by Hạnh, groom, on arrival.', 'Body/S', 'text/tertiary', { fill: true }), divider(),
    dlRow('Loaded, Bangkok', '05:10 · calm', { valueStyle: 'Label/S' }), dlRow('Siem Reap stop', '10:20 · sound', { valueStyle: 'Label/S' }), dlRow('Delivered', '16:05', { valueStyle: 'Mono/Data' })]);
  return p;
}
function scrTrackReport() {
  var form = panel('Report a problem', { gap: 18 });
  var fh = VV({ name: 'Head', gap: 4 });
  addAll(fh, [Tx('Report a problem', 'Heading/H3'), Tx('Tell Yến what you found. If another horse is affected, add it to the same case after sending.', 'Body/S', 'text/secondary', { fill: true })]);
  add(form, fillW(fh));
  var which = VV({ name: 'Which horse', gap: 10 });
  addAll(which, [Tx('Which horse', 'Label/S', 'text/secondary'), fillW(svcOptions([
    ['Selected', 'Golden Lotus', 'Mare · Thoroughbred', 'Stall 3', null],
    ['Default', 'Rising Tide', 'Gelding · Thoroughbred', 'Stall 1', null],
    ['Default', 'Siam Arrow', 'Stallion · Arabian', 'Stall 2', null]], true))]);
  add(form, fillW(which));
  var kind = VV({ name: 'Kind', gap: 10 });
  addAll(kind, [Tx('What kind of problem', 'Label/S', 'text/secondary'), fillW(svcOptions([
    ['Selected', 'Injury', 'A cut, swelling or lameness.', 'A vet within 4 hours', null],
    ['Default', 'Illness', 'Off feed, colic signs, fever.', 'A vet within 4 hours', null],
    ['Default', 'Something else', 'Missing kit, papers, anything else.', 'A reply within 2 hours', null]], true))]);
  add(form, fillW(kind));
  add(form, fillW(noteField('What you found', REPORT_TEXT, 'Where on the horse, how it looks, and how the horse is now.')));
  var ph = VV({ name: 'Photos block', gap: 10 });
  addAll(ph, [Tx('Photos', 'Label/S', 'text/secondary'), photoThumbs(['IMG_2291.jpg', 'IMG_2292.jpg'], true)]);
  add(form, fillW(ph));
  add(form, btn('Primary', 'MD', 'Send to Yến', { trail: 'arrow-right' }));
  var urgent = panel('If it can’t wait', { gap: 10, stroke: 'status/bad/border' });
  addAll(urgent, [Tx('If it can’t wait', 'Heading/H4'), Tx('Heavy bleeding, colic or a horse that won’t bear weight: call now, then send this.', 'Body/S', 'text/secondary', { fill: true }), btn('Secondary', 'MD', 'Call the duty line', { lead: 'phone', fill: true })]);
  var next = panel('What happens next', { gap: 10 });
  var r = H({ name: 'Reply', main: 'SPACE_BETWEEN', cross: 'CENTER' });
  addAll(r, [Tx('Yến replies', 'Body/S', 'text/secondary'), dueStack('Within 2 hours', 'of sending')]);
  addAll(next, [Tx('What happens next', 'Heading/H4'), Tx('Yến, logistics manager, reads your report with the escort’s arrival record and replies with a next step.', 'Body/S', 'text/secondary', { fill: true }), fillW(r),
    Tx('Sending pauses the 26 Sep handover deadline until the case is settled.', 'Body/S', 'text/secondary', { fill: true })]);
  var s = trackScreen('Tracking · Report a problem', trackHead('Bangkok → Ho Chi Minh City', ['REQ-2026-0151', 'job CBRT-2026-036 · 3 horses · delivered 24 Sep 2026, 16:05'], [stageChip('Handover'), chip('Warn', 'Handover not confirmed')], 'Back to the request'),
    [split(form, column([urgent, next]), SIDE.narrow)], '24 Sep 2026, ' + INC36.draft);
  var nm = s.findOne(function (n) { return n.type === 'TEXT' && n.name === 'Account name'; });
  var ini = s.findOne(function (n) { return n.type === 'TEXT' && n.name === 'Initials'; });
  if (nm) nm.characters = 'Chao Phraya Racing Stables';
  if (ini) ini.characters = 'CP';
  return s;
}

/* ---------- the same case on Yến's side (18:05) ---------- */
function scrIncidentReport() {
  var head = builderHead('Golden Lotus · cut on arrival', 'CBRT-2026-036', 'REQ-2026-0151 · Chao Phraya Racing Stables · Bangkok → Ho Chi Minh City', 'Incidents',
    [stageChip('Handover'), chip('Bad', 'Open'), dueStack('Reply in ' + INC36.left, 'by ' + INC36.due, 'status/warn/fg')]);
  head.findOne(function (n) { return n.name === 'Status'; }).itemSpacing = 12;
  var rep = panel('Customer report', { gap: 10 });
  var h = VV({ name: 'Head', gap: 8 });
  addAll(h, [Tx('What the customer reported', 'Heading/H4'), chip('Bad', 'Injury')]);
  addAll(rep, [fillW(h), Tx('“' + REPORT_TEXT + '”', 'Body/S', 'text/primary', { fill: true }), photoThumbs(['IMG_2291.jpg', 'IMG_2292.jpg'], false), stamp(INC36.reported, 'Niran, stable manager')]);
  var two = H({ name: 'Records', gap: 24 });
  addAll(two, [fillW(rep), fillW(escortRecord('What the escort recorded'))]);
  var diff = callout('Warn', 'The records differ', 'Logged sound at 16:10 by Hạnh; reported cut at ' + INC36.reported + '. The groom’s statement and the vet’s visit establish what happened; this page doesn’t decide fault.');
  var comp = VV({ name: 'Reply', gap: 14, pad: [18, 20, 18, 20], radius: 12, fill: 'surface/raised', stroke: 'border/strong' });
  addAll(comp, [Tx('Next steps and reply', 'Label/M'),
    Tx('Done', 'Label/S', 'text/secondary'),
    fillW(factLine('Vet visit booked for 25 Sep at 09:00', 'Dr Phạm Quốc Bảo, at the club’s barn. The cost is held until the case closes.', true)),
    fillW(factLine('Insurer notified under the transit policy', 'PVI Insurance, at ' + INC36.notified + '.', true)),
    fillW(factLine('Statement requested from Hạnh, groom', 'Due 25 Sep at 12:00.', true)),
    fillW(noteField('Reply to Chao Phraya Racing Stables', 'Thank you for the photos. A vet will see Golden Lotus at your barn tomorrow at 09:00, and we have notified our insurer. Hạnh, who logged her on arrival, is writing a statement by noon. Your handover stays open until this is settled.', 'Required. Sent as written; it also appears on the request page.')),
    btn('Primary', 'MD', 'Send reply', { fill: true, trail: 'arrow-right' })]);
  var left = column([two, diff, comp]);
  var ho = panel('Handover', { gap: 10 });
  var hh = H({ name: 'Head', gap: 12, main: 'SPACE_BETWEEN', cross: 'CENTER' });
  addAll(hh, [Tx('Handover', 'Heading/H4'), chip('Warn', 'Paused')]);
  addAll(ho, [fillW(hh), Tx('The 26 Sep default is paused while this case is open. The other two horses were logged sound and aren’t in question.', 'Body/S', 'text/secondary', { fill: true })]);
  var people = peoplePanel([['Niran', 'stable manager, Chao Phraya Racing Stables', 'Reported the cut; receives your reply.'], ['Hạnh', 'groom', 'Logged Golden Lotus on arrival; statement due 25 Sep 12:00.'], ['Dr Bảo', 'veterinarian', 'Visits 25 Sep 09:00.']], 'Who is involved');
  var tl = miniTimeline([[INC36.vet, 'Vet booked for 25 Sep at 09:00.', 'Yến'], [INC36.notified, 'Insurer notified: PVI Insurance.', 'Yến'], [INC36.opened, 'Incident opened; handover deadline paused.', 'System'], [INC36.reported, 'Problem reported for Golden Lotus with 2 photos.', 'Niran'], ['16:10', 'Arrival logged: all three sound.', 'Hạnh']]);
  return incidentScreen('Logistics manager · Incident · Customer report', head, left, column([ho, people, tl]), 'Thu 24 Sep 2026', ['Incidents', 'CBRT-2026-036']);
}
async function eIncidents() {
  var a = await staffScreensCall([scrIncidentHeld, scrIncidentReport]);
  var b = await insertChainCall([scrTrackReport], 'Tracking · Closed');
  return report({ screens: a.screens.concat(b.screens) });
}
