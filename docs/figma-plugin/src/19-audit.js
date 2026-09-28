/* =====================================================================
   Audit log: the logistics manager's ledger of every decision and
   change, newest first. It answers "who did what, when, and why":
   filter to a code, a person, an action or a date range, open one
   entry to read what changed and the reason as it was written.
   Append-only: nothing here can be edited or deleted. No gold on the
   page, because nothing here moves a job forward.
   ===================================================================== */
var AUDIT_COLS = [['When', 96, null, null, null, 'Descending'], ['Who', 210], ['Action', null], ['On', 150, null, 'Mono/Caption'], ['From', 124], ['', 24, 'RIGHT']];
/* with an entry open, the detail column carries On and From, so the table drops them and keeps Action readable */
var AUDIT_COLS_OPEN = [['When', 96, null, null, null, 'Descending'], ['Who', 180], ['Action', null], ['', 24, 'RIGHT']];
var AUDIT_TZ = 'Times are Indochina Time (UTC+7).';
/* [time, date, name, role, action, on, from, sent (cab tablet only)] */
var AUDIT_WEEK = [
  ['11:31', '26 Sep', 'Saigon Turf Club', 'Customer', 'Left a note about the transit insurance, routed to Lan', 'CBRT-2026-041', 'Web'],
  ['10:40', '26 Sep', 'Nguyễn Thị Lan', 'Transport specialist', 'Saved 3 changes to draft v8 of the Cambodia regulation catalog', 'Catalog KH v8', 'Web'],
  ['09:14', '26 Sep', 'System', 'Automatic', 'Checked the lead time: 34 days before departure, 21 required', 'REQ-2026-0193', 'System'],
  ['09:14', '26 Sep', 'Saigon Turf Club', 'Customer', 'Submitted a request for 2 horses', 'REQ-2026-0193', 'Web'],
  ['09:02', '26 Sep', 'System', 'Automatic', 'Marked the Mộc Bài customs dossier ready to file', 'CBRT-2026-041', 'System'],
  ['22:47', '25 Sep', 'Not signed in', 'Access', '3 failed sign-ins for ' + 'bookings@saigonturf.vn', 'Access', 'Web'],
  ['14:40', '25 Sep', 'Hanoi Riding Club', 'Customer', 'Submitted a request inside the lead time and asked for an express override', 'REQ-2026-0190', 'Web'],
  ['10:14', '25 Sep', 'Vũ Hải Yến', 'Logistics manager', 'Invited Bùi Anh Thư as transport specialist', 'EF-015', 'Web'],
  ['18:04', '24 Sep', 'Vũ Hải Yến', 'Logistics manager', 'Booked a vet for Golden Lotus: Dr Bảo, 25 Sep at 09:00', 'CBRT-2026-036', 'Web'],
  ['18:02', '24 Sep', 'Vũ Hải Yến', 'Logistics manager', 'Notified PVI Insurance under the transit policy', 'CBRT-2026-036', 'Web'],
  ['17:31', '24 Sep', 'System', 'Automatic', 'Opened an incident for Golden Lotus and paused the handover deadline', 'CBRT-2026-036', 'System'],
  ['17:30', '24 Sep', 'Chao Phraya Racing Stables', 'Customer', 'Reported a problem for Golden Lotus with 2 photos', 'CBRT-2026-036', 'Web'],
  ['16:10', '24 Sep', 'Hạnh', 'Groom', 'Logged arrival: all three horses sound', 'CBRT-2026-036', 'Cab tablet', '16:12'],
  ['16:02', '24 Sep', 'Nguyễn Thị Lan', 'Transport specialist', 'Rejected Silver Bell’s proof of ownership: “the bill of sale is unsigned”', 'CBRT-2026-041', 'Web'],
  ['09:48', '24 Sep', 'Saigon Turf Club', 'Customer', 'Uploaded Silver Bell’s proof of ownership (bill of sale)', 'CBRT-2026-041', 'Web'],
  ['14:30', '22 Sep', 'Nguyễn Thị Lan', 'Transport specialist', 'Published version 7 of the Cambodia regulation catalog', 'Catalog KH v7', 'Web'],
  ['15:12', '21 Sep', 'Nguyễn Thị Lan', 'Transport specialist', 'Cleared Shadowfax’s EIA (Coggins) test', 'CBRT-2026-041', 'Web'],
  ['09:40', '21 Sep', 'Saigon Turf Club', 'Customer', 'Uploaded Shadowfax’s EIA (Coggins) test', 'CBRT-2026-041', 'Web'],
  ['16:25', '20 Sep', 'Nguyễn Thị Lan', 'Transport specialist', 'Cleared the customs value declaration for Mộc Bài – Bavet', 'CBRT-2026-041', 'Web'],
  ['10:02', '20 Sep', 'Saigon Turf Club', 'Customer', 'Uploaded the customs value declaration for Mộc Bài – Bavet', 'CBRT-2026-041', 'Web']
];
var AUDIT_TOTAL = 142; // entries in the week 20–26 Sep; the first page is AUDIT_WEEK
var AUDIT_0190 = [
  ['09:05', '29 Sep', 'Vũ Hải Yến', 'Logistics manager', 'Reported 2 missing rates on Hanoi → Vientiane to Lan', 'REQ-2026-0190', 'Web'],
  ['10:22', '28 Sep', 'Vũ Hải Yến', 'Logistics manager', 'Granted an express lead-time override', 'REQ-2026-0190', 'Web'],
  ['08:52', '28 Sep', 'Hanoi Riding Club', 'Customer', 'Left a note: “Does Laos need its own EIA test?”', 'REQ-2026-0190', 'Web'],
  ['16:10', '26 Sep', 'Đỗ Minh Khôi', 'Fleet & route coordinator', 'Confirmed capacity: one private trailer, 19–21 Oct', 'REQ-2026-0190', 'Web'],
  ['14:40', '25 Sep', 'System', 'Automatic', 'Lead-time check failed: 25 days before departure, 30 required', 'REQ-2026-0190', 'System'],
  ['14:40', '25 Sep', 'Hanoi Riding Club', 'Customer', 'Submitted a request for 1 horse, asking for an express override', 'REQ-2026-0190', 'Web']
];
/* a value typed by nobody yet reads as a placeholder */
function placeholder(i) { var v = i.findOne(function (n) { return n.type === 'TEXT' && n.name === 'Value'; }); if (v) v.fills = [P('text/tertiary')]; return i; }
function auditFilters(f) {
  return [filterField('Search', 'Search', f.search || 'Code, person or document', { placeholder: !f.search, state: f.searchState }), filterField('Select', 'Person', f.person || 'Anyone'), filterField('Select', 'Action', f.action || 'All actions'), filterField('Date', 'When', f.when || '20 – 26 Sep 2026')];
}
/* newest first is the When column sorted, so the count line carries no order note */
function auditBlock(f, count, action, table) { return tableBlock({ filters: auditFilters(f), count: count, action: action, right: AUDIT_TZ, table: table }); }
function auditRows(list, selected, open) {
  return list.map(function (e, i) {
    var when = VV({ name: 'When', gap: 2 });
    addAll(when, [Tx(e[0], 'Mono/Data', 'text/primary'), Tx(e[1], 'Mono/Caption', 'text/tertiary')]);
    var who = VV({ name: 'Who', gap: 2 });
    addAll(who, [Tx(e[2], 'Label/S', e[2] === 'System' || e[2] === 'Not signed in' ? 'text/secondary' : 'text/primary'), Tx(e[3], 'Body/S', 'text/tertiary')]);
    var action = Tx(e[4], 'Body/S', 'text/primary', { fill: true });
    if (open) return { cells: [when, who, action, rowOpen()], hl: i === selected }; // the open entry shows On and From; build no cells for them
    var from = VV({ name: 'From', gap: 4 });
    add(from, chip('Neutral', e[6], { noDot: true }));
    if (e[7]) add(from, Tx('Received ' + e[7], 'Body/S', 'text/tertiary'));
    return { cells: [when, who, action, e[5], from, rowOpen()], hl: i === selected };
  });
}
function auditTable(list, selected, total) {
  var open = selected >= 0;
  var t = tbl('Audit entries', open ? AUDIT_COLS_OPEN : AUDIT_COLS, auditRows(list, selected, open));
  return tableFoot(t, list.length, total || list.length, 'entries');
}
function auditHead() {
  return headAdmin('Audit log', 'Every decision and change, newest first. Entries are never edited or deleted.', btn('Secondary', 'MD', 'Export CSV', { lead: 'file' }));
}
function scrAudit() {
  return adminScreen('Logistics manager · Audit log', 'Audit log', ['Audit log'], STAFF.yen, [
    auditHead(), auditBlock({}, AUDIT_TOTAL + ' entries in the last 7 days', null, auditTable(AUDIT_WEEK, -1, AUDIT_TOTAL))], 'Sat 26 Sep 2026');
}
/* one entry opened: what changed, before and after, and the reason as written */
function changeRow(label, before, after) {
  var r = VV({ name: label, gap: 4, pad: [10, 0, 10, 0] });
  borderSide(r, 'border/default', 'top');
  var v = H({ name: 'Values', gap: 8, cross: 'CENTER' });
  addAll(v, [Tx(before, 'Body/S', 'text/tertiary', { strike: true }), Ic('arrow-right', 14, 'text/tertiary'), Tx(after, 'Label/S', 'text/primary')]);
  addAll(r, [Tx(label, 'Body/S', 'text/secondary'), v]);
  return fillW(r);
}
function auditEntry() {
  var p = panel('Entry', { gap: 16, w: SIDE.narrow });
  var h = VV({ name: 'Head', gap: 6 });
  addAll(h, [Tx('Granted an express lead-time override', 'Heading/H4', 'text/primary', { fill: true }), stamp('28 Sep 2026 · 10:22', 'Vũ Hải Yến, logistics manager')]);
  add(p, fillW(h));
  var ch = VV({ name: 'What changed', gap: 0 });
  add(ch, VV({ name: 'Title', pad: [0, 0, 6, 0] }, [Tx('What changed', 'Label/M')]));
  addAll(ch, [changeRow('Lead-time check', 'Failed · 25 of 30 days', 'Overridden'), changeRow('Earliest departure', '25 Oct 2026', '20 Oct 2026'), changeRow('Next step', 'Reject or move the date', 'Quotation')]);
  add(p, fillW(ch));
  var why = VV({ name: 'Reason', gap: 8 });
  var q = VV({ name: 'Quote', pad: [12, 14, 12, 14], radius: 8, fill: 'bg/sunken' });
  add(q, Tx('“Race entry at Vientiane closes 22 Oct. Capacity is confirmed for 19–21 Oct and Lotus Crown is already in quarantine at Sóc Sơn until 15 Oct, so 25 days’ notice is workable.”', 'Body/S', 'text/primary', { fill: true }));
  addAll(why, [Tx('Reason, as written', 'Label/M'), fillW(q)]);
  add(p, fillW(why));
  var rec = VV({ name: 'Record', gap: 8 });
  addAll(rec, [dlRow('Request', 'REQ-2026-0190'), dlRow('Rule', 'Vietnam → Laos · 30 days', { valueStyle: 'Label/S' }), dlRow('From', 'Web', { valueStyle: 'Label/S' }), dlRow('Entry', 'AUD-2026-018402')]);
  add(p, fillW(rec));
  add(p, btn('Ghost', 'SM', 'Open REQ-2026-0190', { trail: 'arrow-right' }));
  add(p, Tx('This entry can’t be edited or deleted. A correction is a new entry that points back to it.', 'Body/S', 'text/tertiary', { fill: true }));
  return p;
}
function scrAuditFiltered() {
  var body = H({ name: 'Body', gap: 24 });
  var entry = auditEntry();
  addAll(body, [fillW(auditTable(AUDIT_0190, 1)), entry]);
  return adminScreen('Logistics manager · Audit log · Entry', 'Audit log', ['Audit log'], STAFF.yen, [
    auditHead(), auditBlock({ search: 'REQ-2026-0190', searchState: 'Focus', when: '23 – 29 Sep 2026' }, '6 entries for REQ-2026-0190', 'Clear filters', body)], 'Tue 29 Sep 2026');
}
function scrAuditEmpty() {
  var t = tbl('Audit entries', AUDIT_COLS, []);
  var e = VV({ name: 'Empty', gap: 8, pad: [48, 24, 52, 24], cross: 'CENTER' });
  addAll(e, [Tx('No entries match these filters', 'Heading/H4', 'text/primary', { align: 'CENTER' }),
    Tx('Nothing was recorded for CBRT-2026-099 by Đỗ Minh Khôi between 20 and 26 Sep. Job codes run from CBRT-2026-001 to CBRT-2026-044, so the code may be mistyped.', 'Body/S', 'text/secondary', { w: 560, align: 'CENTER' }),
    VV({ name: 'Action', pad: [8, 0, 0, 0] }, [btn('Secondary', 'MD', 'Clear filters')])]);
  add(t, fillW(e));
  return adminScreen('Logistics manager · Audit log · No results', 'Audit log', ['Audit log'], STAFF.yen, [
    auditHead(), auditBlock({ search: 'CBRT-2026-099', person: 'Đỗ Minh Khôi' }, '0 entries', 'Clear filters', t)], 'Sat 26 Sep 2026');
}
/* another role following a shared link: say why, and point back to their own work */
function scrAuditDenied() {
  var p = panel('Not available', { gap: 16, pad: [40, 40, 40, 40] });
  var ic = H({ name: 'Icon wrap', w: 44, h: 44, radius: 999, fill: 'surface/muted', main: 'CENTER', cross: 'CENTER' });
  add(ic, Ic('lock', 20, 'text/secondary'));
  var acts = H({ name: 'Actions', gap: 12, cross: 'CENTER' });
  addAll(acts, [btn('Secondary', 'MD', 'Back to Jobs', { lead: 'arrow-left' }), btn('Ghost', 'MD', 'Ask Yến for an export')]);
  addAll(p, [ic, Tx('Only the logistics manager can see the audit log', 'Heading/H3'),
    Tx('It records every decision on every job, including yours, so it’s kept to one role. If you need an entry as evidence, ask Vũ Hải Yến to export it for you.', 'Body/M', 'text/secondary', { w: 640 }), acts]);
  return adminScreen('Transport specialist · Audit log · Not allowed', null, ['Audit log'], STAFF.lan, [
    headAdmin('Audit log', 'Kept for the logistics manager.', null), p], 'Sat 26 Sep 2026');
}
var AUDIT_SCREENS = [scrAudit, scrAuditFiltered, scrAuditEmpty, scrAuditDenied];
