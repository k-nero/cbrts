/* =====================================================================
   Invoices and route history (customer). The final invoice is the
   accepted quotation settled against what happened: fixed lines as
   quoted, estimated lines at their actual quantity with the reason, a
   late-arrival credit when a window was missed, minus the deposit. It is
   generated, never typed, and an issued invoice is never edited.
   A re-routed move shows every route the customer was ever given: the
   current plan in full, and each earlier one with why it changed.
   ===================================================================== */

/* CBRT-2026-041, accepted as Q-2026-0168 v2 on 10 Sep: [group, name, lines]
   line: [description, basis, quoted qty, rate, actual qty, why it changed] */
var Q041 = [
  ['A', 'Ground transport · road', [
    ['Private trailer, Ho Chi Minh City → Phnom Penh', 'per km · 240 km', 240, 6.5],
    ['Loading and handling', 'per horse', 4, 120]]],
  ['B', 'Pre-export', [
    ['Veterinary inspection and bloods', 'per horse', 4, 310]]],
  ['D', 'Escort', [
    ['Grooms', 'one per three horses · 4 ÷ 3, rounded up = 2', 2, 380]]],
  ['E', 'Documentation', [
    ['Export health certificate', 'per horse', 4, 180],
    ['Customs and border documentation', 'per crossing · 1', 1, 420],
    ['Cambodia import permit handling', 'per shipment', 1, 380]]],
  ['H', 'Surcharges', [
    ['Arrival window, 18 Oct 11:00–14:00', '20% of ground lines (A) · $2,040', 1, 408],
    ['Waiting time at the border', 'per hour · 2 h estimated', 2, 95, 1, 'The queue at Mộc Bài – Bavet took 36 min (07:58–08:34), billed as 1 started hour.']]]
];
var INV041 = { code: 'INV-2026-0041', deposit: 'INV-2026-0029', quote: 'Q-2026-0168 v2', issued: '19 Oct 2026', due: '26 Oct 2026', paidOn: '10 Sep' };
/* the fixed calculation order of the quotation, on quoted or actual quantities */
function totals041(actual) {
  var t = { sub: 0, ground: 0 };
  Q041.forEach(function (g) {
    g[2].forEach(function (l) {
      var q = actual && l[4] != null ? l[4] : l[2];
      var a = Math.round(q * l[3] * 100) / 100;
      t.sub += a;
      if (g[0] === 'A') t.ground += a;
    });
  });
  t.brk = Math.round(t.ground * 0.10 * 100) / 100;
  t.base1 = t.sub - t.brk;
  t.cont = Math.round(t.base1 * 0.05 * 100) / 100;
  t.base2 = t.base1 + t.cont;
  t.fee = Math.round(t.base2 * 0.12 * 100) / 100;
  t.total = Math.round((t.base2 + t.fee) * 100) / 100;
  return t;
}
var T041Q = totals041(false), T041 = totals041(true);
T041.deposit = Math.round(T041Q.total * 0.30 * 100) / 100;
T041.due = Math.round((T041.total - T041.deposit) * 100) / 100;

/* the ledger: each line says whether it is as quoted or actual; an actual line carries its reason underneath */
function invoiceLedger() {
  var table = panel('Invoice lines', { gap: 0, pad: 0, clip: true });
  var th = H({ name: 'Table header', gap: 16, pad: [12, 20, 12, 20], fill: 'bg/sunken' });
  addAll(th, [Tx('Item', 'Mono/Eyebrow', 'text/tertiary', { fill: true }), Tx('Qty', 'Mono/Eyebrow', 'text/tertiary', { w: 48, align: 'RIGHT' }), Tx('Rate', 'Mono/Eyebrow', 'text/tertiary', { w: 88, align: 'RIGHT' }), Tx('Amount', 'Mono/Eyebrow', 'text/tertiary', { w: 104, align: 'RIGHT' }), Tx('', 'Mono/Eyebrow', 'text/tertiary', { w: 96 })]);
  add(table, fillW(th));
  Q041.forEach(function (g) {
    var gsum = 0;
    g[2].forEach(function (l) { gsum += (l[4] != null ? l[4] : l[2]) * l[3]; });
    var gh = H({ name: 'Group ' + g[0], gap: 12, pad: [18, 20, 10, 20], cross: 'CENTER' });
    var badge = H({ name: 'Letter', w: 26, h: 26, radius: 6, fill: 'surface/muted', main: 'CENTER', cross: 'CENTER' });
    add(badge, Tx(g[0], 'Mono/Chip', 'text/secondary'));
    addAll(gh, [badge, Tx(g[1], 'Heading/H4', 'text/primary', { fill: true }), Tx(money(gsum), 'Mono/Data', 'text/secondary')]);
    add(table, fillW(gh));
    g[2].forEach(function (l) {
      var changed = l[4] != null;
      var q = changed ? l[4] : l[2];
      var row = H({ name: 'Line · ' + l[0], gap: 16, pad: [10, 20, 10, 20], cross: 'CENTER', fill: changed ? 'surface/raised' : null });
      borderSide(row, 'border/default', 'top');
      var d = VV({ name: 'Item', gap: 2 });
      addAll(d, [Tx(l[0], 'Label/M', 'text/primary', { fill: true }), Tx(l[1], 'Body/S', 'text/tertiary', { fill: true })]);
      var tag = H({ name: 'Tag', w: 96, main: 'MAX' });
      add(tag, chip(changed ? 'Info' : 'Neutral', changed ? 'Actual' : 'As quoted', { noDot: true }));
      addAll(row, [fillW(d), Tx(String(q), 'Mono/Data', 'text/primary', { w: 48, align: 'RIGHT' }), Tx(money(l[3]), 'Mono/Data', 'text/secondary', { w: 88, align: 'RIGHT' }), Tx(money(q * l[3]), 'Mono/Data', 'text/primary', { w: 104, align: 'RIGHT' }), tag]);
      add(table, fillW(row));
      if (changed) {
        var why = H({ name: 'Why · ' + l[0], gap: 10, pad: [0, 20, 12, 20], fill: 'surface/raised' });
        addAll(why, [Ic('info', 16, 'status/info/fg'), Tx('Quoted ' + l[2] + ' × ' + money(l[3]) + ' = ' + money(l[2] * l[3]) + '. ' + l[5], 'Body/S', 'text/secondary', { fill: true })]);
        add(table, fillW(why));
      }
    });
  });
  return table;
}
function invoiceTotals() {
  var tot = panel('Totals', { gap: 12 });
  [['Lines subtotal', 'Groups A–H, as invoiced', money(T041.sub)],
   ['Volume break, 4–7 horses', '10% of ground lines (A) · ' + money(T041.ground), '−' + money(T041.brk)],
   ['Transit insurance', 'Your own policy, PVI Insurance', money(0)],
   ['Contingency', '5% of ' + money(T041.base1), money(T041.cont)],
   ['Service fee', '12% of ' + money(T041.base2), money(T041.fee)],
   ['VAT', 'International transport, 0%', money(0)]].forEach(function (r) {
    var row = H({ name: r[0], gap: 16, cross: 'CENTER' });
    var l = VV({ name: 'Label', gap: 2 });
    addAll(l, [Tx(r[0], 'Label/M'), Tx(r[1], 'Body/S', 'text/tertiary')]);
    addAll(row, [fillW(l), Tx(r[2], 'Mono/Data', 'text/primary', { align: 'RIGHT' })]);
    add(tot, fillW(row));
  });
  add(tot, divider());
  add(tot, dlRow('Invoice total', money(T041.total), { labelStyle: 'Label/M' }));
  add(tot, dlRow('Deposit paid ' + INV041.paidOn + ' · ' + INV041.deposit, '−' + money(T041.deposit), { labelStyle: 'Body/S' }));
  add(tot, divider());
  var due = H({ name: 'Amount due', cross: 'CENTER', main: 'SPACE_BETWEEN' });
  addAll(due, [Tx('Amount due, USD', 'Heading/H3'), Tx(money(T041.due), 'Display/M')]);
  add(tot, fillW(due));
  add(tot, Tx('Worked out in the quotation’s fixed order on the actual quantities. The deposit was 30% of the quotation total, ' + money(T041Q.total) + '.', 'Body/S', 'text/tertiary', { fill: true }));
  return tot;
}
function scrInvoice() {
  var left = column([invoiceLedger(), invoiceTotals()]);

  var cmp = panel('Against your quotation', { gap: 12 });
  var head = H({ name: 'Head', main: 'SPACE_BETWEEN', cross: 'CENTER' });
  addAll(head, [Tx('Against your quotation', 'Heading/H4'), chip('Ok', 'Lower by ' + money(T041Q.total - T041.total), { noDot: true })]);
  addAll(cmp, [fillW(head), dlRow('Quotation ' + INV041.quote, money(T041Q.total)), dlRow('This invoice', money(T041.total)),
    Tx('One line changed: waiting time at the border, billed for 1 hour instead of the 2 estimated. Every other line is as quoted.', 'Body/S', 'text/tertiary', { fill: true })]);

  var win = panel('Arrival window', { gap: 10 });
  var wh = H({ name: 'Head', main: 'SPACE_BETWEEN', cross: 'CENTER' });
  addAll(wh, [Tx('Arrival window', 'Heading/H4'), chip('Ok', 'Kept')]);
  addAll(win, [fillW(wh), dlRow('Your window', '18 Oct, 11:00–14:00'), dlRow('Delivered', '18 Oct, 12:41'),
    Tx('Delivered inside the window, so no late-arrival credit applies. Had we been late, the credit would appear here as its own line.', 'Body/S', 'text/tertiary', { fill: true })]);

  var pay = panel('How to pay', { gap: 10 });
  addAll(pay, [Tx('How to pay', 'Heading/H4'), Tx('By bank transfer, with the invoice code as the reference. We record transfers by hand within 1 working day; this page then shows the invoice as paid.', 'Body/S', 'text/secondary', { fill: true }),
    dlRow('Reference', INV041.code), dlRow('Account name', 'EquiFreight', { valueStyle: 'Label/S' }), dlRow('Account', '0000 0000 0000'),
    Tx('Prototype: placeholder bank details.', 'Body/S', 'text/tertiary')]);

  var hist = panel('Invoices for this move', { gap: 0, pad: [20, 24, 12, 24] });
  add(hist, VV({ name: 'Title', pad: [0, 0, 12, 0] }, [Tx('Invoices for this move', 'Heading/H4')]));
  [[INV041.deposit, 'Deposit · issued 10 Sep', money(T041.deposit), 'Ok', 'Paid'], [INV041.code, 'Final · issued 19 Oct', money(T041.due), 'Warn', 'Due 26 Oct']].forEach(function (r) {
    var row = H({ name: r[0], gap: 12, pad: [10, 0, 10, 0], cross: 'CENTER' });
    borderSide(row, 'border/default', 'top');
    var t = VV({ name: 'Text', gap: 2 });
    addAll(t, [Tx(r[0], 'Mono/Data', 'text/primary'), Tx(r[1], 'Body/S', 'text/tertiary')]);
    addAll(row, [fillW(t), Tx(r[2], 'Mono/Data', 'text/primary', { align: 'RIGHT' }), chip(r[3], r[4])]);
    add(hist, fillW(row));
  });
  var right = column([cmp, win, pay, hist]);

  var lead = owedPanel('1 item', 'Yến, logistics manager, issued the final invoice on 19 Oct after you confirmed the handover. It settles your quotation against what happened on the trip.',
    [owedItem('Soon', 'Pay the final invoice', INV041.code + ' · ' + money(T041.due), 'By bank transfer with ' + INV041.code + ' as the reference. The deposit you paid on ' + INV041.paidOn + ' is already taken off.', 'Due in 7 days', INV041.due, 'Download invoice (PDF)', 'file')],
    { chipTone: 'Warn', chipLabel: 'Payment due' }, null);
  return trackScreen('Tracking · Invoice', trackHead('Ho Chi Minh City → Phnom Penh', [INV041.code, 'final invoice · job CBRT-2026-041 · REQ-2026-0162 · issued ' + INV041.issued], [stageMark('Handover'), chip('Warn', 'Payment due')], true), [lead, split(left, right, SIDE.narrow)], '19 Oct 2026, 10:05');
}

/* ---------- CBRT-2026-040, 29 Sep 09:40: re-routed through Xa Mát ---------- */
/* the decision Yến recorded at the hold (13-incidents) becomes route plan v2; v1 stays visible with its reason */
var REROUTE040 = {
  now: '09:40', changed: '09:24', by: 'Khôi, fleet & route coordinator',
  reason: 'Mộc Bài is closed to vehicles over 10 t until 16:00 for a bridge inspection.',
  message: 'Mộc Bài is closed until 16:00 for a bridge inspection. We are re-routing Mekong Star through Xa Mát, with a rest stop at 11:10. New arrival about 15:40 at your yard.',
  v2: [['Done', 'Phnom Penh', 'Pickup · Sokha Stables', '05:30'], ['Current', 'Bavet', 'Held 08:12–09:25, turned back', '09:25'], ['Upcoming', 'Xa Mát – Trapeang Phlong', 'Border', 'exp. 10:50'], ['Upcoming', 'Xa Mát yard', 'Rest stop · unloaded', '11:10'], ['Upcoming', 'Ho Chi Minh City', 'Delivery', '15:40']],
  v1: [['Upcoming', 'Phnom Penh', 'Pickup', '05:30'], ['Upcoming', 'Bavet – Mộc Bài', 'Border', '08:00'], ['Upcoming', 'Tây Ninh', 'Welfare stop', '09:30'], ['Upcoming', 'Ho Chi Minh City', 'Delivery', '13:30']]
};
/* the current plan in full, then each earlier plan, newest first, with when, who and why it changed */
function routeHistoryPanel() {
  var p = panel('Route', { gap: 18 });
  var h = H({ name: 'Head', main: 'SPACE_BETWEEN', cross: 'MAX' });
  addAll(h, [VV({ name: 'Title', gap: 2 }, [Tx('Route · version 2', 'Heading/H4'), Tx('Positions come from checkpoints the escort records. Between checkpoints we show the last confirmed one, never a guess.', 'Body/S', 'text/tertiary', { fill: true })]), Tx('Updated ' + REROUTE040.now, 'Mono/Caption', 'text/tertiary')]);
  h.children[0].layoutSizingHorizontal = 'FILL';
  addAll(p, [fillW(h), fillW(routeList(REROUTE040.v2.map(function (s) { return s; })))]);
  add(p, divider());
  add(p, Tx('Earlier plans', 'Label/S', 'text/secondary'));
  var old = VV({ name: 'Version 1', gap: 12, pad: [16, 18, 16, 18], radius: 8, fill: 'bg/sunken' });
  var oh = H({ name: 'Head', gap: 12, main: 'SPACE_BETWEEN', cross: 'CENTER' });
  addAll(oh, [Tx('Version 1 · via Bavet – Mộc Bài', 'Label/M'), chip('Neutral', 'Replaced ' + REROUTE040.changed, { noDot: true })]);
  var why = H({ name: 'Why', gap: 10 });
  addAll(why, [Ic('info', 16, 'text/secondary'), Tx('Replaced on 29 Sep at ' + REROUTE040.changed + ' by ' + REROUTE040.by + '. ' + REROUTE040.reason, 'Body/S', 'text/secondary', { fill: true })]);
  addAll(old, [fillW(oh), fillW(why), fillW(routeList(REROUTE040.v1)), btn('Ghost', 'SM', 'Hide version 1')]);
  add(p, fillW(old));
  return p;
}
function scrTrackRerouted() {
  var lead = nothingOwed('Nothing needed from you', 'Mộc Bài is closed until 16:00, so Mekong Star is going through the Xa Mát crossing instead. She rests unloaded at the Xa Mát yard at 11:10.', 'Arrives in about 6 h', '15:40');
  var msg = panel('Message from Yến', { gap: 8 });
  var mh = H({ name: 'Head', gap: 8, cross: 'CENTER' });
  addAll(mh, [Tx('09:20', 'Mono/Caption', 'text/tertiary'), Tx('Yến, logistics manager', 'Body/S', 'text/tertiary')]);
  addAll(msg, [Tx('Message from Yến', 'Heading/H4'), fillW(mh), Tx(REROUTE040.message, 'Body/M', 'text/primary', { fill: true })]);
  var change = panel('What changes for you', { gap: 10 });
  add(change, Tx('What changes for you', 'Heading/H4'));
  [['Arrival', '15:40 instead of 13:30'], ['Price', 'Unchanged; the extra 95 km is ours'], ['Documents', '1 new, filed by Lan']].forEach(function (r) { add(change, factRow(r)); });
  var people = peoplePanel([['Tùng', 'driver', 'Driving Mekong Star on the new route.'], ['Yến', 'logistics manager', 'Decided the re-route and answers your questions.'], ['Lan', 'transport specialist', 'Files the declaration for the Xa Mát crossing.']]);
  var hist = historyPanel([['29 Sep · 09:25', 'Left Bavet for the Xa Mát crossing.', 'Tùng, driver'], ['29 Sep · 09:24', 'Route changed to version 2, via Xa Mát – Trapeang Phlong.', 'Khôi, fleet & route coordinator'], ['29 Sep · 09:20', 'Re-route decided; message sent to you.', 'Yến, logistics manager'], ['29 Sep · 08:12', 'Held at Bavet: Mộc Bài closed until 16:00.', 'Tùng, driver']], 'Show all 27 events');
  var s = trackScreen('Tracking · Re-routed', trackHead('Phnom Penh → Ho Chi Minh City', ['REQ-2026-0144', 'job CBRT-2026-040 · Mekong Star · shared load · departed 29 Sep 2026, 05:30'], [stageMark('Trip'), chip('Warn', 'Re-routed')], true),
    [lead, split(routeHistoryPanel(), column([msg, change, people]), SIDE.narrow), hist], '29 Sep 2026, ' + REROUTE040.now);
  var nm = s.findOne(function (n) { return n.type === 'TEXT' && n.name === 'Account name'; });
  var ini = s.findOne(function (n) { return n.type === 'TEXT' && n.name === 'Initials'; });
  if (nm) nm.characters = 'Sokha Stables';
  if (ini) ini.characters = 'SS';
  return s;
}
async function eInvoice() {
  await insertChainCall([scrTrackRerouted], 'Tracking · In transit');
  return insertChainCall([scrInvoice], 'Tracking · Closed');
}
