/* =====================================================================
   Components
   ===================================================================== */
var DOC_W = 1520;

function docBlock(parent, title, desc) {
  var b = VV({ name: title, gap: 20, pad: 40, w: DOC_W, radius: 16, fill: 'surface/card', stroke: 'border/default' });
  add(b, Tx(title, 'Display/M', 'text/primary', { name: 'Title' }));
  add(b, Tx(desc, 'Body/M', 'text/secondary', { name: 'Description', w: 900 }));
  add(parent, b);
  return b;
}

var TONE = {
  Neutral: { bg: 'surface/muted', border: 'border/strong', fg: 'text/secondary', dot: 'text/tertiary' },
  Ok: { bg: 'status/ok/bg', border: 'status/ok/border', fg: 'status/ok/fg', dot: 'status/ok/fg' },
  Warn: { bg: 'status/warn/bg', border: 'status/warn/border', fg: 'status/warn/fg', dot: 'status/warn/fg' },
  Bad: { bg: 'status/bad/bg', border: 'status/bad/border', fg: 'status/bad/fg', dot: 'status/bad/fg' },
  Info: { bg: 'status/info/bg', border: 'status/info/border', fg: 'status/info/fg', dot: 'status/info/fg' }
};
var BTN_FG = { Primary: 'accent/on', Secondary: 'text/primary', Ghost: 'text/secondary', Danger: 'status/bad/fg' };

/* ---------- Button ---------- */
function buildButton(parent) {
  var b = docBlock(parent, 'Button', 'Four variants × two sizes × three states. Gold Primary is the one action per view that moves the job forward; Danger is outlined, never filled, so it cannot be mistaken for the primary action. Properties: Label, Show leading icon, Leading icon, Show trailing icon, Trailing icon.');
  var comps = [];
  ['Primary', 'Secondary', 'Ghost', 'Danger'].forEach(function (v) {
    ['MD', 'SM'].forEach(function (size) {
      ['Default', 'Hover', 'Disabled'].forEach(function (st) {
        var md = size === 'MD';
        var c = F({ component: true, name: 'Variant=' + v + ', Size=' + size + ', State=' + st, dir: 'H', gap: 8, pad: [0, md ? 18 : 12, 0, md ? 18 : 12], main: 'CENTER', cross: 'CENTER', h: md ? 40 : 32, radius: 8 });
        var fg = BTN_FG[v], fillT = null, strokeT = null;
        if (v === 'Primary') fillT = st === 'Hover' ? 'accent/hover' : 'accent/default';
        if (v === 'Secondary') { strokeT = 'border/strong'; if (st === 'Hover') fillT = 'surface/muted'; }
        if (v === 'Ghost' && st === 'Hover') { fillT = 'surface/muted'; fg = 'text/primary'; }
        if (v === 'Danger') { strokeT = 'status/bad/border'; if (st === 'Hover') fillT = 'status/bad/bg'; }
        c.fills = fillT ? [P(fillT)] : [];
        if (strokeT) strokeOf(c, strokeT);
        if (st === 'Disabled') c.opacity = 0.45;
        var lead = Ic('plus', md ? 16 : 14, fg); lead.name = 'Leading icon';
        var trail = Ic('arrow-right', md ? 16 : 14, fg); trail.name = 'Trailing icon';
        addAll(c, [lead, Tx('Button', md ? 'Label/M' : 'Label/S', fg, { name: 'Label' }), trail]);
        comps.push(c);
      });
    });
  });
  var set = combine(comps, b, 'Button', 'Primary = the single forward action on a view. Secondary = alternatives. Ghost = tertiary, inline. Danger = destructive, always outlined.');
  wireText(set, ['Label']);
  wire(set, 'Show leading icon', 'BOOLEAN', false, 'Leading icon', 'visible');
  wire(set, 'Leading icon', 'INSTANCE_SWAP', ICON['plus'].id, 'Leading icon', 'mainComponent');
  wire(set, 'Show trailing icon', 'BOOLEAN', false, 'Trailing icon', 'visible');
  wire(set, 'Trailing icon', 'INSTANCE_SWAP', ICON['arrow-right'].id, 'Trailing icon', 'mainComponent');
  C.button = set;
}
function btn(variant, size, label, o) {
  o = o || {};
  var b = inst(C.button, { Variant: variant, Size: size, State: o.state || 'Default' });
  var m = { Label: label };
  if (o.lead) { m['Show leading icon'] = true; m['Leading icon'] = ICON[o.lead]; }
  if (o.trail) { m['Show trailing icon'] = true; m['Trailing icon'] = ICON[o.trail]; }
  setP(b, m);
  var fg = BTN_FG[variant];
  // Swapped instances may take the new component's layer name, so find the icons by position.
  if (o.lead) tint(b.children[0], fg);
  if (o.trail) tint(b.children[b.children.length - 1], fg);
  b.name = 'Button · ' + label;
  if (o.fill) fillW(b);
  return b;
}

/* ---------- Chip ---------- */
function buildChip(parent) {
  var b = docBlock(parent, 'Chip', 'Status is always said twice: a tone and a word. Ok = cleared / GREEN, Warn = expires in transit / AMBER, Bad = fails its rule / RED, Info = awaiting review, Neutral = required or informational. There is no gold chip: gold is not a status.');
  var comps = Object.keys(TONE).map(function (t) {
    var tn = TONE[t];
    var c = F({ component: true, name: 'Tone=' + t, dir: 'H', gap: 6, pad: [5, 9, 5, 9], cross: 'CENTER', radius: 999, fill: tn.bg, stroke: tn.border });
    addAll(c, [dot(6, tn.dot, 'Dot'), Tx('Status', 'Mono/Chip', tn.fg, { name: 'Label' })]);
    return c;
  });
  var set = combine(comps, b, 'Chip');
  wireText(set, ['Label']);
  wire(set, 'Show dot', 'BOOLEAN', true, 'Dot', 'visible');
  C.chip = set;
}
function chip(tone, label, o) {
  var c = inst(C.chip, { Tone: tone });
  setP(c, { Label: label });
  if (o && o.noDot) setP(c, { 'Show dot': false });
  c.name = 'Chip · ' + label;
  return c;
}

/* ---------- Input ---------- */
function buildInput(parent) {
  var b = docBlock(parent, 'Input field', 'Text, select, date and password controls in four states. Password carries a show/hide eye at the end of the control. Errors name the rule and the fix ("The earliest departure is 17 Oct 2026"), never just "invalid". Properties: Label, Value, Helper text, Show helper.');
  var comps = [];
  ['Text', 'Select', 'Date', 'Password'].forEach(function (type) {
    ['Default', 'Focus', 'Error', 'Disabled'].forEach(function (st) {
      var c = VV({ component: true, name: 'Type=' + type + ', State=' + st, gap: 8, w: 320 });
      add(c, Tx('Label', 'Label/S', 'text/secondary', { name: 'Label' }));
      var box = H({ name: 'Control', gap: 8, pad: [0, 12, 0, 12], h: 44, cross: 'CENTER', fill: 'bg/input', stroke: st === 'Focus' ? 'accent/default' : st === 'Error' ? 'status/bad/fg' : 'border/strong', sw: st === 'Focus' ? 1.5 : 1, radius: 8 });
      if (st === 'Focus') effect(box, 'Focus/Ring');
      add(box, Tx('Value', 'Body/M', 'text/primary', { name: 'Value', fill: true }));
      if (type !== 'Text') add(box, Ic({ Select: 'chevron-down', Date: 'calendar', Password: 'eye' }[type], 18, 'text/tertiary'));
      add(c, fillW(box));
      var help = H({ name: 'Helper', gap: 6, cross: 'MIN' });
      if (st === 'Error') add(help, Ic('alert', 14, 'status/bad/fg'));
      add(help, Tx('Helper text', 'Body/S', st === 'Error' ? 'status/bad/fg' : 'text/tertiary', { name: 'Helper text', fill: true }));
      add(c, fillW(help));
      if (st === 'Disabled') c.opacity = 0.5;
      comps.push(c);
    });
  });
  var set = combine(comps, b, 'Input field');
  wireText(set, ['Label', 'Value', 'Helper text']);
  wire(set, 'Show helper', 'BOOLEAN', true, 'Helper', 'visible');
  C.input = set;
}
function input(type, state, label, value, helper, o) {
  var i = inst(C.input, { Type: type, State: state });
  var m = { Label: label, Value: value };
  if (helper) m['Helper text'] = helper; else m['Show helper'] = false;
  setP(i, m);
  i.name = 'Input · ' + label;
  if (o && o.fill) fillW(i);
  return i;
}

/* ---------- Checkbox ---------- */
function buildCheckbox(parent) {
  var b = docBlock(parent, 'Checkbox', 'Used for multi-select lists and as the indicator inside Option card. Checked is a strong neutral box on every surface: gold stays for the one action, green for facts that are done. Properties: Label, Show label.');
  var comps = ['True', 'False'].map(function (ch) {
    var on = ch === 'True';
    var c = H({ component: true, name: 'Checked=' + ch, gap: 10, cross: 'CENTER' });
    var box = H({ name: 'Box', w: 18, h: 18, radius: 4, main: 'CENTER', cross: 'CENTER', fill: on ? 'text/primary' : 'bg/input', stroke: on ? 'text/primary' : 'border/strong' });
    if (on) add(box, Ic('check', 14, 'bg/canvas'));
    addAll(c, [box, Tx('Checkbox label', 'Body/M', 'text/primary', { name: 'Label' })]);
    return c;
  });
  var set = combine(comps, b, 'Checkbox');
  wireText(set, ['Label']);
  wire(set, 'Show label', 'BOOLEAN', true, 'Label', 'visible');
  C.checkbox = set;
}

/* ---------- Option card ---------- */
function buildOptionCard(parent) {
  var b = docBlock(parent, 'Option card', 'Large selectable target. Multi-select cards (horses on a request) show a checkbox; single-choice cards (mode, outcome, topic, temperament) set Show radio and hide the checkbox. Selected is a strong neutral border and mark, never gold. Disabled cards stay readable and carry the reason.');
  var comps = ['Default', 'Selected', 'Disabled'].map(function (st) {
    var sel = st === 'Selected';
    var c = VV({ component: true, name: 'State=' + st, gap: 10, pad: 20, w: 320, radius: 12, fill: sel ? 'surface/raised' : 'surface/card', stroke: sel ? 'text/secondary' : 'border/default', sw: sel ? 1.5 : 1 });
    var top = H({ name: 'Top', main: 'SPACE_BETWEEN', cross: 'CENTER' });
    var badge = H({ name: 'Icon badge', w: 36, h: 36, radius: 8, fill: 'surface/muted', main: 'CENTER', cross: 'CENTER' });
    add(badge, Ic('truck', 20, 'text/secondary'));
    var ind = inst(C.checkbox, { Checked: sel ? 'True' : 'False' });
    setP(ind, { 'Show label': false });
    ind.name = 'Indicator';
    /* single-choice cards show a radio instead of the checkbox */
    var radio = H({ name: 'Radio', w: 20, h: 20, radius: 999, main: 'CENTER', cross: 'CENTER', fill: 'bg/input', stroke: sel ? 'text/primary' : 'border/strong', sw: sel ? 1.5 : 1 });
    if (sel) add(radio, dot(10, 'text/primary', 'Dot'));
    radio.visible = false;
    var mark = H({ name: 'Mark', gap: 0, cross: 'CENTER' });
    addAll(mark, [ind, radio]);
    addAll(top, [badge, mark]);
    add(c, fillW(top));
    add(c, Tx('Option title', 'Heading/H4', 'text/primary', { name: 'Title' }));
    add(c, Tx('A short description of this option.', 'Body/S', 'text/tertiary', { name: 'Description', fill: true }));
    add(c, Tx('Meta', 'Mono/Caption', st === 'Disabled' ? 'status/warn/fg' : 'text/tertiary', { name: 'Meta', fill: true }));
    if (st === 'Disabled') c.opacity = 0.55;
    return c;
  });
  var set = combine(comps, b, 'Option card');
  wireText(set, ['Title', 'Description', 'Meta']);
  wire(set, 'Show icon', 'BOOLEAN', true, 'Icon badge', 'visible');
  wire(set, 'Icon', 'INSTANCE_SWAP', ICON['truck'].id, 'Icon', 'mainComponent');
  wire(set, 'Show checkbox', 'BOOLEAN', true, 'Indicator', 'visible');
  wire(set, 'Show radio', 'BOOLEAN', false, 'Radio', 'visible');
  C.option = set;
}

/* ---------- Navigation: nav item, tab, step ---------- */
function buildNavigation(parent) {
  var b = docBlock(parent, 'Navigation', 'Nav item (app header), Tab (in-page views), Step (request wizard) and Eyebrow (role marker above every page title: gold dot = owner portal, blue dot = operations).');

  var nav = ['Default', 'Active'].map(function (st) {
    var on = st === 'Active';
    var c = H({ component: true, name: 'State=' + st, pad: [8, 12, 8, 12], radius: 8, cross: 'CENTER', fill: on ? 'surface/muted' : null });
    add(c, Tx('Nav item', 'Label/S', on ? 'accent/text' : 'text/secondary', { name: 'Label' }));
    return c;
  });
  C.nav = combine(nav, b, 'Nav item');
  wireText(C.nav, ['Label']);

  var tabs = ['Default', 'Active'].map(function (st) {
    var on = st === 'Active';
    var c = VV({ component: true, name: 'State=' + st, gap: 12, pad: [12, 4, 0, 4] });
    add(c, Tx('Tab', 'Label/M', on ? 'text/primary' : 'text/tertiary', { name: 'Label' }));
    var line = rect(40, 2, on ? 'accent/default' : null, 'Indicator');
    add(c, fillW(line));
    return c;
  });
  C.tab = combine(tabs, b, 'Tab');
  wireText(C.tab, ['Label']);

  var steps = ['Upcoming', 'Current', 'Done'].map(function (st) {
    var cur = st === 'Current', done = st === 'Done';
    var c = H({ component: true, name: 'State=' + st, gap: 10, cross: 'CENTER' });
    var badge = H({ name: 'Badge', w: 28, h: 28, radius: 8, main: 'CENTER', cross: 'CENTER', fill: cur ? 'accent/default' : done ? 'status/ok/bg' : null, stroke: cur ? null : done ? 'status/ok/border' : 'border/strong' });
    var n = Tx('1', 'Mono/Data', cur ? 'accent/on' : 'text/tertiary', { name: 'Number' });
    var chk = Ic('check', 16, 'status/ok/fg'); chk.name = 'Check';
    if (done) n.visible = false; else chk.visible = false;
    addAll(badge, [n, chk]);
    addAll(c, [badge, Tx('Step', 'Label/S', cur ? 'text/primary' : done ? 'text/secondary' : 'text/tertiary', { name: 'Label' })]);
    return c;
  });
  C.step = combine(steps, b, 'Step');
  wireText(C.step, ['Number', 'Label']);
}
function stepI(state, n, label) { var s = inst(C.step, { State: state }); setP(s, { Number: String(n), Label: label }); s.name = 'Step ' + n; return s; }

/* ---------- Data display: stat tile, progress, callout, toast ---------- */
function buildDataDisplay(parent) {
  var b = docBlock(parent, 'Feedback & data', 'Stat tile for summary counts (only where the counts are the point of the view), Progress for readiness and payload, Callout for inline rules and refusals, Toast for confirmations.');
  var toneFg = { Neutral: 'text/primary', Ok: 'status/ok/fg', Warn: 'status/warn/fg', Bad: 'status/bad/fg', Info: 'status/info/fg' };
  var barFg = { Neutral: 'text/tertiary', Ok: 'status/ok/fg', Warn: 'status/warn/fg', Bad: 'status/bad/fg' };

  var tiles = Object.keys(toneFg).map(function (t) {
    var c = VV({ component: true, name: 'Tone=' + t, gap: 4, pad: [14, 18, 14, 18], w: 168, radius: 12, fill: 'surface/card', stroke: 'border/default' });
    addAll(c, [Tx('00', 'Mono/Data L', toneFg[t], { name: 'Value' }), Tx('Label', 'Body/S', 'text/tertiary', { name: 'Label', fill: true })]);
    return c;
  });
  C.stat = combine(tiles, b, 'Stat tile');
  wireText(C.stat, ['Value', 'Label']);

  var prog = [];
  Object.keys(barFg).forEach(function (t) {
    [0, 20, 40, 60, 80, 100].forEach(function (v) {
      var c = F({ component: true, name: 'Tone=' + t + ', Value=' + v, w: 240, h: 6, radius: 999, fill: 'surface/muted', clip: true });
      var bar = rect(240 * v / 100, 6, barFg[t], 'Fill', 999);
      bar.constraints = { horizontal: 'SCALE', vertical: 'STRETCH' };
      if (v === 0) bar.visible = false;
      c.appendChild(bar);
      prog.push(c);
    });
  });
  C.progress = combine(prog, b, 'Progress');

  var icons = { Info: 'info', Ok: 'check', Warn: 'alert', Bad: 'alert' };
  var callouts = Object.keys(icons).map(function (t) {
    var tn = TONE[t];
    var c = H({ component: true, name: 'Tone=' + t, gap: 12, pad: 16, w: 560, radius: 8, fill: tn.bg, stroke: tn.border });
    var txt = VV({ name: 'Text', gap: 2 });
    addAll(txt, [Tx('Title', 'Label/M', 'text/primary', { name: 'Title', fill: true }), Tx('Body text', 'Body/S', 'text/secondary', { name: 'Body', fill: true })]);
    addAll(c, [Ic(icons[t], 18, tn.fg), fillW(txt)]);
    return c;
  });
  C.callout = combine(callouts, b, 'Callout');
  wireText(C.callout, ['Title', 'Body']);

  var toasts = ['Ok', 'Bad'].map(function (t) {
    var c = H({ component: true, name: 'Tone=' + t, gap: 10, pad: [12, 16, 12, 16], cross: 'CENTER', radius: 8, fill: 'surface/raised', stroke: 'border/strong' });
    effect(c, 'Elevation/2 Overlay');
    addAll(c, [Ic(t === 'Ok' ? 'check' : 'alert', 18, TONE[t].fg), Tx('Message', 'Body/S', 'text/primary', { name: 'Message' })]);
    return c;
  });
  C.toast = combine(toasts, b, 'Toast');
  wireText(C.toast, ['Message']);
}
function stat(tone, value, label) { var s = inst(C.stat, { Tone: tone }); setP(s, { Value: value, Label: label }); s.name = 'Stat · ' + label; return s; }
function progress(tone, value) { var p = inst(C.progress, { Tone: tone, Value: String(value) }); p.name = 'Progress'; return fillW(p); }
function callout(tone, title, body) { var c = inst(C.callout, { Tone: tone }); setP(c, { Title: title, Body: body }); c.name = 'Callout · ' + title; return fillW(c); }

/* ---------- Brass nameplate ---------- */
function buildNameplate(parent) {
  var b = docBlock(parent, 'Nameplate', 'The horse\'s identity mark: an engraved brass stall plate on the horse\'s coat colour. Replaces stock photography, which the draft got wrong (a samosa photo, a broken image). Properties: Name, Subtitle.');
  var c = H({ component: true, name: 'Nameplate', gap: 12, pad: [10, 14, 10, 14], cross: 'CENTER', radius: 4 });
  c.fills = [gradient([[0, '#EAD08C'], [0.55, '#C9AA5A'], [1, '#9C7C33']])];
  effect(c, 'Material/Brass');
  var mid = VV({ name: 'Engraving', gap: 1 });
  addAll(mid, [Tx('Shadowfax', 'Heading/H3', 'material/brass-ink', { name: 'Name' }), Tx('Andalusian · Gelding', 'Mono/Eyebrow', 'material/brass-ink', { name: 'Subtitle', opacity: 0.72 })]);
  addAll(c, [dot(7, 'material/brass-dark', 'Screw'), mid, dot(7, 'material/brass-dark', 'Screw')]);
  single(c, b);
  wireText(c, ['Name', 'Subtitle']);
  C.nameplate = c;
}

/* ---------- Horse card ---------- */
var CARD_W = 384;
function buildHorseCard(parent) {
  var b = docBlock(parent, 'Horse card', 'Owner-facing horse profile. Coat is a variant; everything else is a property. Facts use mono tabular figures; the readiness bar shows how many documents for the active job are cleared.');
  var comps = ['Grey', 'Black', 'Chestnut', 'Bay'].map(function (coat) {
    var c = VV({ component: true, name: 'Coat=' + coat, w: CARD_W, radius: 12, fill: 'surface/card', stroke: 'border/default', clip: true });
    var hdr = F({ name: 'Coat', w: CARD_W, h: 148, fill: 'coat/' + coat.toLowerCase() });
    var shade = figma.createRectangle();
    shade.name = 'Shade'; shade.resize(CARD_W, 148);
    shade.fills = [gradient([[0, '#00000000'], [1, '#00000073']], true)];
    shade.constraints = { horizontal: 'STRETCH', vertical: 'STRETCH' };
    hdr.appendChild(shade);
    var plate = expose(inst(C.nameplate));
    plate.name = 'Nameplate';
    hdr.appendChild(plate);
    plate.x = 20; plate.y = 148 - 20 - plate.height;
    plate.constraints = { horizontal: 'MIN', vertical: 'MAX' };
    var coatLbl = Tx(coat, 'Mono/Eyebrow', 'text/primary', { name: 'Coat label', opacity: 0.8 });
    coatLbl.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    hdr.appendChild(coatLbl);
    coatLbl.x = CARD_W - 20 - coatLbl.width; coatLbl.y = 18;
    coatLbl.constraints = { horizontal: 'MAX', vertical: 'MIN' };
    add(c, fillW(hdr));

    var body = VV({ name: 'Body', gap: 16, pad: 20 });
    var tags = H({ name: 'Tags', gap: 6 });
    var t1 = expose(inst(C.chip, { Tone: 'Ok' })); t1.name = 'Tag 1'; setP(t1, { Label: 'Calm' });
    var t2 = expose(inst(C.chip, { Tone: 'Info' })); t2.name = 'Tag 2'; setP(t2, { Label: 'Climate stall' });
    addAll(tags, [t1, t2]);
    add(body, tags);

    var facts = H({ name: 'Facts', gap: 8 });
    [['Age', '7 y', 'Age'], ['Height', '16.2 hh', 'Height'], ['Weight', '510 kg', 'Weight'], ['Size', 'M · 32', 'Size · in']].forEach(function (f) {
      var cell = VV({ name: f[0] + ' cell', gap: 4, pad: [10, 10, 10, 10], radius: 8, fill: 'bg/sunken' });
      addAll(cell, [Tx(f[2], 'Body/S', 'text/tertiary', { name: 'Fact label', fill: true }), Tx(f[1], 'Mono/Data', 'text/primary', { name: f[0], fill: true })]);
      add(facts, fillW(cell));
    });
    add(body, fillW(facts));

    var ids = H({ name: 'Identity', gap: 24 });
    [['Microchip', '250 259 600 123 456'], ['Declared value', '$85,000']].forEach(function (f) {
      var col = VV({ name: f[0] + ' col', gap: 4 });
      addAll(col, [Tx(f[0], 'Body/S', 'text/tertiary', { name: 'Fact label' }), Tx(f[1], 'Mono/Caption', 'text/secondary', { name: f[0] })]);
      add(ids, col);
    });
    add(body, ids);
    add(body, Tx('Annual vaccinations up to date. No known allergies. Loads best in a quiet yard.', 'Body/S', 'text/secondary', { name: 'Notes', fill: true }));

    var ready = VV({ name: 'Readiness block', gap: 8 });
    var rrow = H({ name: 'Readiness row', main: 'SPACE_BETWEEN', cross: 'CENTER' });
    addAll(rrow, [Tx('Documents · CBRT-2026-041', 'Mono/Caption', 'text/tertiary', { name: 'Readiness label' }), Tx('3 of 5 cleared', 'Mono/Caption', 'text/primary', { name: 'Readiness' })]);
    add(ready, fillW(rrow));
    var bar = expose(progress('Neutral', 60)); bar.name = 'Readiness bar';
    add(ready, bar);
    add(body, fillW(ready));
    add(body, divider());
    var actions = H({ name: 'Actions', gap: 8 });
    addAll(actions, [btn('Secondary', 'SM', 'Edit profile', { lead: 'pencil', fill: true }), btn('Danger', 'SM', 'Remove')]);
    add(body, fillW(actions));
    add(c, fillW(body));
    return c;
  });
  var set = combine(comps, b, 'Horse card');
  wireText(set, ['Age', 'Height', 'Weight', 'Size', 'Microchip', 'Declared value', 'Notes', 'Readiness label', 'Readiness']);
  wire(set, 'Show tag 2', 'BOOLEAN', true, 'Tag 2', 'visible');
  C.horse = set;
}

/* ---------- Stall tile ---------- */
var STALL = {
  Standard: { tok: 'stall/standard', icon: 'stall' },
  Box: { tok: 'stall/box', icon: 'box' },
  Climate: { tok: 'stall/climate', icon: 'snowflake' }
};
function buildStall(parent) {
  var b = docBlock(parent, 'Stall tile', 'One trailer or air-stall position. Type is shown by colour and label; Conflict names the broken rule in words. Target is the drop state while a horse is selected. Properties: Stall, Horse, Meta, Issue.');
  var comps = [];
  Object.keys(STALL).forEach(function (type) {
    ['Empty', 'Occupied', 'Conflict', 'Target'].forEach(function (st) {
      var s = STALL[type];
      var occ = st === 'Occupied' || st === 'Conflict';
      var c = VV({ component: true, name: 'Type=' + type + ', State=' + st, gap: 10, pad: 14, w: 280, h: 128, radius: 8,
        fill: st === 'Empty' ? null : st === 'Target' ? 'accent/soft' : 'surface/raised',
        stroke: st === 'Conflict' ? 'status/bad/fg' : st === 'Target' ? 'accent/default' : s.tok,
        sw: occ ? 1.5 : 1.25, dash: (st === 'Empty' || st === 'Target') ? [6, 4] : null });
      var head = H({ name: 'Head', main: 'SPACE_BETWEEN', cross: 'CENTER' });
      var tag = H({ name: 'Type tag', gap: 6, cross: 'CENTER' });
      addAll(tag, [Ic(s.icon, 14, s.tok), Tx(type, 'Mono/Chip', 'text/secondary', { name: 'Type' })]);
      addAll(head, [Tx('Stall 1', 'Mono/Chip', 'text/tertiary', { name: 'Stall' }), tag]);
      add(c, fillW(head));
      if (st === 'Empty') add(c, Tx('Drop a horse here', 'Body/S', 'text/tertiary', { name: 'Hint' }));
      if (st === 'Target') add(c, Tx('Place Silver Bell here', 'Label/S', 'accent/text', { name: 'Target hint' }));
      if (occ) {
        var who = VV({ name: 'Occupant', gap: 2 });
        addAll(who, [Tx('Shadowfax', 'Heading/H4', 'text/primary', { name: 'Horse' }), Tx('Gelding · 510 kg · Calm', 'Mono/Caption', 'text/tertiary', { name: 'Meta' })]);
        add(c, who);
      }
      if (st === 'Conflict') {
        var issue = H({ name: 'Issue row', gap: 6, cross: 'CENTER' });
        addAll(issue, [Ic('alert', 14, 'status/bad/fg'), Tx('Needs a box stall', 'Body/S', 'status/bad/fg', { name: 'Issue' })]);
        add(c, issue);
      }
      comps.push(c);
    });
  });
  var set = combine(comps, b, 'Stall tile');
  wireText(set, ['Stall', 'Horse', 'Meta', 'Issue']);
  C.stall = set;
}
function stallI(type, state, n, o) {
  o = o || {};
  var s = inst(C.stall, { Type: type, State: state });
  var m = { Stall: 'Stall ' + n };
  if (o.horse) m.Horse = o.horse;
  if (o.meta) m.Meta = o.meta;
  if (o.issue) m.Issue = o.issue;
  if (o.target) m['Target hint'] = o.target;
  setP(s, m);
  s.name = 'Stall ' + n;
  return fillW(s);
}

/* ---------- Load item ---------- */
function buildLoadItem(parent) {
  var b = docBlock(parent, 'Load item', 'A horse waiting to be placed on the load plan. Drag it, or select it and choose a stall (keyboard path).');
  var comps = ['Default', 'Selected'].map(function (st) {
    var sel = st === 'Selected';
    var c = VV({ component: true, name: 'State=' + st, gap: 8, pad: [14, 16, 14, 16], w: 300, radius: 8, fill: sel ? 'surface/raised' : 'surface/card', stroke: sel ? 'accent/default' : 'border/default', sw: sel ? 1.5 : 1 });
    var top = H({ name: 'Top', gap: 10, cross: 'CENTER' });
    var t = expose(inst(C.chip, { Tone: 'Ok' })); t.name = 'Tag'; setP(t, { Label: 'Calm' });
    addAll(top, [Ic('grip', 16, 'text/tertiary'), Tx('Silver Bell', 'Heading/H4', 'text/primary', { name: 'Horse', fill: true }), t]);
    add(c, fillW(top));
    add(c, Tx('Mare · 445 kg · Lipizzan', 'Mono/Caption', 'text/tertiary', { name: 'Meta' }));
    return c;
  });
  C.loadItem = combine(comps, b, 'Load item');
  wireText(C.loadItem, ['Horse', 'Meta']);
}

/* ---------- Document row ---------- */
var DOC_STATUS = {
  Cleared: { tone: 'Ok', label: 'Cleared', result: 'text/secondary' },
  Review: { tone: 'Info', label: 'In review', result: 'text/secondary' },
  Amber: { tone: 'Warn', label: 'Expires in transit', result: 'status/warn/fg' },
  Red: { tone: 'Bad', label: 'Fails rule', result: 'status/bad/fg' },
  Required: { tone: 'Neutral', label: 'Required', result: 'text/tertiary' }
};
function buildDocRow(parent) {
  var b = docBlock(parent, 'Document row', 'One checklist item (per horse × document type, or per shipment). The validity rule is evaluated against the travel dates, never against today: GREEN counts toward the gate only once a specialist approves it; AMBER never counts. Properties: Document, Rule, Version; Result is overridden per row.');
  var comps = Object.keys(DOC_STATUS).map(function (k) {
    var s = DOC_STATUS[k];
    var c = H({ component: true, name: 'Status=' + k, gap: 16, pad: [14, 20, 14, 20], cross: 'CENTER', w: 1100, fill: 'surface/card' });
    borderSide(c, 'border/default', 'bottom');
    var sc = H({ name: 'Status col', w: 160 });
    var ch = inst(C.chip, { Tone: s.tone }); ch.name = 'Status'; setP(ch, { Label: s.label });
    add(sc, ch);
    var info = VV({ name: 'Info', gap: 3 });
    addAll(info, [
      Tx('Equine passport', 'Label/M', 'text/primary', { name: 'Document', fill: true }),
      Tx('Valid through arrival + 2 days', 'Mono/Caption', 'text/tertiary', { name: 'Rule', fill: true }),
      Tx(k === 'Required' ? 'Not uploaded yet.' : 'Result of the validity check.', 'Body/S', s.result, { name: 'Result', fill: true })
    ]);
    var ver = Tx('v1 · 2 Sep 2026', 'Mono/Caption', 'text/tertiary', { name: 'Version', w: 150 });
    var acts = H({ name: 'Actions', gap: 8, w: 250, main: 'MAX', cross: 'CENTER' });
    if (k === 'Cleared') add(acts, btn('Ghost', 'SM', 'History', { lead: 'history' }));
    if (k === 'Review') addAll(acts, [btn('Ghost', 'SM', 'Reject'), btn('Secondary', 'SM', 'Approve', { lead: 'check' })]);
    if (k === 'Amber' || k === 'Red') add(acts, btn('Secondary', 'SM', 'Request new version', { lead: 'upload' }));
    if (k === 'Required') add(acts, btn('Secondary', 'SM', 'Send reminder', { lead: 'bell' }));
    addAll(c, [sc, fillW(info), ver, acts]);
    return c;
  });
  var set = combine(comps, b, 'Document row');
  wireText(set, ['Document', 'Rule', 'Version']);
  C.docRow = set;
}

/* ---------- Clearance gate ---------- */
function buildGate(parent) {
  var b = docBlock(parent, 'Clearance gate', 'The hard gate between Flow 2 and Flow 4. Shown on every operations screen so nobody dispatches around it. Locked lists what is outstanding; Clear appears only when every mandatory item is GREEN and approved and quarantine is complete.');
  var comps = ['Locked', 'Clear'].map(function (st) {
    var lk = st === 'Locked', tn = TONE[lk ? 'Bad' : 'Ok'];
    var c = H({ component: true, name: 'State=' + st, gap: 20, pad: [20, 24, 20, 24], cross: 'CENTER', w: 1200, radius: 12, fill: tn.bg, stroke: tn.border });
    var ic = H({ name: 'Icon wrap', w: 48, h: 48, radius: 999, fill: 'surface/card', main: 'CENTER', cross: 'CENTER' });
    add(ic, Ic(lk ? 'lock' : 'unlock', 22, tn.fg));
    var txt = VV({ name: 'Text', gap: 4 });
    addAll(txt, [
      Tx(lk ? 'Departure locked' : 'Clear to depart', 'Heading/H3', 'text/primary', { name: 'Title' }),
      Tx(lk ? '9 items must clear before departure can be recorded.' : 'Every mandatory document is cleared and quarantine is complete.', 'Body/S', 'text/secondary', { name: 'Body', fill: true })
    ]);
    var a = btn('Secondary', 'MD', lk ? 'View outstanding items' : 'Open route plan', { trail: 'arrow-right' }); a.name = 'Action';
    addAll(c, [ic, fillW(txt), a]);
    return c;
  });
  C.gate = combine(comps, b, 'Clearance gate');
}

/* ---------- Quote line ---------- */
function buildQuoteLine(parent) {
  var b = docBlock(parent, 'Quote line', 'An itemised cost line. Every line shows its basis; ESTIMATED lines say why they can move; overridden lines keep the catalog value visible and require a reason. Properties: Description, Basis, Qty, Rate, Amount.');
  var comps = ['Fixed', 'Estimated', 'Overridden'].map(function (k) {
    var c = H({ component: true, name: 'Certainty=' + k, gap: 16, pad: [12, 20, 12, 20], w: 780, fill: 'surface/card' });
    borderSide(c, 'border/default', 'bottom');
    var d = VV({ name: 'Desc', gap: 3 });
    add(d, Tx('Line description', 'Label/M', 'text/primary', { name: 'Description', fill: true }));
    add(d, Tx('per horse', 'Mono/Caption', 'text/tertiary', { name: 'Basis', fill: true }));
    if (k === 'Estimated') add(d, Tx('Why it may vary on the final invoice.', 'Body/S', 'status/warn/fg', { name: 'Why', fill: true }));
    if (k === 'Overridden') add(d, Tx('Override reason, entered by the Logistics Manager.', 'Body/S', 'status/info/fg', { name: 'Reason', fill: true }));
    var amt = VV({ name: 'Amount col', gap: 2, w: 120, cross: 'MAX' });
    add(amt, Tx('$0.00', 'Mono/Data', 'text/primary', { name: 'Amount', align: 'RIGHT' }));
    if (k === 'Overridden') add(amt, Tx('$300.00', 'Mono/Caption', 'text/tertiary', { name: 'Catalog', strike: true }));
    var tagc = H({ name: 'Tag col', w: 110, main: 'MAX' });
    var t = inst(C.chip, { Tone: k === 'Fixed' ? 'Neutral' : k === 'Estimated' ? 'Warn' : 'Info' });
    t.name = 'Certainty'; setP(t, { Label: k, 'Show dot': false });
    add(tagc, t);
    addAll(c, [fillW(d), Tx('1', 'Mono/Data', 'text/secondary', { name: 'Qty', w: 48, align: 'RIGHT' }), Tx('$0.00', 'Mono/Data', 'text/secondary', { name: 'Rate', w: 96, align: 'RIGHT' }), amt, tagc]);
    return c;
  });
  C.quoteLine = combine(comps, b, 'Quote line');
  wireText(C.quoteLine, ['Description', 'Basis', 'Qty', 'Rate', 'Amount']);
}

/* ---------- Estimate card ---------- */
function buildEstimate(parent) {
  var b = docBlock(parent, 'Estimate card', 'The customer\'s instant estimate. Always a range, never one number; never stored, never acceptable; recomputed on every change (BR-Q-10, BR-Q-11).');
  var c = VV({ component: true, name: 'Estimate card', gap: 14, pad: 24, w: 400, radius: 12, fill: 'surface/card', stroke: 'border/default' });
  add(c, Tx('Indicative range', 'Label/M', 'text/secondary', { name: 'Label' }));
  add(c, Tx('$11,300 – $16,100', 'Display/M', 'text/primary', { name: 'Range' }));
  add(c, Tx('Not a quote. A Logistics Manager prices the move after review; the issued quotation is itemised and valid for 7 days.', 'Body/S', 'text/tertiary', { name: 'Notice', fill: true }));
  add(c, divider());
  [['Horses', '2'], ['Grooms', '1 per 3 horses → 1'], ['Border crossings', '2'], ['Distance', '~960 km']].forEach(function (r) {
    var row = H({ name: r[0] + ' row', main: 'SPACE_BETWEEN', cross: 'CENTER' });
    addAll(row, [Tx(r[0], 'Body/S', 'text/secondary', { name: r[0] + ' label' }), Tx(r[1], 'Mono/Data', 'text/primary', { name: r[0] })]);
    add(c, fillW(row));
  });
  single(c, b);
  wireText(c, ['Range', 'Horses', 'Grooms', 'Border crossings', 'Distance']);
  C.estimate = c;
}

/* ---------- Service card ---------- */
function buildServiceCard(parent) {
  var b = docBlock(parent, 'Service card', 'Marketing card for the six services. Prices read "indicative from"; the only binding price is an issued quotation.');
  var c = VV({ component: true, name: 'Service card', gap: 14, pad: 28, w: 384, radius: 12, fill: 'surface/card', stroke: 'border/default' });
  var badge = H({ name: 'Icon badge', w: 40, h: 40, radius: 8, fill: 'surface/muted', main: 'CENTER', cross: 'CENTER' });
  add(badge, Ic('truck', 20, 'text/secondary'));
  add(c, badge);
  add(c, Tx('Service', 'Heading/H3', 'text/primary', { name: 'Title' }));
  add(c, Tx('Scope', 'Body/S', 'text/tertiary', { name: 'Scope', fill: true }));
  add(c, Tx('What the service includes, in one or two sentences.', 'Body/S', 'text/secondary', { name: 'Body', fill: true }));
  add(c, divider());
  var pr = H({ name: 'Price row', main: 'SPACE_BETWEEN', cross: 'MAX' });
  addAll(pr, [Tx('Indicative from', 'Mono/Caption', 'text/tertiary', { name: 'Price label' }), Tx('$800', 'Mono/Data L', 'text/primary', { name: 'Price' })]);
  add(c, fillW(pr));
  single(c, b);
  wireText(c, ['Scope', 'Title', 'Body', 'Price']);
  wire(c, 'Icon', 'INSTANCE_SWAP', ICON['truck'].id, 'Icon', 'mainComponent');
  C.service = c;
}

/* ---------- Timeline stop ---------- */
function buildTimeline(parent) {
  var b = docBlock(parent, 'Timeline stop', 'Route plan and journey log entry. Kind drives the marker. Properties: Stop, Time, Details.');
  var kinds = { Pickup: ['arrow-up', 'text/secondary'], Border: ['shield', 'status/info/fg'], Welfare: ['coffee', 'status/ok/fg'], Delivery: ['check', 'text/secondary'] };
  var comps = Object.keys(kinds).map(function (k) {
    var c = H({ component: true, name: 'Kind=' + k, gap: 16, w: 900 });
    var m = H({ name: 'Marker', w: 36, h: 36, radius: 8, fill: 'surface/muted', stroke: 'border/strong', main: 'CENTER', cross: 'CENTER' });
    add(m, Ic(kinds[k][0], 18, kinds[k][1]));
    var card = VV({ name: 'Card', gap: 6, pad: [16, 20, 16, 20], radius: 12, fill: 'surface/card', stroke: 'border/default' });
    var head = H({ name: 'Head', main: 'SPACE_BETWEEN', cross: 'CENTER' });
    addAll(head, [Tx('Stop name', 'Heading/H4', 'text/primary', { name: 'Stop' }), Tx('06:00', 'Mono/Data', 'text/secondary', { name: 'Time' })]);
    addAll(card, [fillW(head), Tx(k === 'Welfare' ? 'Welfare stop' : k, 'Mono/Eyebrow', 'text/tertiary', { name: 'Kind' }), Tx('Details', 'Body/S', 'text/secondary', { name: 'Details', fill: true })]);
    addAll(c, [m, fillW(card)]);
    return c;
  });
  C.stop = combine(comps, b, 'Timeline stop');
  wireText(C.stop, ['Stop', 'Time', 'Details']);
}

/* ---------- App chrome ---------- */
var NAV_ITEMS = ['Home', 'My horses', 'My requests'];
function brand(small) {
  var g = H({ name: 'Brand', gap: 10, cross: 'CENTER' });
  var mark = H({ name: 'Mark', w: small ? 26 : 30, h: small ? 26 : 30, radius: 6, fill: 'accent/default', main: 'CENTER', cross: 'CENTER' });
  var eq = Tx('Eq', 'Heading/H4', 'accent/on', { name: 'Monogram', noStyle: true });
  eq.fontName = FONT['display/Italic'];
  add(mark, eq);
  addAll(g, [mark, Tx('EquiFreight', 'Heading/H4', 'text/primary', { name: 'Wordmark' })]);
  return g;
}
function buildChrome(parent) {
  var b = docBlock(parent, 'App chrome', 'Owner portal header: customer items only (staff work in the Staff sidebar shell). Request transport is a Secondary button so each page keeps its own gold action. Also the mobile header and footer. Set a nav item\'s State to Active per screen.');
  var h = H({ component: true, name: 'App header / Desktop', main: 'SPACE_BETWEEN', cross: 'CENTER', pad: [0, 40, 0, 40], h: 64, w: SCREEN_W, fill: 'bg/canvas' });
  borderSide(h, 'border/default', 'bottom');
  var nav = H({ name: 'Nav', gap: 4, cross: 'CENTER' });
  NAV_ITEMS.forEach(function (n) { var i = inst(C.nav); setP(i, { Label: n }); i.name = 'Nav · ' + n; add(nav, i); });
  var right = H({ name: 'Account', gap: 12, cross: 'CENTER' });
  var theme = H({ name: 'Theme toggle', w: 36, h: 36, radius: 8, stroke: 'border/strong', main: 'CENTER', cross: 'CENTER' });
  add(theme, Ic('moon', 18, 'text/secondary'));
  var acct = H({ name: 'Account chip', gap: 10, pad: [4, 14, 4, 4], cross: 'CENTER', radius: 999, stroke: 'border/default' });
  var av = H({ name: 'Avatar', w: 28, h: 28, radius: 999, fill: 'surface/muted', main: 'CENTER', cross: 'CENTER' });
  add(av, Tx('ST', 'Mono/Chip', 'text/secondary', { name: 'Initials' }));
  addAll(acct, [av, Tx('Saigon Turf Club', 'Label/S', 'text/secondary', { name: 'Account name' })]);
  addAll(right, [btn('Secondary', 'SM', 'Request transport', { lead: 'plus' }), theme, acct]);
  addAll(h, [brand(), nav, right]);
  single(h, b);
  C.header = h;

  var m = H({ component: true, name: 'App header / Mobile', main: 'SPACE_BETWEEN', cross: 'CENTER', pad: [0, 16, 0, 16], h: 56, w: 390, fill: 'bg/canvas' });
  borderSide(m, 'border/default', 'bottom');
  var mb = H({ name: 'Menu button', w: 40, h: 40, radius: 8, stroke: 'border/strong', main: 'CENTER', cross: 'CENTER' });
  add(mb, Ic('menu', 20, 'text/primary'));
  addAll(m, [brand(true), mb]);
  single(m, b);
  C.headerM = m;

  C.footer = buildFooter(b);
}
/* ---------- footer (owner portal and access pages; staff and the cab surface have none) ----------
   Full: the operations desk first, because a club reads a footer when the page didn't answer
   them and the useful answer while a horse is on the road is a person; then help, legal and the
   company line. Compact: the same in one row, so the 900 px access pages don't grow. Both end
   with the demo note; set As of to the screen's own date. */
var OPS_DESK = { phone: '+84 28 0000 0000', email: 'ops@equifreight.vn', hours: 'Staffed 24 hours, every day' }; // placeholder: no real number yet
var FOOT_LINKS = [['Help', ['Help', 'How pricing works', 'Document rules by country']], ['Legal', ['Terms of service', 'Privacy']]];
function footNote() {
  var n = H({ name: 'Demo note', gap: 4, cross: 'CENTER' });
  addAll(n, [Tx('Prototype · demo data as of', 'Mono/Caption', 'text/tertiary', { name: 'Note' }), Tx('26 Sep 2026', 'Mono/Caption', 'text/tertiary', { name: 'As of' })]);
  return n;
}
function footLink(label) { return Tx(label, 'Body/S', 'text/secondary', { name: 'Link · ' + label }); }
function footCopyright() { return Tx('© 2026 EquiFreight', 'Body/S', 'text/tertiary', { name: 'Copyright' }); }
function buildFooter(b) {
  var full = VV({ component: true, name: 'Size=Full', w: SCREEN_W, fill: 'bg/canvas' });
  borderSide(full, 'border/default', 'top');
  var top = H({ name: 'Top', main: 'SPACE_BETWEEN', cross: 'MIN', pad: [40, 40, 40, 40] });
  var co = VV({ name: 'Company', gap: 10 });
  addAll(co, [brand(true), Tx('Cross-Border Racehorse Transport System', 'Body/S', 'text/tertiary', { name: 'Formal name' })]);
  var links = H({ name: 'Links', gap: 64 });
  FOOT_LINKS.forEach(function (g) {
    var c = VV({ name: g[0], gap: 10 });
    add(c, Tx(g[0], 'Label/S', 'text/primary', { name: 'Title' }));
    g[1].forEach(function (l) { add(c, footLink(l)); });
    add(links, c);
  });
  var desk = VV({ name: 'Operations desk', gap: 6, w: 360 });
  addAll(desk, [Tx('Horse on the road? Call the operations desk', 'Label/M', 'text/primary', { name: 'Title' }),
    Tx(OPS_DESK.phone, 'Mono/Data L', 'text/primary', { name: 'Phone' }),
    Tx(OPS_DESK.email, 'Mono/Data', 'text/secondary', { name: 'Email' }),
    Tx(OPS_DESK.hours, 'Body/S', 'text/tertiary', { name: 'Hours' })]);
  addAll(top, [co, links, desk]);
  var bottom = H({ name: 'Bottom', main: 'SPACE_BETWEEN', cross: 'CENTER', pad: [16, 40, 16, 40] });
  borderSide(bottom, 'border/default', 'top');
  addAll(bottom, [footCopyright(), footNote()]);
  addAll(full, [fillW(top), fillW(bottom)]);

  var compact = H({ component: true, name: 'Size=Compact', main: 'SPACE_BETWEEN', cross: 'CENTER', pad: [16, 40, 16, 40], w: SCREEN_W, fill: 'bg/canvas' });
  borderSide(compact, 'border/default', 'top');
  var legal = H({ name: 'Legal', gap: 20, cross: 'CENTER' });
  addAll(legal, [footCopyright(), footLink('Terms of service'), footLink('Privacy')]);
  var line = H({ name: 'Operations desk', gap: 10, cross: 'CENTER' });
  addAll(line, [Tx('Operations desk, 24 hours', 'Body/S', 'text/secondary', { name: 'Title' }), Tx(OPS_DESK.phone, 'Mono/Data', 'text/primary', { name: 'Phone' })]);
  addAll(compact, [legal, line, footNote()]);

  var set = combine([full, compact], b, 'Footer', 'Owner portal (Full) and access pages (Compact). Staff pages and the cab surface have no footer. Set As of to the screen\'s own date.');
  wireText(set, ['As of']);
  return set;
}

function buildComponents(board) {
  var icons = docBlock(board, 'Icons', Object.keys(ICONS).length + ' line icons on a 24 px grid, 1.75 stroke, round caps and joins. Each is its own component (Icon/…) so Button, Option card and Service card can swap them. Colour them with a stroke override from a text, accent or status token.');
  var grid = H({ name: 'Icon grid', gap: 12, wrap: true, rowGap: 12 });
  add(icons, fillW(grid));
  buildIcons(grid);
  buildButton(board);
  buildChip(board);
  buildInput(board);
  buildCheckbox(board);
  buildOptionCard(board);
  buildNavigation(board);
  buildDataDisplay(board);
  buildNameplate(board);
  buildHorseCard(board);
  buildLoadItem(board);
  buildStall(board);
  buildDocRow(board);
  buildGate(board);
  buildQuoteLine(board);
  buildEstimate(board);
  buildServiceCard(board);
  buildTimeline(board);
  buildChrome(board);
}
