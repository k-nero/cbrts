/* =====================================================================
   The travel pass as a page header, and a move's own route map.
   Once a request is approved the move has a pass (the landing introduces
   it), so every customer page about an approved move opens on it: the
   codes and stage, the route as the title, the facts that matter, and a
   stub that says the one thing that matters now. Pages before approval
   (in review, the quotation) keep the plain header: there is no pass yet.
   The route map is the landing's schematic map zoomed to one move:
   travelled road solid, road still to go dotted, a replaced plan dashed
   and faint, and the last confirmed position, never a guess.
   ===================================================================== */

/* the horses on a pass, as coat swatches */
var COAT041 = [['Shadowfax', 'coat/grey'], ['Nightfall', 'coat/black'], ['Copper King', 'coat/chestnut'], ['Silver Bell', 'coat/grey']];
function coatRow(horses, label) {
  var r = H({ name: 'Horses', gap: 8, cross: 'CENTER' });
  var sw = H({ name: 'Coats', gap: -4, cross: 'CENTER' });
  horses.forEach(function (h) { add(sw, F({ name: 'Coat · ' + h[0], w: 16, h: 16, radius: 999, fill: h[1], stroke: 'surface/card', sw: 2 })); });
  addAll(r, [sw, Tx(label, 'Label/M', 'text/primary')]);
  return r;
}
/* o: { back, codes: [..], chips: [..], from: [code, city], to: [code, city], mode, facts: [[label, value, mono] | [label, node]], stub: [label, value, sub, tone] } */
function passHead(o) {
  var wrap = VV({ name: 'Page header', gap: 14, pad: [HEAD_TOP.owner, 0, 0, 0] });
  if (o.back) add(wrap, btn('Ghost', 'SM', o.back === true ? 'My requests' : o.back, { lead: 'arrow-left' }));
  var pass = H({ name: 'Travel pass', radius: 16, fill: 'surface/card', stroke: 'border/default', clip: true });
  effect(pass, 'Elevation/1 Card');
  var main = VV({ name: 'Pass', gap: 18, pad: [22, 28, 24, 28] });
  var top = H({ name: 'Top', gap: 16, main: 'SPACE_BETWEEN', cross: 'CENTER' });
  var codes = H({ name: 'Codes', gap: 8, cross: 'CENTER' });
  o.codes.forEach(function (c, i) { if (i) add(codes, Tx('·', 'Body/S', 'text/tertiary')); add(codes, Tx(c, 'Mono/Caption', 'text/secondary', { name: 'Code' })); });
  var chips = H({ name: 'Status', gap: 10, cross: 'CENTER' });
  o.chips.forEach(function (c) { add(chips, c); });
  addAll(top, [codes, chips]);
  var end = function (c, align) { var v = VV({ name: c[1], gap: 2, cross: align }); addAll(v, [Tx(c[0], 'Mono/Caption', 'text/tertiary', { name: 'City code' }), Tx(c[1], 'Display/M', 'text/primary', { name: 'City' })]); return v; };
  var leg = H({ name: 'Leg', gap: 10, cross: 'CENTER', pad: [16, 0, 0, 0] });
  addAll(leg, [fillW(rect(20, 1, 'border/strong', 'Line')), Ic(o.mode === 'air' ? 'plane' : 'truck', 20, 'text/secondary'), fillW(rect(20, 1, 'border/strong', 'Line'))]);
  var route = H({ name: 'Title', gap: 20, cross: 'CENTER' });
  addAll(route, [end(o.from, 'MIN'), fillW(leg), end(o.to, 'MAX')]);
  var facts = H({ name: 'Facts', gap: 40, pad: [16, 0, 0, 0] });
  borderSide(facts, 'border/default', 'top');
  o.facts.forEach(function (f) {
    var c = VV({ name: f[0], gap: 4 });
    add(c, Tx(f[0], 'Body/S', 'text/tertiary'));
    add(c, typeof f[1] === 'string' ? Tx(f[1], f[2] ? 'Mono/Data' : 'Label/M', 'text/primary') : f[1]);
    add(facts, c);
  });
  addAll(main, [fillW(top), fillW(route), fillW(facts)]);
  var perf = VV({ name: 'Perforation', gap: 8, pad: [10, 0, 10, 0], w: 4, cross: 'CENTER', clip: true });
  /* the tear line must stay shorter than the pass, or its dots set the pass height */
  for (var k = 0; k < 14; k++) add(perf, dot(3, 'border/strong', 'Hole'));
  var stub = VV({ name: 'Stub', gap: 6, pad: [24, 24, 24, 24], w: 240, fill: 'bg/sunken', main: 'CENTER' });
  addAll(stub, [Tx(o.stub[0], 'Body/S', 'text/secondary', { name: 'Label' }), Tx(o.stub[1], 'Display/M', o.stub[3] || 'text/primary', { name: 'Value' }), Tx(o.stub[2], 'Mono/Caption', 'text/tertiary', { name: 'Sub', w: 192 })]);
  addAll(pass, [fillW(main), perf, stub]);
  perf.layoutSizingVertical = 'FILL'; stub.layoutSizingVertical = 'FILL';
  add(wrap, fillW(pass));
  return wrap;
}
/* CBRT-2026-041's pass: only the stub and the chips change from page to page */
function pass041(stub, chips, o) {
  o = o || {};
  return passHead({ back: o.back != null ? o.back : true, codes: o.codes || ['REQ-2026-0162', 'CBRT-2026-041'], chips: chips, from: ['HCM', 'Ho Chi Minh City'], to: ['PNH', 'Phnom Penh'],
    facts: [['Departs', '18 Oct · 06:00', true], ['Horses', coatRow(COAT041, '4 horses')], ['Border', 'Mộc Bài – Bavet'], ['Trailer', 'TX-447 · private', true], ['Arrival window', '11:00–14:00', true]], stub: stub });
}

/* ---------- a move's own route ----------
   bounds: [lon0, lon1, lat0, lat1]; paths: [{ pts: [[lon, lat]...], kind: 'done' | 'todo' | 'old' }];
   stops: [lon, lat, name, note, kind ('stop' | 'gate'), state ('done' | 'next' | 'old'), side ('r' | 'l' | 'a' | 'b')];
   at: [lon, lat, text] the last confirmed position; border: [[lon, lat]...] a faint national border (borders: several) */
function jobMap(o) {
  var w = o.w, h = o.h, pad = 56, b = o.bounds;
  var X = function (lon) { return Math.round(pad + (lon - b[0]) / (b[1] - b[0]) * (w - 2 * pad)); };
  var Y = function (lat) { return Math.round(pad + (b[3] - lat) / (b[3] - b[2]) * (h - 2 * pad)); };
  var m = F({ name: 'Route map', w: w, h: h, fill: 'bg/sunken', radius: 12, clip: true });
  var put = function (n, x, y) { m.appendChild(n); n.x = Math.round(x); n.y = Math.round(y); return n; };
  for (var gx = 64; gx < w; gx += 64) { var v = rect(1, h, 'border/default', 'Grid'); v.opacity = 0.5; put(v, gx, 0); }
  for (var gy = 64; gy < h; gy += 64) { var hz = rect(w, 1, 'border/default', 'Grid'); hz.opacity = 0.5; put(hz, 0, gy); }
  var line = function (pts) { return pts.map(function (p, i) { return (i ? 'L' : 'M') + X(p[0]) + ' ' + Y(p[1]); }).join(' '); };
  var layer = function (name, ds, token, weight, dash, opacity) {
    var svg = '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" fill="none" xmlns="http://www.w3.org/2000/svg">' + ds.map(function (d) { return '<path d="' + d + '" stroke="#000" stroke-width="2"/>'; }).join('') + '</svg>';
    var f = figma.createNodeFromSvg(svg); f.name = name; f.fills = [];
    f.findAll(function (n) { return n.type === 'VECTOR'; }).forEach(function (vv) { vv.strokes = [P(token)]; vv.strokeWeight = weight; vv.strokeCap = 'ROUND'; vv.strokeJoin = 'ROUND'; if (dash) vv.dashPattern = dash; });
    if (opacity != null) f.opacity = opacity;
    return put(f, 0, 0);
  };
  (o.borders || (o.border ? [o.border] : [])).forEach(function (bd) { layer('National border', [line(bd)], 'text/tertiary', 1, [2, 5], 0.8); });
  (o.areas || []).forEach(function (a) { var t = Tx(a[0], 'Mono/Eyebrow', 'text/tertiary', { name: 'Area · ' + a[0] }); put(t, X(a[1]) - t.width / 2, Y(a[2]) - t.height / 2); });
  var by = function (k) { return o.paths.filter(function (p) { return p.kind === k; }).map(function (p) { return line(p.pts); }); };
  if (by('old').length) layer('Replaced plan', by('old'), 'text/tertiary', 2, [6, 6], 0.9);
  if (by('todo').length) layer('Still to go', by('todo'), 'text/secondary', 3, [1, 8]);
  if (by('done').length) layer('Travelled', by('done'), 'text/primary', 4);
  o.stops.forEach(function (s) {
    var x = X(s[0]), y = Y(s[1]), old = s[5] === 'old';
    var mk;
    if (s[4] === 'gate') {
      mk = H({ name: 'Gate · ' + s[2], w: 22, h: 22, radius: 999, fill: 'surface/card', stroke: old ? 'border/strong' : 'text/primary', sw: 1.5, main: 'CENTER', cross: 'CENTER' });
      add(mk, Ic('flag', 12, old ? 'text/tertiary' : 'text/primary'));
      put(mk, x - 11, y - 11);
    } else {
      mk = dot(14, s[5] === 'done' ? 'text/primary' : 'surface/card', 'Stop · ' + s[2]);
      mk.strokes = [P(old ? 'border/strong' : 'text/primary')]; mk.strokeWeight = 3; mk.strokeAlign = 'INSIDE';
      put(mk, x - 7, y - 7);
    }
    /* a small map names only where the move starts and ends; the stop list beside it names the rest */
    if (o.w < 600 && s !== o.stops[0] && s[0] !== o.end) return;
    var lb = VV({ name: 'Label · ' + s[2], gap: 0, cross: s[6] === 'l' ? 'MAX' : (s[6] === 'a' || s[6] === 'b') ? 'CENTER' : 'MIN' });
    addAll(lb, [Tx(s[2], 'Label/S', old ? 'text/tertiary' : 'text/primary'), Tx(s[3], 'Mono/Caption', s[5] === 'next' ? 'status/info/fg' : 'text/tertiary')]);
    m.appendChild(lb);
    var side = s[6] || 'r';
    lb.x = Math.round(side === 'r' ? x + 16 : side === 'l' ? x - 16 - lb.width : x - lb.width / 2);
    lb.y = Math.round(side === 'a' ? y - 20 - lb.height : side === 'b' ? y + 18 : y - 16);
  });
  if (o.at) {
    var ax = X(o.at[0]), ay = Y(o.at[1]);
    var ring = dot(44, 'status/info/bg', 'Position · halo'); ring.opacity = 0.9; put(ring, ax - 22, ay - 22);
    var pin = H({ name: 'Position', w: 30, h: 30, radius: 999, fill: 'text/primary', main: 'CENTER', cross: 'CENTER' });
    add(pin, Ic('truck', 16, 'bg/canvas'));
    put(pin, ax - 15, ay - 15);
    var tag = H({ name: 'Last confirmed', gap: 8, pad: [6, 10, 6, 10], radius: 8, fill: 'surface/card', stroke: 'border/default', cross: 'CENTER' });
    addAll(tag, [dot(8, 'status/info/fg', 'Live'), Tx(o.at[2], 'Label/S', 'text/primary')]);
    m.appendChild(tag); tag.x = Math.round(ax - tag.width / 2); tag.y = Math.round(ay - 62);
  }
  return m;
}
/* the map legend: what each line means, in the same order as the map draws them */
function mapLegend(kinds) {
  var r = H({ name: 'Legend', gap: 24, cross: 'CENTER' });
  /* the samples are drawn from the same marks as the map: a solid bar, dots, dashes */
  var sample = function (k) {
    var sm = H({ name: 'Sample', gap: k === 'todo' ? 5 : 4, cross: 'CENTER', w: 28, h: 4 });
    if (k === 'done') add(sm, fillW(rect(28, 4, 'text/primary', 'Solid', 2)));
    else if (k === 'todo') { for (var i = 0; i < 4; i++) add(sm, dot(3, 'text/secondary', 'Dot')); }
    else { for (var j = 0; j < 3; j++) add(sm, rect(6, 2, 'text/tertiary', 'Dash')); }
    return sm;
  };
  [['done', 'Travelled'], ['todo', 'Still to go'], ['old', 'Replaced plan']].forEach(function (k) {
    if (kinds.indexOf(k[0]) < 0) return;
    var it = H({ name: k[1], gap: 8, cross: 'CENTER' });
    addAll(it, [sample(k[0]), Tx(k[1], 'Body/S', 'text/secondary')]);
    add(r, it);
  });
  return r;
}
/* CBRT-2026-041 on National Road 1: Phú Thọ, Mộc Bài – Bavet, the Svay Rieng welfare stop, Phnom Penh */
var MAP041 = {
  bounds: [104.6, 106.95, 10.65, 11.75],
  border: [[106.35, 11.75], [106.2, 11.42], [106.12, 11.08], [105.95, 10.88], [105.7, 10.65]],
  areas: [['VIETNAM', 106.55, 11.45], ['CAMBODIA', 105.35, 11.25]],
  road: [[106.66, 10.86], [106.12, 11.08], [105.8, 11.09], [105.3, 11.35], [104.92, 11.56]]
};
function map041(state, w, h) {
  var r = MAP041.road, done = { plan: 0, transit: 2, done: 5 }[state];
  var paths = [];
  if (done) paths.push({ pts: r.slice(0, done), kind: 'done' });
  if (done < r.length) paths.push({ pts: r.slice(Math.max(done - 1, 0)), kind: 'todo' });
  var st = function (i) { return state === 'done' || (state === 'transit' && i < 2) ? 'done' : (state === 'transit' && i === 2 ? 'next' : 'todo'); };
  var times = state === 'done' ? ['06:05', '08:34', '09:36', '12:41'] : state === 'transit' ? ['06:05 · departed', '08:34 · cleared', 'exp. 09:30', 'exp. 12:30'] : ['06:00', '08:30', '09:30', '12:30'];
  return jobMap({ w: w, h: h, end: 104.92, bounds: MAP041.bounds, border: MAP041.border, areas: MAP041.areas, paths: paths,
    stops: [[106.66, 10.86, 'Phú Thọ training centre', times[0], 'stop', st(0), 'b'], [106.12, 11.08, 'Mộc Bài – Bavet', times[1], 'gate', st(1), 'b'], [105.8, 11.09, 'Svay Rieng welfare stop', times[2], 'stop', st(2), 'b'], [104.92, 11.56, 'Phnom Penh Equestrian Centre', times[3], 'stop', st(3), 'a']],
    at: state === 'transit' ? [106.12, 11.08, 'Last confirmed 08:34'] : null });
}
