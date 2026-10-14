/* =====================================================================
   Horse profile (customer). The source every other screen reads: stall
   plans, quotations and document checks. The page shows what the horse
   needs, what she owes, the documents that stay with her, her trips, and
   what an edit would touch before it is saved.
   ===================================================================== */
var NF = HORSES[1];
/* the horse's coat band stands in for the title; the nameplate carries her name. With a photo, the band fades
   from her coat colour on the left into the picture, so the nameplate always sits on her colour. The photo is a
   flat placeholder named "Photo · <name>" that the picture is uploaded into (docs/design-assets/). After the upload,
   set the fill to CROP with PHOTO_CROP.band; the same picture goes on her My horses card's Coat band (over the coat
   colour, under its Shade) with PHOTO_CROP.card, which puts her head right of the nameplate. */
var PHOTO_CROP = { band: [[0.908, 0, 0], [0, 0.326, 0.195]], card: [[0.632, 0, 0], [0, 0.439, 0.143]], avatar: [[0.218, 0, 0.407], [0, 0.39, 0.156]] }; // avatar: the request wizard's horse pick
var COAT_HEX = { Grey: '#8E949B', Black: '#202329', Chestnut: '#7B3F1F', Bay: '#5B3522' };
function horseBand(h, o) {
  o = o || {};
  var band = H({ name: 'Coat', w: 1200, h: o.photo ? 240 : 132, pad: [0, 32, 28, 32], radius: 16, cross: 'MAX', fill: 'coat/' + h.coat.toLowerCase(), clip: true });
  if (o.photo) {
    var hex = COAT_HEX[h.coat];
    var ph = figma.createRectangle(); ph.name = 'Photo · ' + h.name; ph.fills = [P('coat/' + h.coat.toLowerCase())];
    var sc = figma.createRectangle(); sc.name = 'Scrim'; sc.fills = [gradient([[0, hex + 'FF'], [0.22, hex + 'CC'], [0.46, hex + '00']])];
    [ph, sc].forEach(function (r) { band.appendChild(r); r.layoutPositioning = 'ABSOLUTE'; r.x = 0; r.y = 0; r.resize(1200, 240); r.constraints = { horizontal: 'STRETCH', vertical: 'STRETCH' }; });
  }
  var plate = inst(C.nameplate);
  setP(plate, { Name: h.name, Subtitle: h.sub });
  add(band, plate);
  return band;
}
function horseHead(right) {
  return pageHeader({ back: 'My horses', banner: horseBand(NF, { photo: true }), code: NF.chip, summary: 'Thoroughbred · mare · 4 y · black', metaChips: NF.tags.map(function (t) { return chip(t[0], t[1]); }), right: [right] });
}
/* how ready she is to travel: a ring of documents cleared, and who holds the rest */
function readinessPanel(done, total, rest) {
  var p = panel('Ready to travel', { gap: 14 });
  add(p, Tx('Ready to travel?', 'Heading/H4'));
  var row = H({ name: 'Row', gap: 20, cross: 'CENTER' });
  var r = 38, c = 48, a = done / total * 2 * Math.PI;
  var ex = c + r * Math.sin(a), ey = c - r * Math.cos(a);
  var svg = '<svg width="96" height="96" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="48" cy="48" r="38" stroke="#000" stroke-width="8"/><path d="M48 10 A38 38 0 ' + (a > Math.PI ? 1 : 0) + ' 1 ' + ex.toFixed(2) + ' ' + ey.toFixed(2) + '" stroke="#000" stroke-width="8"/></svg>';
  var ring = figma.createNodeFromSvg(svg); ring.name = 'Ring'; ring.fills = [];
  var vs = ring.findAll(function (n) { return n.type === 'VECTOR' || n.type === 'ELLIPSE'; });
  vs.forEach(function (v, i) { v.strokes = [P(i === 0 ? 'surface/muted' : 'status/ok/fg')]; v.strokeWeight = 8; v.strokeCap = 'ROUND'; });
  var wrap = F({ name: 'Readiness', w: 96, h: 96 });
  wrap.appendChild(ring); ring.x = 0; ring.y = 0;
  var n = Tx(done + '/' + total, 'Mono/Data', 'text/primary', { name: 'Count' });
  wrap.appendChild(n); n.x = Math.round(48 - n.width / 2); n.y = Math.round(48 - n.height / 2);
  var t = VV({ name: 'Text', gap: 6 });
  add(t, Tx('Not yet: ' + (total - done) + ' of ' + total + ' documents to go', 'Label/M', 'text/primary', { fill: true }));
  rest.forEach(function (x) { add(t, Tx(x, 'Body/S', 'text/secondary', { fill: true })); });
  addAll(row, [wrap, fillW(t)]);
  add(p, fillW(row));
  return p;
}
/* facts: [label, value, mono] in a two-column grid */
function factGrid(facts) {
  var g = VV({ name: 'Facts', gap: 0 });
  for (var i = 0; i < facts.length; i += 2) {
    var r = H({ name: 'Row', gap: 32 });
    borderSide(r, 'border/default', 'top');
    [facts[i], facts[i + 1]].forEach(function (f) {
      if (!f) return;
      var c = VV({ name: f[0], gap: 2, pad: [10, 0, 10, 0] });
      addAll(c, [Tx(f[0], 'Body/S', 'text/tertiary'), Tx(f[1], f[2] ? 'Mono/Data' : 'Label/S', 'text/primary', { fill: true })]);
      add(r, fillW(c));
    });
    add(g, fillW(r));
  }
  return g;
}
/* docs: [name, tone, word, detail, usedOn] */
function docList(title, sub, docs, link) {
  var p = panel(title, { gap: 0, pad: [20, 24, 12, 24] });
  var h = VV({ name: 'Head', gap: 2, pad: [0, 0, 12, 0] });
  addAll(h, [Tx(title, 'Heading/H4'), Tx(sub, 'Body/S', 'text/tertiary', { fill: true })]);
  add(p, fillW(h));
  docs.forEach(function (d) {
    var r = H({ name: d[0], gap: 16, pad: [12, 0, 12, 0], cross: 'CENTER' });
    borderSide(r, 'border/default', 'top');
    var st = H({ name: 'Status col', w: 182 });
    add(st, chip(d[1], d[2], { noDot: d[1] === 'Neutral' }));
    var t = VV({ name: 'Text', gap: 2 });
    addAll(t, [Tx(d[0], 'Label/M'), Tx(d[3], 'Body/S', d[1] === 'Warn' ? 'status/warn/fg' : 'text/secondary', { fill: true })]);
    addAll(r, [st, fillW(t), link ? btn('Ghost', 'SM', 'Open', { trail: 'arrow-right' }) : Tx(d[4], 'Mono/Caption', 'text/tertiary', { w: 150, align: 'RIGHT' })]);
    add(p, fillW(r));
  });
  return p;
}
function tripsPanel() {
  var p = panel('Trips', { gap: 0, pad: [20, 24, 12, 24] });
  add(p, VV({ name: 'Title', pad: [0, 0, 10, 0] }, [Tx('Her trips', 'Heading/H4')]));
  [['CBRT-2026-041', 'Ho Chi Minh City → Phnom Penh', 'Departs 18 Oct', 'Documents', null],
   ['REQ-2026-0179', 'Phnom Penh → Hong Kong (Sha Tin)', 'Departs 20 Nov', 'Quotation', null],
   ['REQ-2026-0193', 'Ho Chi Minh City → Bangkok', 'Departs 30 Oct', 'Request', 'Overlaps: she’s in Phnom Penh from 18 Oct.']].forEach(function (t) {
    var r = VV({ name: t[0], gap: 6, pad: [12, 0, 12, 0] });
    borderSide(r, 'border/default', 'top');
    var top = H({ name: 'Head', gap: 8, main: 'SPACE_BETWEEN', cross: 'CENTER' });
    addAll(top, [Tx(t[0], 'Mono/Data', 'text/primary'), stageMark(t[3])]);
    addAll(r, [fillW(top), Tx(t[1], 'Label/S', 'text/primary'), Tx(t[2], 'Body/S', 'text/tertiary')]);
    if (t[4]) add(r, Tx(t[4], 'Body/S', 'status/warn/fg', { fill: true }));
    add(p, fillW(r));
  });
  add(p, VV({ name: 'Past', pad: [8, 0, 4, 0] }, [Tx('No past trips yet: this is her first move with EquiFreight.', 'Body/S', 'text/tertiary', { fill: true })]));
  return p;
}
function valuePanel() {
  var p = panel('Declared value', { gap: 6 });
  addAll(p, [Tx('Declared value', 'Heading/H4'), Tx(NF.value, 'Display/M'), Tx('Used for insurance on quotations: 1.5% when you insure through us.', 'Body/S', 'text/tertiary', { fill: true })]);
  return p;
}
function scrHorseProfile() {
  var owed = panel('She owes', { gap: 0, pad: 0, clip: true });
  var oh = H({ name: 'Head', pad: [16, 20, 12, 20] });
  add(oh, Tx('She owes 1 item', 'Heading/H4'));
  addAll(owed, [fillW(oh), owedItem('Upcoming', 'Upload a new EIA (Coggins) test', 'CBRT-2026-041 · Ho Chi Minh City → Phnom Penh', 'Her test will be 77 days old at departure; the limit is 60. A test sampled on 19 Aug or later passes.', 'Due in 8 days', '4 Oct 2026', 'Upload test result', 'upload')]);
  var needs = panel('Needs', { gap: 12 });
  addAll(needs, [Tx('What she needs to travel', 'Heading/H4'), fillW(factGrid([['Stall', 'Climate-controlled (heat-sensitive)'], ['Loading', 'Slow and gentle, away from ramp noise'], ['Size class', NF.size + ' in', true], ['Weight', NF.weight, true], ['Height', NF.height, true], ['Age', '4 years · born 2022', false]])),
    Tx('Handling notes: ' + NF.notes, 'Body/S', 'text/secondary', { fill: true }), Tx('Read by the load plan and by every quotation.', 'Body/S', 'text/tertiary', { fill: true })]);
  var keep = docList('Documents that stay with her', 'Checked once and reused on every trip while they remain valid.', [
    ['Equine passport', 'Ok', 'Cleared', 'Valid until 14 Mar 2029.', 'CBRT-041 · REQ-0179'],
    ['Influenza vaccination', 'Ok', 'Cleared', 'Booster given 2 Jul 2026.', 'CBRT-041'],
    ['Proof of ownership', 'Ok', 'Cleared', 'On file since 2 Sep 2026.', 'CBRT-041 · REQ-0179']]);
  var trip = docList('Trip documents', 'Issued for one trip against its dates; they open on that trip’s page.', [
    ['EIA (Coggins) test · CBRT-2026-041', 'Warn', 'Expires in transit', '77 days old at departure; a new test is due 4 Oct.'],
    ['Export health certificate · CBRT-2026-041', 'Neutral', 'Not issued yet', 'Issued 8–14 Oct by the vet authority.']], true);
  var left = column([owed, needs, keep, trip]);
  var s = screen('My horses · Nightfall', 'My horses', [horseHead(btn('Secondary', 'MD', 'Edit profile', { lead: 'pencil' })), split(left, column([readinessPanel(3, 5, ['EIA (Coggins) test: yours, due 4 Oct', 'Export health certificate: the vet authority, 8–14 Oct']), tripsPanel(), valuePanel()]), SIDE.narrow)], { gap: 28, asOf: '26 Sep 2026, 11:20' });
  return s;
}

/* ---------- editing: what a change touches, before it is saved ---------- */
function scrHorseEdit() {
  var form = panel('Edit', { gap: 18 });
  add(form, Tx('Edit her profile', 'Heading/H4'));
  var tags = VV({ name: 'Temperament', gap: 8 });
  var tr = H({ name: 'Tags', gap: 8, cross: 'CENTER' });
  addAll(tr, [chip('Warn', 'Nervous'), chip('Info', 'Climate stall'), chip('Warn', 'Kicks in the trailer')]);
  addAll(tags, [Tx('Temperament and needs', 'Label/S', 'text/primary'), tr, input('Text', 'Focus', 'Add a trait', 'Kicks in the trailer', 'Added. Traits shape the stall plan and who handles her.')]);
  add(form, fillW(tags));
  var notes = noteField('Handling notes', NF.notes + ' Kicks at the partition when the trailer stops; a padded partition settles her.', 'Shown to the escort and the fleet coordinator.');
  var box = notes.findOne(function (n) { return n.name === 'Control'; }); box.strokes = [P('border/strong')]; box.strokeWeight = 1;
  add(form, fillW(notes));
  var nums = H({ name: 'Numbers', gap: 16 });
  addAll(nums, [fillW(input('Text', 'Default', 'Weight', '478 kg', null)), fillW(input('Text', 'Default', 'Height', '16.0 hh', null)), fillW(input('Text', 'Default', 'Declared value', '$240,000', null))]);
  add(form, fillW(nums));
  var locked = panel('Locked', { gap: 10, fill: 'bg/sunken' });
  var lh = H({ name: 'Head', gap: 8, cross: 'CENTER' });
  addAll(lh, [Ic('lock', 16, 'text/secondary'), Tx('From her passport', 'Label/M')]);
  addAll(locked, [fillW(lh), fillW(factGrid([['Name', 'Nightfall'], ['Microchip', NF.chip, true], ['Sex', 'Mare'], ['Breed', 'Thoroughbred'], ['Date of birth', '14 Apr 2022', true], ['Coat', 'Black']])),
    Tx('These can’t be edited here. Ask Lan, transport specialist, to correct them against the passport.', 'Body/S', 'text/tertiary', { fill: true })]);
  var eff = panel('Before you save', { gap: 0, pad: [20, 24, 16, 24], stroke: 'border/strong' });
  eff.strokeWeight = 1.5;
  add(eff, VV({ name: 'Title', gap: 2, pad: [0, 0, 12, 0] }, [Tx('Before you save', 'Heading/H4'), Tx('Adding “Kicks in the trailer” touches 2 of her 3 trips.', 'Body/S', 'text/secondary')]));
  [['Warn', 'Re-check', 'CBRT-2026-041 · load plan', 'Needs a padded partition in stall 4. Khôi, fleet & route coordinator, re-checks the load plan.'],
   ['Warn', 'Review', 'REQ-2026-0179 · quotation Q-2026-0188 v2', 'Yến checks whether the air stall still fits. If the price changes you get v3; v2 stays valid until 30 Sep.'],
   ['Neutral', 'No change', 'REQ-2026-0193', 'Still in review; the new trait is read when it is quoted.']].forEach(function (e) {
    var r = H({ name: e[2], gap: 14, pad: [12, 0, 12, 0], cross: 'MIN' });
    borderSide(r, 'border/default', 'top');
    var st = H({ name: 'Status col', w: 122 });
    add(st, chip(e[0], e[1], { noDot: e[0] === 'Neutral' }));
    var t = VV({ name: 'Text', gap: 2 });
    addAll(t, [Tx(e[2], 'Mono/Caption', 'text/primary', { fill: true }), Tx(e[3], 'Body/S', 'text/secondary', { fill: true })]);
    addAll(r, [st, fillW(t)]);
    add(eff, fillW(r));
  });
  var acts = H({ name: 'Actions', gap: 12, pad: [8, 0, 0, 0] });
  addAll(acts, [btn('Primary', 'MD', 'Save and tell Khôi and Yến'), btn('Ghost', 'MD', 'Cancel')]);
  add(eff, fillW(acts));
  var s = screen('My horses · Nightfall · Edit', 'My horses', [horseHead(Tx('Editing · saved 11:32', 'Mono/Caption', 'text/tertiary')), split(column([form, locked]), column([eff, tripsPanel()]), SIDE.narrow)], { gap: 28, asOf: '26 Sep 2026, 11:40' });
  return s;
}
async function eHorse() { return insertChainCall([scrHorseProfile, scrHorseEdit], 'My horses'); }
