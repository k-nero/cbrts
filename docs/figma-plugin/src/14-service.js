/* =====================================================================
   Request wizard, step 2: Service. How the horses travel, the stalls each
   horse needs, extras and who insures them. Every option says what it
   does to the estimate (a range delta, "Included", or why it isn't
   available); the estimate card stays a range, never a price.
   ===================================================================== */
function svcSection(title, sub, content) {
  var v = VV({ name: title, gap: 12 });
  var h = VV({ name: 'Head', gap: 2 });
  add(h, Tx(title, 'Heading/H4'));
  if (sub) add(h, Tx(sub, 'Body/S', 'text/tertiary', { fill: true }));
  addAll(v, [fillW(h), fillW(content)]);
  return v;
}
/* opts: [state, title, description, meta, icon] */
function svcOptions(opts, single) {
  var r = H({ name: 'Options', gap: 16 });
  opts.forEach(function (o) {
    var c = inst(C.option, { State: o[0] });
    var m = { Title: o[1], Description: o[2], Meta: o[3] };
    if (o[4]) m.Icon = ICON[o[4]]; else m['Show icon'] = false;
    if (single) { m['Show checkbox'] = false; m['Show radio'] = true; }
    setP(c, m);
    if (o[0] === 'Disabled') c.opacity = 1;
    /* the meta line is words (Outfit) unless it is a figure such as a price delta (Mono); both at the secondary colour */
    var mt = c.findOne(function (n) { return n.type === 'TEXT' && n.name === 'Meta'; });
    var tone = o[0] === 'Disabled' ? 'status/warn/fg' : 'text/secondary';
    if (mt) restyle(mt, /^[+\u2212$\d-]/.test(o[3]) ? 'Mono/Caption' : 'Label/S', tone);
    c.name = 'Option · ' + o[1];
    add(r, fillW(c));
    /* cards in one row share a height, whatever their copy */
    c.layoutSizingVertical = 'FILL';
  });
  return r;
}
/* one line with its effect on the estimate at the right */
function effectRow(lead, title, sub, effect, effectTone) {
  var r = H({ name: title, gap: 14, pad: [14, 18, 14, 18], cross: 'CENTER' });
  borderSide(r, 'border/default', 'top');
  var t = VV({ name: 'Text', gap: 2 });
  add(t, Tx(title, 'Label/M'));
  if (sub) add(t, Tx(sub, 'Body/S', 'text/tertiary', { fill: true }));
  addAll(r, [lead, fillW(t), Tx(effect, 'Mono/Caption', effectTone || 'text/secondary', { align: 'RIGHT' })]);
  return r;
}
function scrRequest2() {
  var left = VV({ name: 'Step 2', gap: 28 });
  var intro = VV({ name: 'Intro', gap: 8 });
  addAll(intro, [Tx('How should they travel?', 'Heading/H3'), Tx('Each choice shows what it does to your estimate. The estimate stays a range; the itemised quotation comes after review.', 'Body/M', 'text/secondary', { fill: true })]);
  add(left, fillW(intro));
  add(left, fillW(svcSection('Mode', null, svcOptions([
    ['Selected', 'Road', 'Door to door by trailer · ~960 km · 2 border crossings.', 'In the estimate', 'truck'],
    ['Disabled', 'Air', 'No equine air service Ho Chi Minh City → Bangkok. The nearest goes via Hong Kong and takes 3 days longer.', 'Unavailable', 'plane']], true))));
  add(left, fillW(svcSection('Trailer', null, svcOptions([
    ['Selected', 'Shared load', 'Shares a trailer with other consignments on set departures.', 'In the estimate', null],
    ['Default', 'Private trailer', 'Your own trailer and your own departure time.', '+ $2,400 – $3,300', null]], true))));
  var stalls = panel('Stalls', { gap: 0, pad: 0, clip: true });
  var lk = function () { var w = H({ name: 'Lock', w: 28, h: 28, radius: 999, fill: 'surface/muted', main: 'CENTER', cross: 'CENTER' }); add(w, Ic('lock', 14, 'text/secondary')); return w; };
  var st = function (tok) { var w = H({ name: 'Stall', w: 28, h: 28, radius: 999, fill: 'surface/muted', main: 'CENTER', cross: 'CENTER' }); add(w, dot(10, tok, 'Swatch')); return w; };
  add(stalls, fillW(effectRow(st('stall/standard'), 'Shadowfax · standard stall', 'Calm, size M.', 'Included')));
  add(stalls, fillW(effectRow(lk(), 'Nightfall · climate-controlled stall', 'Required by her profile: heat-sensitive. It can’t be removed while she travels.', '+ $600 – $850 · in the estimate', 'text/primary')));
  stalls.children[0].strokeTopWeight = 0;
  add(left, fillW(svcSection('Stalls', 'Set by each horse’s profile, so there is nothing to choose.', stalls)));
  var extras = panel('Extras', { gap: 0, pad: 0, clip: true });
  var fixed = H({ name: 'Fixed', w: 28, h: 28, radius: 999, fill: 'status/ok/bg', main: 'CENTER', cross: 'CENTER' }); add(fixed, Ic('check', 14, 'status/ok/fg'));
  var vet = inst(C.checkbox, { Checked: 'False' }); setP(vet, { 'Show label': false });
  add(extras, fillW(effectRow(fixed, 'Grooms · 1', 'One groom per three horses, rounded up. Always included.', 'Included')));
  add(extras, fillW(effectRow(vet, 'Veterinary escort', 'A vet travels with the horses. We add one automatically from 8 horses or a declared value over $500,000.', '+ $1,800 – $2,400')));
  extras.children[0].strokeTopWeight = 0;
  add(left, fillW(svcSection('Extras', null, extras)));
  add(left, fillW(svcSection('Transit insurance', 'The horses must be insured for the journey plus 2 days.', svcOptions([
    ['Default', 'Through EquiFreight', '1.5% of the declared value ($325,000), on the quotation as its own line.', '+ $4,875', 'shield'],
    ['Selected', 'Your own policy', 'You upload it with your documents; it’s checked against your travel dates plus 2 days. No charge from us.', 'In the estimate', 'file']], true))));
  var foot = H({ name: 'Footer', gap: 24, main: 'SPACE_BETWEEN', cross: 'CENTER' });
  borderSide(foot, 'border/default', 'top');
  foot.paddingTop = 20;
  addAll(foot, [btn('Secondary', 'MD', 'Back', { lead: 'arrow-left' }), Tx('Road · shared load · 1 climate stall · your own insurance', 'Label/S', 'text/secondary', { fill: true, align: 'CENTER' }), btn('Primary', 'MD', 'Continue', { trail: 'arrow-right' })]);
  add(left, fillW(foot));
  return requestLayout('Request · 2 Service', ['Done', 'Current', 'Upcoming', 'Upcoming'], left, estimateCard('$11,300 – $16,100', '2', '1 per 3 horses → 1', '2', '~960 km'));
}
async function eService() {
  var out = await insertChainCall([scrRequest2], 'Request · 1 Horses');
  await insertChainCall([scrRequest3Window], 'Request · 3 Route & dates (error)');
  var rv = figma.currentPage.children.filter(function (n) { return n.name === 'Request · 4 Review'; })[0];
  var sum = rv && rv.findOne(function (n) { return n.type === 'FRAME' && n.name === 'Summary'; });
  var svc = sum && sum.children.filter(function (n) { return n.name === 'Service'; })[0];
  if (svc && !sum.children.some(function (n) { return n.name === 'Insurance'; })) {
    var row = svc.clone(); row.name = 'Insurance';
    sum.insertChild(sum.children.indexOf(svc) + 1, row);
    var t = row.children.filter(function (n) { return n.type === 'TEXT'; });
    t[0].characters = 'Insurance'; t[1].characters = 'Your own policy · upload it with your documents once the job is approved';
    out.reviewEdited = true;
  }
  return out;
}
