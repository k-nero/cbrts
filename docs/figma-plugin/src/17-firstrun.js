/* =====================================================================
   First run: a new customer with nothing yet. The empty My requests page
   says the order of things (horses first, then a request) and what to
   have to hand; the add-horse form says why each field is asked and
   what it feeds. One gold action per view.
   ===================================================================== */
function newCustomer(s) {
  var nm = s.findOne(function (n) { return n.type === 'TEXT' && n.name === 'Account name'; });
  var ini = s.findOne(function (n) { return n.type === 'TEXT' && n.name === 'Initials'; });
  if (nm) nm.characters = 'Đà Lạt Highland Stables';
  if (ini) ini.characters = 'DH';
  setP(s.children[s.children.length - 1], { 'As of': '26 Sep 2026' });
  return s;
}
function scrFirstRequests() {
  var w = panel('Welcome', { gap: 20, pad: 28 });
  var h = VV({ name: 'Head', gap: 6 });
  addAll(h, [Tx('Start with your horses', 'Display/M'), Tx('Every request is built from your horses’ profiles, so we ask for them once and reuse them on every move.', 'Body/M', 'text/secondary', { fill: true })]);
  add(w, fillW(h));
  [['Add your horses', 'Name, microchip, size and temperament. About 3 minutes each.'], ['Request transport', 'Pick horses, service, route and dates. You see an indicative range straight away.'], ['We review and quote', 'Within 1 business day you get an itemised quotation, valid for 7 days.']].forEach(function (s, i) {
    var row = H({ name: s[0], gap: 14, cross: 'MIN' });
    var n = H({ name: 'N', w: 28, h: 28, radius: 999, stroke: i === 0 ? 'text/primary' : 'border/strong', main: 'CENTER', cross: 'CENTER' });
    add(n, Tx(String(i + 1), 'Mono/Caption', i === 0 ? 'text/primary' : 'text/tertiary'));
    var t = VV({ name: 'Text', gap: 2 });
    addAll(t, [Tx(s[0], 'Label/M'), Tx(s[1], 'Body/S', 'text/secondary', { fill: true })]);
    addAll(row, [n, fillW(t)]);
    add(w, fillW(row));
  });
  var acts = H({ name: 'Actions', gap: 12, pad: [4, 0, 0, 0] });
  addAll(acts, [btn('Primary', 'MD', 'Add your first horse', { lead: 'plus' }), btn('Secondary', 'MD', 'See how a request works')]);
  add(w, acts);
  var ready = panel('Have these ready', { gap: 12 });
  add(ready, Tx('Have these ready', 'Heading/H4'));
  [['Each horse’s passport', 'For the microchip number and date of birth.'], ['Height and weight', 'Height sets the stall width; weight sets the load.'], ['A declared value', 'Used for insurance if you insure through us.'], ['Handling needs', 'Nervous loaders, box stall only, a climate stall, a foal at foot.']].forEach(function (r) {
    var row = VV({ name: r[0], gap: 2, pad: [10, 0, 0, 0] });
    borderSide(row, 'border/default', 'top');
    addAll(row, [Tx(r[0], 'Label/S'), Tx(r[1], 'Body/S', 'text/tertiary', { fill: true })]);
    add(ready, fillW(row));
  });
  /* the same table as My requests, with no rows yet, so nothing moves when the first request arrives */
  var empty = tbl('Requests', REQ_COLS, []);
  var eb = VV({ name: 'Empty', gap: 6, pad: [40, 24, 44, 24], cross: 'CENTER' });
  addAll(eb, [Tx('Your requests appear here', 'Heading/H4', 'text/secondary', { align: 'CENTER' }), Tx('Sorted by what needs you first, with the stage each one is at.', 'Body/S', 'text/tertiary', { align: 'CENTER' })]);
  add(empty, fillW(eb));
  return newCustomer(screen('First run · My requests', 'My requests', [pageHead('My requests', '0 requests · Đà Lạt Highland Stables'), split(w, ready, SIDE.narrow), empty], { gap: 28 }));
}
function fieldRow(fields) {
  var r = H({ name: 'Fields', gap: 16, cross: 'MIN' });
  fields.forEach(function (f) { add(r, fillW(input(f[0], f[1], f[2], f[3], f[4]))); });
  return r;
}
function formSection(title, sub, kids) {
  var v = VV({ name: title, gap: 14, pad: [20, 0, 0, 0] });
  borderSide(v, 'border/default', 'top');
  var h = VV({ name: 'Head', gap: 2 });
  add(h, Tx(title, 'Heading/H4'));
  if (sub) add(h, Tx(sub, 'Body/S', 'text/tertiary', { fill: true }));
  add(v, fillW(h));
  kids.forEach(function (k) { add(v, fillW(k)); });
  return v;
}
function scrAddHorse() {
  var form = panel('Add a horse', { gap: 20, pad: 28 });
  var ident = formSection('Identity', 'As on the passport. We check these against it when you request transport.', [
    fieldRow([['Text', 'Default', 'Name', 'Langbiang Star', null], ['Text', 'Focus', 'Microchip', '250 259 600 441 087', 'From the passport: 15 digits. Borders check it.']]),
    fieldRow([['Select', 'Default', 'Sex', 'Gelding', null], ['Select', 'Default', 'Breed', 'Thoroughbred', null]]),
    fieldRow([['Date', 'Default', 'Date of birth', '3 Mar 2019', null], ['Select', 'Default', 'Coat', 'Bay', null]])]);
  ident.strokeTopWeight = 0; ident.paddingTop = 0;
  add(form, fillW(ident));
  var size = H({ name: 'Size class', gap: 12, pad: [12, 16, 12, 16], radius: 8, fill: 'bg/sunken', cross: 'CENTER' });
  addAll(size, [chip('Neutral', 'Size M · 32 in', { noDot: true }), Tx('Worked out from 16.0 hh. It decides the stall width and the air position.', 'Body/S', 'text/secondary', { fill: true })]);
  add(form, fillW(formSection('Size and weight', null, [fieldRow([['Text', 'Default', 'Height', '16.0 hh', null], ['Text', 'Default', 'Weight', '505 kg', null]]), size])));
  var ticks = H({ name: 'Needs', gap: 24, cross: 'CENTER' });
  addAll(ticks, [tick('Climate-controlled stall', false), tick('Box stall only', false), tick('Mare with foal at foot', false)]);
  var notes = noteField('Handling notes', 'Anything the grooms should know: how he loads, what settles him.', 'Shown to the escort and the fleet coordinator.', true);
  add(form, fillW(formSection('Temperament and needs', null, [svcOptions([
    ['Selected', 'Calm', 'Loads with a standard team.', 'Standard stall', null],
    ['Default', 'Nervous', 'Loaded slowly, away from the ramp.', 'Quiet position', null],
    ['Default', 'Aggressive', 'Experienced handlers only.', 'Box stall', null]], true), ticks, notes])));
  add(form, fillW(formSection('Declared value', null, [fieldRow([['Text', 'Default', 'Declared value (USD)', '$95,000', 'Used for insurance if you insure through us (1.5%).'], ['Select', 'Default', 'Stabled at', 'Đà Lạt, Lâm Đồng', null]])])));
  var foot = H({ name: 'Footer', gap: 12, main: 'MAX', cross: 'CENTER', pad: [20, 0, 0, 0] });
  borderSide(foot, 'border/default', 'top');
  addAll(foot, [btn('Ghost', 'MD', 'Cancel'), btn('Primary', 'MD', 'Save horse', { lead: 'check' })]);
  add(form, fillW(foot));
  var why = panel('Why we ask', { gap: 14 });
  add(why, Tx('Why we ask', 'Heading/H4'));
  [['Identity', 'Border posts read the microchip and match it to the passport.'], ['Size and weight', 'Height sets the stall width and the air position; weight sets the trailer’s load.'], ['Temperament', 'Decides the stall type and who stands next to whom.']].forEach(function (r) {
    var v = VV({ name: r[0], gap: 2, pad: [10, 0, 0, 0] });
    borderSide(v, 'border/default', 'top');
    addAll(v, [Tx(r[0], 'Label/S'), Tx(r[1], 'Body/S', 'text/secondary', { fill: true })]);
    add(why, fillW(v));
  });
  var later = panel('Documents come later', { gap: 6 });
  addAll(later, [Tx('Documents come later', 'Heading/H4'), Tx('We ask for the passport, tests and certificates per trip, checked against your travel dates. Nothing to upload now.', 'Body/S', 'text/secondary', { fill: true })]);
  return newCustomer(screen('First run · Add a horse', 'My horses', [pageHead('Add a horse', 'Your first horse. You can add more after saving.'), split(form, column([why, later]), SIDE.narrow)], { gap: 28 }));
}
async function eFirstRun() { return insertChainCall([scrFirstRequests, scrAddHorse], 'Request · 4 Review'); }
