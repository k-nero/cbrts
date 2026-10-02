/* =====================================================================
   Handover and closing. The escort records delivery once: condition on
   arrival, what was handed over, and who received it. The customer then
   confirms within 2 days, or the handover is taken as accepted on the
   escort's record. A closed job reads as a record, with nothing owed.
   ===================================================================== */
/* ---------- 19 Oct: the customer confirmed; the job is a closed record ---------- */
function closedLead() {
  var p = H({ name: 'Closed', gap: 16, pad: [20, 20, 20, 20], radius: 12, cross: 'CENTER', fill: 'surface/card', stroke: 'border/default' });
  var ic = H({ name: 'Icon wrap', w: 40, h: 40, radius: 999, fill: 'status/ok/bg', main: 'CENTER', cross: 'CENTER' });
  add(ic, Ic('check', 20, 'status/ok/fg'));
  var t = VV({ name: 'Text', gap: 4 });
  addAll(t, [Tx('Closed. Your final invoice follows today.', 'Heading/H3'), Tx('You confirmed the handover on 19 Oct at 09:14. This page stays as the record of the move; the invoice appears here when Yến issues it.', 'Body/M', 'text/secondary', { fill: true })]);
  addAll(p, [ic, fillW(t), btn('Secondary', 'MD', 'Download the record (PDF)', { lead: 'file' })]);
  return p;
}
function scrTrackClosed() {
  var sum = panel('Summary', { gap: 0, pad: 0, clip: true });
  var f = H({ name: 'Facts', gap: 48, pad: [18, 24, 18, 24] });
  [['Delivered', '18 Oct · 12:41', true], ['Arrival window', 'Kept · 11 min after plan'], ['Distance', '240 km', true], ['Border', 'Cleared, no hold'], ['Incidents', 'None'], ['Documents', '23 kept', true]].forEach(function (x) {
    var cell = VV({ name: x[0], gap: 3 });
    addAll(cell, [Tx(x[0], 'Body/S', 'text/tertiary'), Tx(x[1], x[2] ? 'Mono/Data' : 'Label/S', 'text/primary')]);
    add(f, cell);
  });
  add(sum, fillW(f));
  var arr = panel('Arrival record', { gap: 12 });
  add(arr, Tx('Arrival condition', 'Heading/H4'));
  ARRIVAL.forEach(function (h) {
    var row = H({ name: h[0], gap: 16, pad: [10, 0, 10, 0], cross: 'CENTER' });
    borderSide(row, 'border/default', 'top');
    addAll(row, [Tx(h[0], 'Heading/H4', 'text/primary', { w: 140 }), Tx(h[5], 'Body/S', 'text/secondary', { fill: true }), chip('Ok', 'Sound')]);
    add(arr, fillW(row));
  });
  add(arr, Tx('Logged at 12:48 by Hoa, groom. Received and signed for by Sophea, receiving groom. Confirmed by you on 19 Oct at 09:14.', 'Body/S', 'text/tertiary', { fill: true }));
  var docs = panel('Documents', { gap: 10 });
  addAll(docs, [Tx('23 documents, every version kept', 'Heading/H4'), Tx('Passports, tests, certificates, the import permit and the customs clearance, with each version and who approved it. Nothing is ever overwritten; this is the legal record of the crossing.', 'Body/S', 'text/secondary', { fill: true }), btn('Secondary', 'SM', 'See all 23 documents', { trail: 'arrow-right' })]);
  var stagesP = stagePanel([['Done', 'Submitted 2 Sep.', '', ''], ['Done', '', '', ''], ['Done', '', '', ''], ['Done', '', '', ''], ['Done', '', '', ''], ['Done', '', '', ''], ['Done', 'Closed after you confirmed the handover.', 'Done', '19 Oct']]);
  var route = routePanel('Route as recorded', 'Every checkpoint was recorded by the escort.', stopsWith(['Done', 'Done', 'Done', 'Done'], ['06:05', '08:34', '09:36', '12:41']), 'Clear', [['Vehicle', 'Trailer TX-447', true], ['Escort', 'Minh, driver · Hoa and Tuấn'], ['Distance', '240 km · 6 h 36 min', true]]);
  var hist = historyPanel([['19 Oct · 09:14', 'Handover confirmed; the job is closed.', 'You'], ['18 Oct · 12:48', 'Handed over to Sophea, receiving groom; arrival condition logged for 4 horses.', 'Hoa, groom'], ['18 Oct · 12:41', 'Delivered at Phnom Penh Equestrian Centre.', 'Minh, driver']], 'Show all 38 events');
  return trackScreen('Tracking · Closed', trackHead('Ho Chi Minh City → Phnom Penh', ['REQ-2026-0162', 'job CBRT-2026-041 · 4 horses · delivered 18 Oct 2026, 12:41'], [stageMark('Handover'), chip('Ok', 'Closed')], true),
    [closedLead(), sum, split(column([arr, docs, stagesP]), route, SIDE.wide), hist], '19 Oct 2026, 09:20');
}
async function eHandover() { return insertChainCall([scrTrackClosed], 'Tracking · Delivered'); }
