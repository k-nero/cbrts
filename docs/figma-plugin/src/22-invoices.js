/* =====================================================================
   Invoices (logistics manager). Every invoice is generated from an
   accepted quotation, never typed: a deposit invoice at acceptance and a
   final invoice after handover. The list reads overdue first, then by due
   date; a payment is recorded against one invoice at a time, and a
   recorded payment is never edited (a mistake is reversed with a refund
   entry, so both stay in the audit log). Demo date: Wed 21 Oct 2026, so
   INV-2026-0041 matches the customer's Tracking · Invoice.
   ===================================================================== */

/* [code, kind, club, for (job or quote), issued, due, due note, total, amount due, status tone, status] */
var INVOICES = [
  ['INV-2026-0038', 'Final', 'Mekong Racing Club', 'CBRT-2026-036', '6 Oct 2026', '13 Oct 2026', '8 days overdue', 9412.40, 9412.40, 'Bad', 'Overdue'],
  ['INV-2026-0040', 'Final', 'Vientiane Turf Club', 'CBRT-2026-039', '14 Oct 2026', '21 Oct 2026', 'Due today', 12880.00, 4880.00, 'Warn', 'Partly paid'],
  ['INV-2026-0041', 'Final', 'Saigon Turf Club', 'CBRT-2026-041', '19 Oct 2026', '26 Oct 2026', 'In 5 days', 6890.18, 4789.61, 'Neutral', 'Issued'],
  ['INV-2026-0042', 'Deposit', 'Đà Lạt Highland Stables', 'Q-2026-0201', '20 Oct 2026', '27 Oct 2026', 'In 6 days', 3240.00, 3240.00, 'Neutral', 'Issued'],
  ['INV-2026-0044', 'Deposit', 'Saigon Turf Club', 'Q-2026-0188', '29 Sep 2026', '6 Oct 2026', 'Paid 2 Oct', 11405.76, 0, 'Ok', 'Paid'],
  ['INV-2026-0029', 'Deposit', 'Saigon Turf Club', 'Q-2026-0168', '10 Sep 2026', '17 Sep 2026', 'Paid 10 Sep', 2100.57, 0, 'Ok', 'Paid']
];
var INV_TODAY = 'Wed 21 Oct 2026';
function invoiceRows(compact, selected) {
  return INVOICES.map(function (r) {
    var due = twoLine(r[5], r[6], r[9] === 'Bad' ? 'status/bad/fg' : null);
    var st = chip(r[9], r[10], { noDot: r[9] === 'Neutral' });
    var open = Ic('arrow-right', 16, 'text/tertiary');
    if (compact) {
      /* beside the payment panel there is no room for a club column: the club leads the invoice cell */
      var both = VV({ name: 'Invoice', gap: 2 });
      addAll(both, [Tx(r[2], 'Label/S'), Tx(r[0] + ' · ' + r[1], 'Mono/Caption', 'text/tertiary')]);
      return { cells: [both, due, money(r[8]), st, open], hl: r[0] === selected };
    }
    var ref = VV({ name: 'Invoice', gap: 2 });
    addAll(ref, [Tx(r[0], 'Mono/Caption', 'text/primary'), Tx(r[1] + ' · ' + r[3], 'Mono/Caption', 'text/tertiary')]);
    var club = VV({ name: 'Club', gap: 2 });
    addAll(club, [Tx(r[2], 'Label/S'), Tx(r[1] === 'Final' ? 'After handover' : 'On acceptance', 'Body/S', 'text/tertiary')]);
    return { cells: [ref, club, r[4], due, money(r[7]), money(r[8]), st, open], hl: r[0] === selected };
  });
}
var INV_COLS = [['Invoice', 170, null, null, null, 'Unsorted'], ['Club', null], ['Issued', 110, null, 'Mono/Caption', 'text/secondary'], ['Due', 130, null, null, null, 'Unsorted'], ['Total', 110, 'RIGHT', 'Mono/Data'], ['Amount due', 120, 'RIGHT', 'Mono/Data', null, 'Unsorted'], ['Status', 130], ['', 24, 'RIGHT']];
var INV_COLS_COMPACT = [['Invoice', null, null, null, null, 'Unsorted'], ['Due', 120, null, null, null, 'Unsorted'], ['Amount due', 110, 'RIGHT', 'Mono/Data', null, 'Unsorted'], ['Status', 120], ['', 24, 'RIGHT']];
function invoiceTable(compact, selected) {
  var t = tbl('Invoices', compact ? INV_COLS_COMPACT : INV_COLS, invoiceRows(compact, selected));
  tableFoot(t, INVOICES.length, INVOICES.length, 'invoices');
  return t;
}
function invoicesHead() { return headAdmin('Invoices', 'Deposit and final invoices from accepted quotations. Generated, never typed; record each payment as it arrives.', null, false); }
/* the four sums the manager acts on; the counts are the point of this view */
function invoiceStats() {
  var r = H({ name: 'Stats', gap: 16 });
  [['Neutral', '$22,322.01', 'Outstanding · 4 invoices'], ['Bad', '$9,412.40', 'Overdue · 1 invoice'], ['Warn', '$12,909.61', 'Due this week · 3'], ['Ok', '$19,405.76', 'Received in October']].forEach(function (s) {
    var t = stat(s[0], s[1], s[2]); add(r, fillW(t));
  });
  return r;
}
function invoiceBlock(table, count) {
  return tableBlock({ tabs: [['All · 6', 'Active'], ['To be paid · 4', 'Default'], ['Overdue · 1', 'Default'], ['Paid · 2', 'Default']],
    filters: [filterField('Search', 'Search', 'Invoice, club or job', { placeholder: true }), filterField('Select', 'Kind', 'Deposit and final')],
    count: count || '6 invoices', order: 'Order: overdue first, then by due date', table: table });
}
function scrInvoices() {
  return adminScreen('Logistics manager · Invoices', 'Invoices', ['Invoices'], STAFF.yen, [
    invoicesHead(), invoiceStats(), invoiceBlock(invoiceTable(false)),
    Tx('An issued invoice is never edited: it is voided and replaced, or corrected with a credit note. Each row opens the invoice as the club sees it.', 'Body/S', 'text/tertiary', { w: 760 })
  ], INV_TODAY);
}
/* recording a payment: the invoice's sums on top, four fields, and what saving does, in words */
function recordPanel() {
  var p = panel('Record a payment', { gap: 16, w: SIDE.narrow });
  var h = VV({ name: 'Head', gap: 4 });
  addAll(h, [Tx('Record a payment', 'Heading/H4'), Tx('INV-2026-0041 · Final invoice · Saigon Turf Club', 'Mono/Caption', 'text/tertiary')]);
  add(p, fillW(h));
  var sums = VV({ name: 'Sums', gap: 8 });
  addAll(sums, [dlRow('Job', 'CBRT-2026-041 · HCM → PNH'), dlRow('Invoice total', money(6890.18)), dlRow('Deposit paid, INV-2026-0029', '−' + money(2100.57)), divider(),
    dlRow('Amount due', money(4789.61), { labelStyle: 'Label/M', valueStyle: 'Mono/Data L' }), dlRow('Due', '26 Oct 2026 · in 5 days', { valueStyle: 'Label/S' })]);
  add(p, fillW(sums));
  var form = VV({ name: 'Form', gap: 14 });
  addAll(form, [input('Text', 'Focus', 'Amount received (USD)', '$4,789.61', 'The full amount due. Less leaves the invoice Partly paid.', { fill: true }),
    input('Select', 'Default', 'Method', 'Bank transfer', null, { fill: true }),
    input('Text', 'Default', 'Bank reference', 'VCB 211026-88341', 'As it appears on the statement, so the payment can be traced.', { fill: true }),
    input('Date', 'Default', 'Received on', '21 Oct 2026', null, { fill: true })]);
  add(p, fillW(form));
  add(p, callout('Ok', 'This settles the invoice', 'INV-2026-0041 becomes Paid, Saigon Turf Club gets a receipt by email, and CBRT-2026-041 can close.'));
  var acts = H({ name: 'Actions', gap: 12 });
  addAll(acts, [btn('Primary', 'MD', 'Record payment', { lead: 'check' }), btn('Ghost', 'MD', 'Cancel')]);
  add(p, acts);
  add(p, Tx('A recorded payment can’t be edited. A mistake is reversed with a refund entry, and both stay in the audit log.', 'Body/S', 'text/tertiary', { fill: true }));
  return p;
}
function scrInvoicePay() {
  var body = H({ name: 'Body', gap: 24 });
  addAll(body, [fillW(invoiceTable(true, 'INV-2026-0041')), recordPanel()]);
  return adminScreen('Logistics manager · Invoices · Record payment', 'Invoices', ['Invoices', 'INV-2026-0041'], STAFF.yen, [
    invoicesHead(), invoiceStats(), invoiceBlock(body)
  ], INV_TODAY);
}
async function eStaffInvoices() { return insertChainCall([scrInvoices, scrInvoicePay], 'Logistics manager · Incident · Customer report'); }
