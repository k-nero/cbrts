/* =====================================================================
   Customer contact: a note attached to a request, never a free chat. The
   customer picks what it's about; the page names who answers and by when.
   Every note and reply stays on the request's history for both sides,
   and a reply can carry an action (moving a deadline, with its reason).
   ===================================================================== */
var ASK_NOTE = 'PVI can only issue the extension to 20 Oct on 1 Oct, a day after it’s due. Is that a problem?';
function whoAnswers() {
  var p = panel('Who answers what', { gap: 10, pad: [20, 24, 12, 24] });
  add(p, VV({ name: 'Title', pad: [0, 0, 10, 0] }, [Tx('Who answers what', 'Heading/H4')]));
  [['Documents', 'Lan, transport specialist'], ['Dates, price or changes', 'Yến, logistics manager'], ['The trip', 'Khôi before departure; the escort on the day']].forEach(function (r) {
    add(p, fillW(dlRow(r[0], r[1], { valueStyle: 'Label/S' })));
  });
  add(p, VV({ name: 'Foot', pad: [10, 0, 4, 0] }, [Tx('Replies within 1 business day. Urgent on the day of travel? Call the number on your trip page.', 'Body/S', 'text/tertiary', { w: 352 })]));
  return p;
}
function earlierNotes() {
  var p = panel('Earlier notes', { gap: 12 });
  add(p, Tx('Earlier notes on this request', 'Heading/H4'));
  var q = VV({ name: 'Note', gap: 4, pad: [12, 0, 0, 0] });
  borderSide(q, 'border/default', 'top');
  addAll(q, [stamp('21 Sep · 14:02', 'You · The trip'), Tx('Can the grooms bring each horse’s own hay on board?', 'Body/S', 'text/primary', { fill: true })]);
  var a = VV({ name: 'Reply', gap: 4, pad: [10, 0, 0, 14] });
  borderSide(a, 'border/strong', 'top');
  a.strokeTopWeight = 0; a.strokeLeftWeight = 1;
  addAll(a, [stamp('21 Sep · 16:40', 'Khôi, fleet & route coordinator'), Tx('Yes, up to 2 nets per horse. They ride in the trailer’s front locker.', 'Body/S', 'text/secondary', { fill: true })]);
  addAll(p, [fillW(q), fillW(a)]);
  return p;
}
function scrTrackAsk() {
  var form = panel('Ask about this request', { gap: 18 });
  var fh = VV({ name: 'Head', gap: 4 });
  addAll(fh, [Tx('Ask about this request', 'Heading/H3'), Tx('Your note goes to the person who handles that part of your move and stays on this request’s history.', 'Body/S', 'text/secondary', { fill: true })]);
  add(form, fillW(fh));
  var about = VV({ name: 'About', gap: 10 });
  addAll(about, [Tx('What is it about?', 'Label/S', 'text/secondary'), fillW(svcOptions([
    ['Selected', 'Documents', 'Uploads, checks and deadlines.', 'Answered by Lan', null],
    ['Default', 'Dates, price or changes', 'Quotations, dates, adding or removing horses.', 'Answered by Yến', null],
    ['Default', 'The trip', 'Loading, the route and the day itself.', 'Answered by Khôi', null]], true))]);
  add(form, fillW(about));
  add(form, input('Select', 'Default', 'Which item', 'Transit insurance · due 30 Sep 2026', null));
  add(form, fillW(noteField('Your note', ASK_NOTE, 'Be specific, and attach what you have.')));
  add(form, fillW(fileRow('PVI_extension_email.pdf', 'PDF · 84 KB · attached', 'Remove')));
  var route = H({ name: 'Routing', gap: 16, pad: [14, 16, 14, 16], radius: 8, fill: 'bg/sunken', main: 'SPACE_BETWEEN', cross: 'CENTER' });
  addAll(route, [Tx('Goes to Lan, transport specialist. Yến can read it too.', 'Body/S', 'text/secondary', { fill: true }), dueStack('Within 1 business day', 'by Mon 28 Sep')]);
  add(form, fillW(route));
  add(form, btn('Primary', 'MD', 'Send to Lan', { trail: 'arrow-right' }));
  return trackScreen('Tracking · Ask a question', trackHead('Ho Chi Minh City → Phnom Penh', ['REQ-2026-0162', 'job CBRT-2026-041 · 4 horses · departs 18 Oct 2026, 06:00'], [stageMark('Documents')], 'Back to the request'),
    [split(form, column([earlierNotes(), whoAnswers()]), SIDE.narrow)], '26 Sep 2026, 11:30');
}

/* ---------- Lan's side: the notes routed to her ---------- */
/* rows: [customer, ref, subject, received, due, date, tone, selected] */
var LAN_NOTES = [
  ['Saigon Turf Club', 'CBRT-2026-041', 'Transit insurance: the extension is issued a day late', 'Sat 26 Sep · 11:31', 'Reply today', 'by 28 Sep', 'status/warn/fg', true],
  ['Lao Turf Club', 'CBRT-2026-044', 'Can the first lab do the second EIA test?', 'Sun 27 Sep · 18:20', 'Reply today', 'by 28 Sep', 'status/warn/fg'],
  ['Chao Phraya Racing Stables', 'CBRT-2026-036', 'A copy of the health certificates for our records', 'Mon 28 Sep · 08:10', 'In 1 day', 'by 29 Sep'],
  ['Hanoi Riding Club', 'REQ-2026-0190', 'Does Laos need its own EIA test?', 'Mon 28 Sep · 08:52', 'In 1 day', 'by 29 Sep']
];
function scrStaffNotes() {
  var list = panel('Notes', { gap: 0, pad: 0, clip: true });
  var lh = H({ name: 'Head', pad: [16, 20, 14, 20], main: 'SPACE_BETWEEN', cross: 'CENTER' });
  addAll(lh, [Tx('Open · 4', 'Heading/H4'), Tx('Oldest first', 'Label/S', 'text/tertiary')]);
  add(list, fillW(lh));
  LAN_NOTES.forEach(function (n) {
    var r = VV({ name: n[1], gap: 6, pad: [14, 20, 14, 20], fill: n[7] ? 'surface/raised' : null });
    borderSide(r, 'border/default', 'top');
    var top = H({ name: 'Top', gap: 8, main: 'SPACE_BETWEEN', cross: 'CENTER' });
    addAll(top, [Tx(n[0], 'Label/S'), dueStack(n[4], n[5], n[6])]);
    addAll(r, [fillW(top), Tx(n[2], 'Body/S', 'text/secondary', { fill: true }), Tx(n[1] + ' · ' + n[3], 'Mono/Caption', 'text/tertiary')]);
    add(list, fillW(r));
  });
  var d = panel('Note', { gap: 16 });
  var dh = H({ name: 'Head', gap: 12, main: 'SPACE_BETWEEN', cross: 'MIN' });
  var dt = VV({ name: 'Text', gap: 2 });
  addAll(dt, [Tx('Saigon Turf Club · CBRT-2026-041', 'Heading/H4'), stamp('Sat 26 Sep · 11:31', 'from the request page')]);
  addAll(dh, [dt, chip('Info', 'Documents')]);
  addAll(d, [fillW(dh), Tx('“' + ASK_NOTE + '”', 'Body/M', 'text/primary', { fill: true }), fillW(fileRow('PVI_extension_email.pdf', 'PDF · 84 KB', 'Open'))]);
  var item = H({ name: 'Item', gap: 14, pad: [12, 16, 12, 16], radius: 8, fill: 'bg/sunken', cross: 'CENTER' });
  var it = VV({ name: 'Text', gap: 2 });
  addAll(it, [Tx('Transit insurance · due 30 Sep 2026', 'Label/S'), Tx('Ends 15 Oct, before 20 Oct (arrival + 2 days). Clearance is planned for ' + CLEARANCE_041 + '.', 'Body/S', 'text/secondary', { fill: true })]);
  addAll(item, [chip('Warn', 'Expires in transit'), fillW(it)]);
  add(d, fillW(item));
  var comp = VV({ name: 'Reply', gap: 14, pad: [18, 20, 18, 20], radius: 12, fill: 'surface/raised', stroke: 'border/strong' });
  addAll(comp, [Tx('Reply', 'Label/M'),
    fillW(noteField('Reply to Saigon Turf Club', '1 Oct is fine. I’ve moved the due date to 2 Oct; upload the extension when PVI sends it. That is still well before clearance on ' + CLEARANCE_041 + '.', 'Sent as written; it also appears on the request page.')),
    fillW(checkRow('Move the due date to 2 Oct 2026', 'Reason shown to the customer: the insurer issues on 1 Oct; clearance is ' + CLEARANCE_041 + ', so there is room.', true)),
    btn('Primary', 'MD', 'Send reply', { fill: true, trail: 'arrow-right' }),
    Tx('Yến, logistics manager, can read every note and reply.', 'Body/S', 'text/tertiary', { fill: true })]);
  add(d, fillW(comp));
  var body = H({ name: 'Body', gap: 24 });
  list.resize(SIDE.narrow, list.height); list.layoutSizingHorizontal = 'FIXED';
  addAll(body, [list, fillW(d)]);
  return adminScreen('Transport specialist · Customer notes', 'Customer notes', ['Customer notes'], STAFF.lan, [headAdmin('Customer notes', 'Notes customers left on their requests, routed to you by topic. Reply within 1 business day.', chip('Warn', '2 due today')), body], 'Mon 28 Sep 2026');
}
async function eContact() {
  var a = await insertChainCall([scrTrackAsk], 'Tracking · All documents');
  var b = await staffScreensCall([scrStaffNotes]);
  return report({ screens: a.screens.concat(b.screens) });
}
