/* =====================================================================
   MCP (use_figma) entries. Each call runs in a fresh context with no
   state, so every entry after the first rehydrates the registries from
   the file: variables, styles, fonts and components by name.
   Build with ./build-mcp.sh → mcp/NN-name.js (one use_figma call each).
   ===================================================================== */
var CNAMES = {
  button: 'Button', chip: 'Chip', input: 'Input field', checkbox: 'Checkbox', option: 'Option card', nav: 'Nav item',
  tab: 'Tab', step: 'Step', stat: 'Stat tile', progress: 'Progress', callout: 'Callout', toast: 'Toast',
  nameplate: 'Nameplate', horse: 'Horse card', loadItem: 'Load item', stall: 'Stall tile', docRow: 'Document row',
  gate: 'Clearance gate', quoteLine: 'Quote line', estimate: 'Estimate card', service: 'Service card', stop: 'Timeline stop',
  header: 'App header / Desktop', headerM: 'App header / Mobile', footer: 'Footer',
  sideNav: 'Side nav item', adminSide: 'Staff sidebar',
  owed: 'Owed item', stageRow: 'Stage row', stop2: 'Route stop', colHead: 'Column header', pageNum: 'Page number'
};
function pageNamed(name) { return figma.root.children.filter(function (p) { return p.name === name; })[0]; }

async function rehydrate(pageName) {
  await loadFonts();
  var cols = await figma.variables.getLocalVariableCollectionsAsync();
  var color = cols.filter(function (c) { return c.name === DS + ' / Color'; })[0];
  var dim = cols.filter(function (c) { return c.name === DS + ' / Dimension'; })[0];
  if (!color || !dim) throw new Error('Variables missing: run 01-tokens first');
  COLL = { color: color, dark: color.modes[0].modeId, light: color.modes.length > 1 ? color.modes[1].modeId : null, dim: dim };
  var vars = await figma.variables.getLocalVariablesAsync();
  vars.forEach(function (v) { if (v.variableCollectionId === color.id || v.variableCollectionId === dim.id) V[v.name] = v; });
  RADII.forEach(function (r) { if (V[r[0]]) RADV[r[1]] = V[r[0]]; });
  var ts = await figma.getLocalTextStylesAsync();
  ts.forEach(function (s) {
    if (s.name.indexOf(DS + '/') !== 0) return;
    STY[s.name.slice(DS.length + 1)] = { id: s.id, font: s.fontName, size: s.fontSize, lh: s.lineHeight.value, ls: s.letterSpacing.value, upper: s.textCase === 'UPPER' };
  });
  await Promise.all(Object.keys(STY).map(function (k) { return figma.loadFontAsync(STY[k].font); }));
  var es = await figma.getLocalEffectStylesAsync();
  es.forEach(function (s) { if (s.name.indexOf(DS + '/') === 0) EFX[s.name.slice(DS.length + 1)] = s.id; });

  var page = pageNamed(pageName);
  if (!page) throw new Error('Page missing: ' + pageName);
  await figma.setCurrentPageAsync(page);
  var cp = pageNamed(PAGE_NAMES[2]);
  if (cp !== page) await cp.loadAsync();
  var byName = {};
  cp.findAllWithCriteria({ types: ['COMPONENT', 'COMPONENT_SET'] }).forEach(function (n) {
    if (n.type === 'COMPONENT_SET' || n.parent.type !== 'COMPONENT_SET') byName[n.name] = n;
    if (n.type === 'COMPONENT' && n.name.indexOf('Icon/') === 0) ICON[n.name.slice(5)] = n;
  });
  for (var k in CNAMES) if (byName[CNAMES[k]]) C[k] = byName[CNAMES[k]];
  STATS.components = Object.keys(byName).length;
  STATS.variants = cp.findAllWithCriteria({ types: ['COMPONENT_SET'] }).reduce(function (a, s) { return a + s.children.length; }, 0);
  return page;
}
function rightOf(page) {
  var x = 0;
  page.children.forEach(function (n) { x = Math.max(x, n.x + n.width + 160); });
  return x;
}
function report(extra) {
  var o = { components: STATS.components, variants: STATS.variants, fallbacks: FALLBACKS };
  for (var k in extra) o[k] = extra[k];
  return o;
}

async function eTokens() {
  await cleanup();
  await loadFonts();
  buildVariables();
  buildStyles();
  var old = figma.root.children.filter(function (p) { return PAGE_NAMES.indexOf(p.name) >= 0; });
  var pages = PAGE_NAMES.map(function (n) { var p = figma.createPage(); p.name = n; return p; });
  await figma.setCurrentPageAsync(pages[0]);
  old.forEach(function (p) { p.remove(); });
  pages.forEach(function (p) { p.backgrounds = [{ type: 'SOLID', color: { r: 0.035, g: 0.055, b: 0.08 } }]; });
  var p1 = pageNamed('Page 1');
  if (p1) { await p1.loadAsync(); if (!p1.children.length) p1.remove(); }
  return { pages: pages.map(function (p) { return p.name + ' ' + p.id; }), colorVars: COLORS.length, modes: COLL.color.modes.map(function (m) { return m.name; }), textStyles: TYPE.length, effectStyles: EFFECTS.length, fonts: FONT, fallbacks: FALLBACKS };
}

async function eComponentsA() {
  var page = await rehydrate(PAGE_NAMES[2]);
  page.children.slice().forEach(function (n) { n.remove(); });
  var board = H({ name: 'Components', gap: 40, wrap: true, rowGap: 40, pad: 80, w: DOC_W * 2 + 40 + 160, fill: 'bg/canvas' });
  page.appendChild(board);
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
  await flush();
  return report({ board: board.id, icons: Object.keys(ICON).length });
}

async function eComponentsB() {
  var page = await rehydrate(PAGE_NAMES[2]);
  var board = page.children.filter(function (n) { return n.name === 'Components'; })[0];
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
  var toastRow = docBlock(board, 'In use', 'Toasts confirm what just happened in words that match the button that caused it.');
  var tr = H({ name: 'Toasts', gap: 16 });
  var t1 = inst(C.toast, { Tone: 'Ok' }); setP(t1, { Message: 'Load plan confirmed for CBRT-2026-041' });
  var t2 = inst(C.toast, { Tone: 'Bad' }); setP(t2, { Message: 'Departure refused: 9 items outstanding' });
  addAll(tr, [t1, t2]);
  add(toastRow, tr);
  await flush();
  return report({ board: board.id, boardSize: [board.width, board.height] });
}

async function eFoundations() {
  var page = await rehydrate(PAGE_NAMES[1]);
  page.children.slice().forEach(function (n) { n.remove(); });
  var b = buildFoundations(page);
  await flush();
  return report({ foundations: b.id, size: [b.width, b.height] });
}

async function screensCall(builders) {
  var page = await rehydrate(PAGE_NAMES[3]);
  var made = [];
  for (var i = 0; i < builders.length; i++) {
    var s = await builders[i]();
    await flush();
    var old = page.children.filter(function (n) { return n.name === s.name && n !== s; });
    old.forEach(function (n) { n.remove(); });
    s.x = rightOf(page); s.y = 0;
    made.push(s.name + ' ' + s.id + ' ' + Math.round(s.width) + '×' + Math.round(s.height));
  }
  return report({ screens: made });
}
/* new frames: replace a same-named frame in place, otherwise park below everything; eCanvas files them into their row */
async function newScreensCall(builders) {
  var page = await rehydrate(PAGE_NAMES[3]);
  var made = [];
  for (var i = 0; i < builders.length; i++) {
    var s = builders[i]();
    await flush();
    var old = page.children.filter(function (n) { return n.name === s.name && n !== s; });
    if (old.length) { s.x = old[0].x; s.y = old[0].y; old.forEach(function (n) { n.remove(); }); }
    else { var bottom = 0; page.children.forEach(function (n) { if (n !== s) bottom = Math.max(bottom, n.y + n.height); }); s.x = 0; s.y = bottom + 360; }
    made.push(s.name + ' ' + s.id + ' ' + Math.round(s.width) + '×' + Math.round(s.height));
  }
  return report({ screens: made });
}
/* the Footer component (Full, Compact) replaces the single-variant one: a fresh instance per screen,
   keeping each screen's size and date. A fresh instance, not a swap, because a swap would carry the old
   whole-sentence Note override onto the new Note layer. */
async function eFooter() {
  var page = await rehydrate(PAGE_NAMES[2]);
  var old = C.footer;
  var block = old.parent;
  var set = buildFooter(block);
  block.insertChild(block.children.indexOf(old), set);
  await flush();
  C.footer = set;
  var screens = pageNamed(PAGE_NAMES[3]);
  await screens.loadAsync();
  var done = [];
  var olds = [];
  for (var fi = 0; fi < screens.children.length; fi++) {
    var fr = screens.children[fi];
    if (fr.type !== 'FRAME') continue;
    for (var ci = 0; ci < fr.children.length; ci++) {
      var n = fr.children[ci];
      if (n.type !== 'INSTANCE') continue;
      var mc = await n.getMainComponentAsync();
      var isFooter = mc && (mc.name === 'Footer' || (mc.parent && mc.parent.name === 'Footer'));
      if (isFooter && mc.parent !== set) olds.push(n); // any footer not on the new set, including orphans of a removed one
    }
  }
  olds.forEach(function (o) {
    var f = o.parent;
    var size = (o.componentProperties && o.componentProperties.Size && o.componentProperties.Size.value) || 'Full';
    var d = o.findOne(function (n) { return n.type === 'TEXT' && n.name === 'As of'; });
    var nt = o.findOne(function (n) { return n.type === 'TEXT' && n.name === 'Note'; });
    var asOf = d ? d.characters : (nt && /as of (.+)$/.exec(nt.characters) || [])[1];
    var ni = footer(size, asOf);
    f.insertChild(f.children.indexOf(o), ni);
    ni.layoutSizingHorizontal = 'FILL';
    ni.name = 'Footer';
    o.remove();
    done.push(f.name + ' · ' + size + ' · ' + (asOf || '26 Sep 2026'));
  });
  await flush();
  old.remove();
  return report({ footer: set.id, screens: done });
}
async function eAccess() { return newScreensCall(ACCESS_SCREENS); }
async function eAudit() { return newScreensCall(AUDIT_SCREENS); }
async function eScreensOwnerA() { return screensCall([scrHome, scrHorses]); }
async function eScreensOwnerB() { return screensCall([scrRequest1, scrRequest3, scrRequest4]); }
/* The quotation (tracking page model) and the staff job tabs need components
   built later in the sequence, so they come after them: eQuoteScreen, eStaffScreens*. */

var ROWS = [
  ['Owner portal · Dark', ['Home', 'My horses', 'Request · 1 Horses', 'Request · 3 Route & dates (error)', 'Request · 4 Review']],
  ['Operations · Dark', ['Quotation', 'Fleet & route coordinator · Load plan', 'Transport specialist · Clearance checklist', 'Fleet & route coordinator · Route plan']],
  ['Light mode & mobile', ['Home · Light', 'Transport specialist · Clearance checklist · Light', 'Quotation · Light', 'My horses · Mobile', 'My horses · Mobile · Light']]
];
async function eArrange() {
  var page = await rehydrate(PAGE_NAMES[3]);
  page.children.filter(function (n) { return / · Light$|Mobile|^Row label/.test(n.name); }).forEach(function (n) { n.remove(); });
  var byName = {};
  page.children.forEach(function (n) { byName[n.name] = n; });
  if (COLL.light) {
    ['Home', 'Transport specialist · Clearance checklist', 'Quotation'].forEach(function (nm) {
      if (!byName[nm]) return;
      var c = byName[nm].clone(); c.name = nm + ' · Light';
      c.setExplicitVariableModeForCollection(COLL.color, COLL.light);
      byName[c.name] = c;
    });
  }
  var mob = scrHorsesMobile(); byName[mob.name] = mob;
  if (COLL.light) {
    var ml = mob.clone(); ml.name = 'My horses · Mobile · Light';
    ml.setExplicitVariableModeForCollection(COLL.color, COLL.light);
    byName[ml.name] = ml;
  }
  await flush();
  var y = 0, placed = [];
  ROWS.forEach(function (row) {
    var lbl = Tx(row[0], 'Display/M', 'text/primary', { name: 'Row label · ' + row[0] });
    page.appendChild(lbl);
    lbl.x = 0; lbl.y = y;
    y += 120;
    var nodes = row[1].map(function (n) { return byName[n]; }).filter(Boolean);
    place(nodes, 0, y, 120);
    placed = placed.concat(nodes.map(function (n) { return n.name; }));
    y += Math.max.apply(null, nodes.map(function (n) { return n.height; }).concat([0])) + 240;
  });
  await flush();
  return report({ placed: placed, lightMode: !!COLL.light });
}

async function eCover() {
  var page = await rehydrate(PAGE_NAMES[0]);
  page.children.slice().forEach(function (n) { n.remove(); });
  var f = buildCover(page);
  await flush();
  figma.viewport.scrollAndZoomIntoView([f]);
  return report({ cover: f.id });
}

/* Staff workspace: the job tabs replace the old operations frames in place
   (same name, same position); new frames go at the end of the staff row. */
var LIGHT_COPIES = ['Transport specialist · Clearance checklist', 'Quotation'];
async function staffScreensCall(builders) {
  var page = await rehydrate(PAGE_NAMES[3]);
  var made = [];
  for (var i = 0; i < builders.length; i++) {
    var s = builders[i]();
    await flush();
    var old = page.children.filter(function (n) { return n.name === s.name && n !== s; });
    if (old.length) { s.x = old[0].x; s.y = old[0].y; old.forEach(function (n) { n.remove(); }); }
    else {
      var label = adminRowLabel(page), y = label.y + 120, x = 0;
      page.children.forEach(function (n) { if (n !== s && n.type === 'FRAME' && Math.abs(n.y - y) < 1) x = Math.max(x, n.x + n.width + 120); });
      s.x = x; s.y = y;
    }
    var light = page.children.filter(function (n) { return n.name === s.name + ' · Light'; });
    if (COLL.light && (light.length || LIGHT_COPIES.indexOf(s.name) >= 0)) {
      var c = s.clone(); c.name = s.name + ' · Light';
      c.setExplicitVariableModeForCollection(COLL.color, COLL.light);
      if (light.length) { c.x = light[0].x; c.y = light[0].y; } else { c.x = s.x + s.width + 120; c.y = s.y; }
      light.forEach(function (n) { n.remove(); });
      made.push(c.name + ' ' + c.id);
    }
    made.push(s.name + ' ' + s.id + ' ' + Math.round(s.width) + '×' + Math.round(s.height));
  }
  return report({ screens: made });
}
async function eQuoteScreen() { return staffScreensCall([scrQuote]); }
async function eStaffScreensA() { return staffScreensCall([scrJobs, scrJobsSorted, scrClearance]); }
async function eStaffScreensB() { return staffScreensCall([scrLoadPlan, scrRoute]); }

/* ---------- MCP: the canvas, one row per surface, every row from x 0 with 120 gutters ---------- */
/* one staff row per role, so who is signed in is clear from the canvas alone */
var STAFF_ROWS = ['Logistics manager · Vũ Hải Yến', 'Transport specialist · Nguyễn Thị Lan', 'Fleet & route coordinator · Đỗ Minh Khôi'];
/* [label text, existing label names it may carry, frames in reading order] */
var CANVAS = [
  ['Access · Dark', ['Row label · Access · Dark'], ['Access · Sign in', 'Access · Sign in · Wrong password', 'Access · Sign in · Locked', 'Access · Create account', 'Access · Create account · Check your email', 'Access · Staff invite', 'Access · Staff invite · Expired', 'Access · Reset password', 'Access · Reset password · Link sent', 'Access · Reset password · New password', 'Access · Reset password · Link expired']],
  ['Owner portal · Dark', ['Row label · Owner portal · Dark'], ['Home', 'My horses', 'My horses · Nightfall', 'My horses · Nightfall · Edit', 'Request · 1 Horses', 'Request · 2 Service', 'Request · 3 Route & dates (error)', 'Request · 4 Review', 'First run · My requests', 'First run · Add a horse']],
  ['Owner · Request tracking', ['Row label · Owner · Request tracking'], ['Tracking · My requests', 'Tracking · In review', 'Tracking · Info required', 'Quotation', 'Tracking · Documents needed', 'Tracking · All documents', 'Tracking · Ask a question', 'Tracking · Document upload · Refused', 'Tracking · Document upload', 'Tracking · In transit', 'Tracking · Delivered', 'Tracking · Closed', 'Tracking · Report a problem']],
  [STAFF_ROWS[0], ['Row label · ' + STAFF_ROWS[0], 'Row label · Staff workspace · Dark'], ['Logistics manager · Overview', 'Logistics manager · Jobs', 'Logistics manager · Jobs · Sorted', 'Logistics manager · Request review', 'Logistics manager · Request review · Override', 'Logistics manager · Quotation builder', 'Logistics manager · Quotation builder · Blocked', 'Logistics manager · Incident · Held', 'Logistics manager · Incident · Customer report', 'Logistics manager · Users & roles', 'Logistics manager · Users & roles · Error', 'Logistics manager · Audit log', 'Logistics manager · Audit log · Entry', 'Logistics manager · Audit log · No results']],
  [STAFF_ROWS[1], ['Row label · ' + STAFF_ROWS[1]], ['Transport specialist · Clearance checklist', 'Transport specialist · Authorities', 'Transport specialist · Authorities · Overdue', 'Transport specialist · Document review', 'Transport specialist · Document review · Reject', 'Transport specialist · Customer notes', 'Transport specialist · Regulation catalog', 'Transport specialist · Rate catalog', 'Transport specialist · Audit log · Not allowed']],
  [STAFF_ROWS[2], ['Row label · ' + STAFF_ROWS[2]], ['Fleet & route coordinator · Load plan', 'Fleet & route coordinator · Route plan']],
  ['Escort cab surface · Light', ['Row label · Escort cab surface · Light', 'Row label · Operations · Dark'], ['Escort · Checkpoint', 'Escort · Welfare stop', 'Escort · Delivery', 'Escort · Held']],
  ['Light mode & mobile', ['Row label · Light mode & mobile'], ['Home · Light', 'Quotation · Light', 'Transport specialist · Clearance checklist · Light', 'My horses · Mobile', 'My horses · Mobile · Light']]
];
async function eCanvas() {
  var page = await rehydrate(PAGE_NAMES[3]);
  var byName = {}, placed = {};
  page.children.forEach(function (n) { byName[n.name] = n; });
  var y = 0, rows = [];
  CANVAS.forEach(function (row) {
    var lbl = null;
    row[1].forEach(function (nm) { if (!lbl && byName[nm]) lbl = byName[nm]; });
    if (!lbl) { lbl = Tx(row[0], 'Display/M', 'text/primary'); page.appendChild(lbl); }
    lbl.characters = row[0]; lbl.name = 'Row label · ' + row[0];
    lbl.x = 0; lbl.y = y;
    var x = 0, tall = 0;
    row[2].forEach(function (nm) {
      var f = byName[nm];
      if (!f) return;
      f.x = x; f.y = y + 120; x += f.width + 120; tall = Math.max(tall, f.height);
      placed[nm] = true;
    });
    rows.push(row[0] + ' @' + y);
    y += 120 + tall + 240;
  });
  var loose = page.children.filter(function (n) { return n.type === 'FRAME' && !placed[n.name]; }).map(function (n) { return n.name; });
  return report({ rows: rows, loose: loose });
}
