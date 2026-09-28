/* =====================================================================
   Staff workspace: sidebar shell, jobs, catalogs, overview dashboard,
   users. One shell for every staff role; the sidebar shows only the
   sections the signed-in role owns. Desktop only (1440).
   ===================================================================== */
var ADMIN_ICONS = {
  'chart': '<path d="M3 3v18h18"/><path d="M7 15v3M12 10v8M17 6v12"/>',
  'book': '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5V21h16"/>',
  'tag': '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
  'search': '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  'ledger': '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>',
  'sort': '<path d="m8 9 4-4 4 4"/><path d="m8 15 4 4 4-4"/>',
  'arrow-down': '<path d="M12 5v14M6 13l6 6 6-6"/>',
  'chevron-left': '<path d="m15 6-6 6 6 6"/>',
  'chevron-right': '<path d="m9 6 6 6-6 6"/>'
};
var CHART_COLORS = [
  ['chart/1', '#5B93DB', '#3F72B8', 'Chart series 1 (validated: CVD ΔE 20+ vs chart/2, dark and light)'],
  ['chart/2', '#C7804F', '#B8662F', 'Chart series 2']
];
/* The staff sidebar lists the work each role owns (PRODUCT.md: one accountable owner per step),
   not the system's tables. Every item exists once in the component; each role shows its own. */
var NAV_MAIN = [['Overview', 'chart'], ['Requests', 'history'], ['Jobs', 'route'], ['Incidents', 'alert'], ['Documents', 'file'], ['Authorities', 'shield'], ['Customer notes', 'pencil'], ['Fleet calendar', 'calendar'], ['Vehicles', 'truck']];
/* sections below the main list: a label only when the section holds more than one item */
var NAV_MORE = [['Catalogs', [['Regulations', 'book'], ['Rates', 'tag']]], ['Admin', [['Users & roles', 'users'], ['Audit log', 'ledger']]]];
/* what a badge counts: always items where this person owns the next step; 0 hides the badge, over 99 reads 99+ */
var BADGE_MEANS = {
  'Requests': 'requests waiting for your review', 'Jobs': 'jobs where you own the next step', 'Incidents': 'open incidents',
  'Documents': 'documents waiting for your check', 'Authorities': 'filings or follow-ups due from you', 'Customer notes': 'notes due today',
  'Fleet calendar': 'capacity checks asked of you', 'Regulations': 'changes waiting to publish', 'Rates': 'missing rates'
};
/* per role: items, badge counts as of the demo (they match the pages: 4 awaiting review, Needs me · 1,
   2 due today, Draft v8 · 3 changes, 2 missing), and the recent codes. The escort (driver, grooms)
   has no sidebar: they work on the cab surface. */
var ROLE_NAV = {
  'Logistics manager': { items: ['Overview', 'Requests', 'Jobs', 'Incidents', 'Users & roles', 'Audit log'], badges: { 'Requests': '4', 'Jobs': '1', 'Incidents': '1' },
    recent: [['REQ-2026-0193', 'HCM → BKK'], ['CBRT-2026-040', 'PNH → HCM'], ['CBRT-2026-041', 'HCM → PNH']] },
  'Transport specialist': { items: ['Jobs', 'Documents', 'Authorities', 'Customer notes', 'Regulations', 'Rates'], badges: { 'Jobs': '1', 'Documents': '1', 'Authorities': '1', 'Customer notes': '2', 'Regulations': '3', 'Rates': '2' },
    recent: [['CBRT-2026-041', 'HCM → PNH'], ['CBRT-2026-038', 'BKK → PNH'], ['CBRT-2026-044', 'VTE → BKK']] },
  'Fleet & route coordinator': { items: ['Jobs', 'Fleet calendar', 'Vehicles'], badges: { 'Jobs': '1', 'Fleet calendar': '1' },
    recent: [['CBRT-2026-041', 'HCM → PNH'], ['CBRT-2026-040', 'PNH → HCM'], ['CBRT-2026-039', 'HKG → KUL']] }
};
var SIDE_VIEWPORT = 900; // the sidebar is sticky: this much is always on screen, with the user menu pinned at its foot

function addChartVariables() {
  CHART_COLORS.forEach(function (c) {
    if (V[c[0]]) return;
    var v = figma.variables.createVariable(c[0], COLL.color, 'COLOR');
    v.setValueForMode(COLL.dark, rgba(c[1]));
    if (COLL.light) v.setValueForMode(COLL.light, rgba(c[2]));
    v.description = c[3];
    try { v.scopes = ['SHAPE_FILL', 'STROKE_COLOR']; } catch (e) { /* ignore */ }
    V[c[0]] = v;
  });
}
function addAdminIcons(grid) {
  Object.keys(ADMIN_ICONS).forEach(function (n) {
    if (ICON[n]) return;
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">' + ADMIN_ICONS[n] + '</svg>';
    var comp = figma.createComponentFromNode(figma.createNodeFromSvg(svg));
    comp.name = 'Icon/' + n; comp.fills = [];
    comp.description = 'Icon · ' + n + ' · 24 px grid, 1.75 stroke. Colour via stroke override.';
    comp.children.forEach(function (k) { try { k.constraints = { horizontal: 'SCALE', vertical: 'SCALE' }; } catch (e) { /* groups */ } });
    tint(comp, 'text/primary');
    ICON[n] = comp;
    var cell = VV({ name: n, gap: 10, pad: [16, 8, 12, 8], w: 104, cross: 'CENTER', radius: 8, fill: 'surface/card', stroke: 'border/default' });
    addAll(cell, [comp, Tx(n, 'Mono/Caption', 'text/tertiary', { name: 'Name' })]);
    add(grid, cell);
  });
}

function sideItem(st) {
  var on = st === 'Active', hov = st === 'Hover';
  var c = H({ component: true, name: 'State=' + st, gap: 10, pad: [9, 12, 9, 12], w: 216, radius: 8, cross: 'CENTER', fill: on || hov ? 'surface/muted' : null });
  if (st === 'Focus') { strokeOf(c, 'accent/default', 1.5); effect(c, 'Focus/Ring'); }
  var ic = Ic('chart', 18, on ? 'accent/text' : hov ? 'text/secondary' : 'text/tertiary'); ic.name = 'Icon';
  var badge = H({ name: 'Badge wrap', pad: [2, 8, 2, 8], radius: 999, fill: 'surface/muted', stroke: 'border/strong', cross: 'CENTER' });
  add(badge, Tx('0', 'Mono/Chip', 'text/secondary', { name: 'Badge' }));
  addAll(c, [ic, Tx('Nav item', 'Label/S', on ? 'accent/text' : hov ? 'text/primary' : 'text/secondary', { name: 'Label', fill: true }), badge]);
  return c;
}
function navItem(it) {
  var n = inst(C.sideNav);
  setP(n, { Label: it[0], Icon: ICON[it[1]] });
  tint(n.children[0], 'text/tertiary');
  n.name = 'Side · ' + it[0];
  return fillW(n);
}
function userMenu() {
  var m = VV({ component: true, name: 'Staff user menu', gap: 2, pad: 6, w: 216, radius: 12, fill: 'surface/raised', stroke: 'border/strong' });
  effect(m, 'Elevation/2 Overlay');
  [['Profile', 'users'], ['Theme · Dark', 'moon'], ['Help', 'info'], null, ['Sign out', 'arrow-right']].forEach(function (r) {
    if (!r) { add(m, divider()); return; }
    var row = H({ name: r[0], gap: 10, pad: [9, 10, 9, 10], radius: 8, cross: 'CENTER' });
    addAll(row, [Ic(r[1], 16, 'text/tertiary'), Tx(r[0], 'Label/S', 'text/secondary', { fill: true })]);
    add(m, fillW(row));
  });
  return m;
}
function buildAdminComponents(board) {
  var b = docBlock(board, 'Staff shell', 'One workspace for every staff role. The sidebar lists the work the signed-in role owns, not the system\'s tables: the logistics manager sees Overview, Requests, Jobs, Incidents, Users & roles and the Audit log; the transport specialist Jobs, Documents, Authorities, Customer notes and the catalogs; the fleet & route coordinator Jobs, Fleet calendar and Vehicles. The escort has no sidebar (cab surface). A badge only ever counts items where this person owns the next step, links to that filtered list, hides at 0 and reads 99+ above 99; its accessible name says what it counts ("4 requests waiting for your review"). One name per place: the nav label is the first breadcrumb segment and the page title. The sidebar is sticky at viewport height with the user menu pinned at its foot.');
  var items = ['Default', 'Hover', 'Active', 'Focus'].map(sideItem);
  C.sideNav = combine(items, b, 'Side nav item', 'States: Default, Hover, Active (gold ink: the one place gold marks the current page), Focus (gold border and ring). Set aria-current on the Active item.');
  wireText(C.sideNav, ['Label', 'Badge']);
  wire(C.sideNav, 'Show badge', 'BOOLEAN', false, 'Badge wrap', 'visible');
  wire(C.sideNav, 'Icon', 'INSTANCE_SWAP', ICON['chart'].id, 'Icon', 'mainComponent');

  var s = VV({ component: true, name: 'Staff sidebar', w: 248, fill: 'bg/sunken' });
  s.strokes = [P('border/default')]; s.strokeAlign = 'INSIDE';
  s.strokeTopWeight = 0; s.strokeBottomWeight = 0; s.strokeLeftWeight = 0; s.strokeRightWeight = 1;
  var vp = VV({ name: 'Viewport', gap: 20, pad: [20, 16, 16, 16], h: SIDE_VIEWPORT });
  /* the tag names the signed-in role, so the items below it explain themselves; it sits on its own line
     because the longest role ("Fleet & route coordinator") doesn't fit beside the wordmark in 216 px */
  var top = VV({ name: 'Brand row', gap: 10 });
  var tag = chip('Neutral', 'Transport specialist', { noDot: true }); tag.name = 'Role tag';
  addAll(top, [brand(), tag]);
  var jump = H({ name: 'Jump', gap: 8, pad: [0, 10, 0, 10], h: 36, radius: 8, cross: 'CENTER', fill: 'bg/input', stroke: 'border/strong' });
  addAll(jump, [Ic('search', 16, 'text/tertiary'), Tx('Jump to a job or request', 'Body/S', 'text/tertiary', { fill: true }), Tx('⌘K', 'Mono/Caption', 'text/tertiary')]);
  var main = VV({ name: 'Main nav', gap: 2 });
  NAV_MAIN.forEach(function (it) { add(main, navItem(it)); });
  addAll(vp, [top, fillW(jump), fillW(main)]);
  NAV_MORE.forEach(function (g) {
    var sec = VV({ name: g[0], gap: 2 });
    if (g[1].length > 1) add(sec, VV({ name: 'Label', pad: [0, 12, 6, 12] }, [Tx(g[0], 'Body/S', 'text/tertiary', { name: 'Section label' })]));
    g[1].forEach(function (it) { add(sec, navItem(it)); });
    add(vp, fillW(sec));
  });
  var rec = VV({ name: 'Recent', gap: 0 });
  add(rec, VV({ name: 'Label', pad: [0, 12, 6, 12] }, [Tx('Recent', 'Body/S', 'text/tertiary', { name: 'Section label' })]));
  [['CBRT-2026-041', 'HCM → PNH'], ['CBRT-2026-040', 'PNH → HCM'], ['REQ-2026-0193', 'HCM → BKK']].forEach(function (r, i) {
    var row = H({ name: 'Recent ' + (i + 1), gap: 10, pad: [7, 12, 7, 12], radius: 8, cross: 'CENTER' });
    addAll(row, [Tx(r[0], 'Mono/Caption', 'text/secondary', { name: 'Code' }), Tx(r[1], 'Body/S', 'text/tertiary', { name: 'Route', fill: true })]);
    add(rec, fillW(row));
  });
  add(vp, fillW(rec));
  var sp = VV({ name: 'Spacer' }); add(vp, fillW(sp)); sp.layoutSizingVertical = 'FILL';
  add(vp, divider());
  var u = H({ name: 'User menu', gap: 10, pad: [6, 10, 6, 6], h: 44, radius: 8, cross: 'CENTER' });
  var av = H({ name: 'Avatar', w: 32, h: 32, radius: 999, fill: 'surface/muted', main: 'CENTER', cross: 'CENTER' });
  add(av, Tx('NL', 'Label/S', 'text/secondary', { name: 'Initials' }));
  var who = VV({ name: 'Who', gap: 0 });
  add(who, Tx('Nguyễn Thị Lan', 'Label/S', 'text/primary', { name: 'User name' })); // the role is the tag at the top, said once
  addAll(u, [av, fillW(who), Ic('chevron-down', 16, 'text/tertiary')]);
  add(vp, fillW(u));
  add(s, fillW(vp));
  single(s, b);
  wireText(s, ['User name', 'Initials']);
  C.adminSide = s;
  C.userMenu = single(userMenu(), b, 'Opens from the user button at the foot of the sidebar: profile, theme, help, sign out.');
}

/* ---------- shell + helpers ---------- */
/* one role's view of the sidebar: its items, its badges, its recent codes, who is signed in */
function configSidebar(side, user, active, extra) {
  setP(side, { 'User name': user[0], Initials: user[2] });
  var tag = side.findOne(function (x) { return x.type === 'INSTANCE' && x.name === 'Role tag'; });
  if (tag) setP(tag, { Label: user[1] });
  var role = ROLE_NAV[user[1]] || ROLE_NAV['Logistics manager'];
  var badges = Object.assign({}, role.badges, extra || {});
  var labels = NAV_MAIN.concat(NAV_MORE[0][1], NAV_MORE[1][1]).map(function (x) { return x[0]; });
  labels.forEach(function (l) {
    var n = side.findOne(function (x) { return x.type === 'INSTANCE' && x.name === 'Side · ' + l; });
    if (!n) return;
    var on = role.items.indexOf(l) >= 0;
    n.visible = on;
    if (!on) return;
    if (l === active) setP(n, { State: 'Active' });
    setP(n, badges[l] ? { 'Show badge': true, Badge: badges[l] } : { 'Show badge': false });
    tint(n.children[0], l === active ? 'accent/text' : 'text/tertiary');
  });
  NAV_MORE.forEach(function (g) {
    var sec = side.findOne(function (x) { return x.type === 'FRAME' && x.name === g[0]; });
    if (sec) sec.visible = g[1].some(function (it) { return role.items.indexOf(it[0]) >= 0; });
  });
  role.recent.forEach(function (r, i) {
    var row = side.findOne(function (x) { return x.name === 'Recent ' + (i + 1); });
    if (!row) return;
    row.findOne(function (x) { return x.name === 'Code'; }).characters = r[0];
    row.findOne(function (x) { return x.name === 'Route'; }).characters = r[1];
  });
  return side;
}
function breadcrumb(crumbs) {
  var crumb = H({ name: 'Breadcrumb', gap: 8, cross: 'CENTER' });
  crumbs.forEach(function (c, i) {
    if (i) add(crumb, Tx('/', 'Mono/Caption', 'text/tertiary'));
    add(crumb, Tx(c, 'Mono/Caption', i === crumbs.length - 1 ? 'text/primary' : 'text/tertiary'));
  });
  return crumb;
}
/* crumbs start at the nav item (its exact label), never at a non-destination root */
function adminScreen(name, active, crumbs, user, blocks, today, o) {
  var s = H({ name: name, w: SCREEN_W, fill: 'bg/canvas' });
  var side = configSidebar(inst(C.adminSide), user, active, o && o.badges);
  side.name = 'Staff sidebar';
  add(s, side);
  side.layoutSizingVertical = 'FILL';
  var main = VV({ name: 'Main' });
  var bar = H({ name: 'Top bar', main: 'SPACE_BETWEEN', cross: 'CENTER', pad: [16, 40, 16, 40] });
  borderSide(bar, 'border/default', 'bottom');
  var right = H({ name: 'Right', gap: 16, cross: 'CENTER' });
  var bell = H({ name: 'Notifications', w: 36, h: 36, radius: 8, stroke: 'border/strong', main: 'CENTER', cross: 'CENTER' });
  add(bell, Ic('bell', 18, 'text/secondary'));
  addAll(right, [Tx(today || 'Sat 26 Sep 2026', 'Mono/Caption', 'text/tertiary'), bell]);
  addAll(bar, [breadcrumb(crumbs), right]);
  add(main, fillW(bar));
  var content = VV({ name: 'Content', gap: 28, pad: [0, 40, 96, 40] });
  blocks.forEach(function (bl) { add(content, fillW(bl)); });
  add(main, fillW(content));
  add(s, fillW(main));
  return s;
}
function headAdmin(title, sub, right) { return pageHeader({ shell: 'staff', title: title, summary: sub, right: [right] }); }
function titled(title, sub, node, right) {
  var w = VV({ name: title, gap: 12 });
  var h = H({ name: 'Heading', main: 'SPACE_BETWEEN', cross: 'MAX' });
  var t = VV({ name: 'Text', gap: 2 });
  add(t, Tx(title, 'Heading/H4'));
  if (sub) add(t, Tx(sub, 'Body/S', 'text/tertiary'));
  addAll(h, [t, right || null]);
  addAll(w, [fillW(h), fillW(node)]);
  return w;
}
/* cols: [label, width|null (fill), align, style, color, sort] ; rows: { cells: [string|node], hl }
   sort is set only on columns whose order is the user's to choose: 'Unsorted', 'Ascending' or 'Descending' */
function cellOf(node, c) {
  var f = H({ name: 'Cell', w: c[1] || undefined, cross: 'CENTER', main: c[2] === 'RIGHT' ? 'MAX' : c[2] === 'CENTER' ? 'CENTER' : 'MIN' });
  if (node.type === 'TEXT') { if (c[2]) node.textAlignHorizontal = c[2]; add(f, fillW(node)); } else add(f, node);
  return c[1] ? f : fillW(f);
}
function tbl(name, cols, rows) {
  var p = panel(name, { gap: 0, pad: 0, clip: true });
  var hr = H({ name: 'Header', gap: 16, pad: [10, 16, 10, 16], fill: 'bg/sunken', cross: 'CENTER' });
  cols.forEach(function (c) {
    if (!c[5]) { add(hr, cellOf(Tx(c[0], 'Mono/Eyebrow', 'text/tertiary'), c)); return; }
    var h = inst(C.colHead, { Sort: c[5] }); setP(h, { Label: c[0] }); h.name = 'Sort · ' + c[0];
    add(hr, cellOf(h, c));
  });
  add(p, fillW(hr));
  rows.forEach(function (r, i) {
    var row = H({ name: 'Row ' + (i + 1), gap: 16, pad: [12, 16, 12, 16], cross: 'CENTER', fill: r.hl ? 'surface/raised' : null });
    borderSide(row, 'border/default', 'top');
    r.cells.forEach(function (v, j) {
      var c = cols[j];
      add(row, cellOf(typeof v === 'string' ? Tx(v, c[3] || 'Body/S', c[4] || 'text/primary') : v, c));
    });
    add(p, fillW(row));
  });
  return p;
}
/* ---------- table controls: one kit for every list table ----------
   Above the table: status tabs with counts, the filters, then one line saying how many and in what order.
   Below it: the range and the pager. Quotations, catalogs and document tables keep a fixed order and use
   none of this (DESIGN.md, Tables). */
var PAGE_SIZE = 20;
var FILTER_W = { Search: 360, Select: 220, Date: 260 };
function colHead(sort, st) {
  var on = sort !== 'Unsorted';
  var c = H({ component: true, name: 'Sort=' + sort + ', State=' + st, gap: 6, cross: 'CENTER', radius: 4 });
  add(c, Tx('Column', 'Mono/Eyebrow', on ? 'text/primary' : 'text/tertiary', { name: 'Label' }));
  var ic = Ic({ Unsorted: 'sort', Ascending: 'arrow-up', Descending: 'arrow-down' }[sort], 12, on ? 'text/primary' : 'text/tertiary');
  ic.name = 'Sort icon';
  add(c, ic);
  if (st === 'Focus') focusRing(c, 4, 3);
  return c;
}
/* a focus ring drawn outside a label without moving it: an absolute frame that stretches with its parent,
   so a header label stays aligned with the cells below it */
function focusRing(c, dx, dy) {
  var r = F({ name: 'Focus ring', radius: 6, stroke: 'accent/default', sw: 1.5 });
  c.appendChild(r);
  r.layoutPositioning = 'ABSOLUTE';
  r.resize(c.width + dx * 2, c.height + dy * 2); r.x = -dx; r.y = -dy;
  r.constraints = { horizontal: 'STRETCH', vertical: 'STRETCH' };
  effect(r, 'Focus/Ring');
  return r;
}
function pageNum(st) {
  var cur = st === 'Current';
  var c = H({ component: true, name: 'State=' + st, w: 32, h: 32, radius: 8, main: 'CENTER', cross: 'CENTER', fill: cur ? 'surface/muted' : null });
  add(c, Tx('1', 'Mono/Caption', cur ? 'text/primary' : 'text/secondary', { name: 'Page' }));
  if (st === 'Focus') { strokeOf(c, 'accent/default', 1.5); effect(c, 'Focus/Ring'); }
  return c;
}
function buildTableComponents(board) {
  var b = docBlock(board, 'Table controls', 'For list tables only (Jobs, Requests, Users & roles, Audit log). A column header sorts only when its order is the user\'s to choose; the active column takes Parchment and an arrow, and sets aria-sort. A list whose default order is not a column (blocked first, what needs you first) says so in the count line, and a column sort replaces that note with what it sorted by and a Reset order button. Pages hold ' + PAGE_SIZE + ' rows; the foot always shows the range, and Previous or Next is disabled at either end. Quotations, catalogs and document tables keep a fixed order and have none of this.');
  var heads = [];
  ['Unsorted', 'Ascending', 'Descending'].forEach(function (s) { ['Default', 'Focus'].forEach(function (st) { heads.push(colHead(s, st)); }); });
  C.colHead = combine(heads, b, 'Column header', 'Sortable column header. Unsorted shows a faint up-down mark; Ascending and Descending turn the label Parchment with the arrow. Focus: gold border outside the label and the ring. Set aria-sort on the active column.');
  wireText(C.colHead, ['Label']);
  C.pageNum = combine(['Default', 'Current', 'Focus'].map(pageNum), b, 'Page number', 'One page in the pager. Current carries aria-current="page".');
  wireText(C.pageNum, ['Page']);
}
function tabRow(tabs) {
  var r = H({ name: 'Tabs', gap: 28 });
  borderSide(r, 'border/default', 'bottom');
  tabs.forEach(function (t) { var i = inst(C.tab, { State: t[1] }); setP(i, { Label: t[0] }); i.name = 'Tab · ' + t[0]; add(r, i); });
  return r;
}
/* one filter field at its type's width, so a search box is never squeezed by its neighbours */
function filterField(kind, label, value, o) {
  o = o || {};
  var i = input(kind === 'Search' ? 'Text' : kind, o.state || 'Default', label, value, null);
  if (o.placeholder) placeholder(i);
  i.resize(FILTER_W[kind], i.height);
  return i;
}
/* o: { tabs, filters: [fields], count, order, action, right, table } */
function tableBlock(o) {
  var v = VV({ name: 'Table block', gap: 16 });
  if (o.tabs) add(v, fillW(tabRow(o.tabs)));
  if (o.filters) add(v, fillW(H({ name: 'Filters', gap: 16, cross: 'MIN' }, o.filters)));
  var m = H({ name: 'Count', gap: 16, main: 'SPACE_BETWEEN', cross: 'CENTER' });
  var l = H({ name: 'Left', gap: 8, cross: 'CENTER' });
  add(l, Tx(o.count, 'Label/S', 'text/primary', { name: 'Count' }));
  if (o.order) add(l, Tx(o.order, 'Body/S', 'text/tertiary', { name: 'Order' }));
  if (o.action) add(l, btn('Ghost', 'SM', o.action));
  addAll(m, [l, o.right ? Tx(o.right, 'Body/S', 'text/tertiary', { name: 'Note' }) : null]);
  add(v, fillW(m));
  add(v, fillW(o.table));
  return v;
}
function pageList(page, pages) {
  if (pages <= 7) { var a = []; for (var i = 1; i <= pages; i++) a.push(i); return a; }
  if (page <= 3) return [1, 2, 3, 4, '…', pages];
  if (page >= pages - 2) return [1, '…', pages - 3, pages - 2, pages - 1, pages];
  return [1, '…', page - 1, page, page + 1, '…', pages];
}
function pager(page, pages) {
  var r = H({ name: 'Pager', gap: 4, cross: 'CENTER' });
  add(r, btn('Ghost', 'SM', 'Previous', { lead: 'chevron-left', state: page === 1 ? 'Disabled' : 'Default' }));
  pageList(page, pages).forEach(function (n) {
    if (n === '…') { add(r, H({ name: 'Gap', w: 24, main: 'CENTER', cross: 'CENTER' }, [Tx('…', 'Mono/Caption', 'text/tertiary')])); return; }
    var p = inst(C.pageNum, { State: n === page ? 'Current' : 'Default' }); setP(p, { Page: String(n) }); p.name = 'Page ' + n; add(r, p);
  });
  add(r, btn('Ghost', 'SM', 'Next', { trail: 'chevron-right', state: page === pages ? 'Disabled' : 'Default' }));
  return r;
}
/* the foot inside the table panel: "1–20 of 142 entries" and the pager */
function tableFoot(t, shown, total, noun, page) {
  page = page || 1;
  var from = (page - 1) * PAGE_SIZE + 1, pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  var f = H({ name: 'Table foot', gap: 12, pad: [8, 16, 8, 16], main: 'SPACE_BETWEEN', cross: 'CENTER', fill: 'bg/sunken' });
  borderSide(f, 'border/default', 'top');
  addAll(f, [Tx(from + '–' + (from + shown - 1) + ' of ' + total + ' ' + noun, 'Body/S', 'text/secondary', { name: 'Range' }), pager(page, pages)]);
  add(t, fillW(f));
  return t;
}
function stack(a, b, bColor) { var v = VV({ name: 'Stack', gap: 2 }); addAll(v, [Tx(a, 'Label/S'), Tx(b, 'Mono/Caption', bColor || 'text/tertiary')]); return v; }
function withChip(text, tone, label) { var h = H({ name: 'With chip', gap: 8, cross: 'CENTER' }); addAll(h, [Tx(text, 'Label/S'), chip(tone, label, { noDot: true })]); return h; }
function listItem(code, label, meta, o) {
  o = o || {};
  var r = H({ name: label, gap: 10, pad: [9, 10, 9, 10], radius: 8, cross: 'CENTER', fill: o.sel ? 'surface/muted' : null });
  var c = H({ name: 'Code', w: 30, h: 22, radius: 4, stroke: 'border/strong', main: 'CENTER', cross: 'CENTER' });
  add(c, Tx(code, 'Mono/Chip', 'text/secondary'));
  addAll(r, [c, Tx(label, 'Label/S', o.sel ? 'accent/text' : 'text/secondary', { fill: true })]);
  if (o.chip) add(r, chip(o.chip[0], o.chip[1], { noDot: true }));
  else add(r, Tx(meta, 'Mono/Caption', 'text/tertiary'));
  return fillW(r);
}
function sideList(title, groups) {
  var p = panel(title, { w: 256, gap: 6, pad: 12 });
  add(p, input('Text', 'Default', 'Find', 'Country or crossing', null, { fill: true }));
  groups.forEach(function (g) {
    add(p, VV({ name: 'Gap', pad: [8, 0, 0, 0] }, [Tx(g[0], 'Body/S', 'text/tertiary')]));
    g[1].forEach(function (it) { add(p, listItem(it[0], it[1], it[2], it[3])); });
  });
  return p;
}
function versionRow(v, tone, tag, note) {
  var r = VV({ name: v, gap: 4, pad: [12, 0, 12, 0] });
  borderSide(r, 'border/default', 'top');
  var h = H({ name: 'Head', gap: 8, cross: 'CENTER' });
  addAll(h, [Tx(v, 'Mono/Data'), tag ? chip(tone, tag, { noDot: true }) : null]);
  addAll(r, [h, Tx(note, 'Body/S', 'text/tertiary', { fill: true })]);
  return fillW(r);
}
/* the header only says a draft exists; publishing is decided in the draft panel, gold at its foot */
function draftActions(tag) { return chip('Warn', tag); }
function draftPanel(version, changes, effect) {
  var p = panel('Draft ' + version, { gap: 12 });
  var h = H({ name: 'Head', gap: 24, cross: 'MAX' });
  var t = VV({ name: 'Text', gap: 4 });
  addAll(t, [Tx('Draft ' + version + ' · ' + changes, 'Heading/H4'), Tx(effect, 'Body/S', 'text/secondary', { fill: true })]);
  var a = H({ name: 'Actions', gap: 12, cross: 'CENTER' });
  addAll(a, [btn('Ghost', 'MD', 'Discard draft'), btn('Primary', 'MD', 'Publish ' + version, { lead: 'upload' })]);
  addAll(h, [fillW(t), a]);
  add(p, fillW(h));
  return p;
}
function tiles(list) {
  var h = H({ name: 'Tiles', gap: 16 });
  list.forEach(function (t) { add(h, fillW(stat(t[0], t[1], t[2]))); });
  return h;
}

/* ---------- Regulation catalog ---------- */
function scrRegulations() {
  var list = sideList('Destinations', [
    ['Countries', [['KH', 'Cambodia', 'v7', { sel: true, chip: ['Warn', 'Draft'] }], ['VN', 'Vietnam', 'v5'], ['TH', 'Thailand', 'v4'], ['LA', 'Laos', 'v3'], ['MY', 'Malaysia', 'v6'], ['HK', 'Hong Kong', 'v9']]],
    ['Border crossings', [['BRD', 'Mộc Bài – Bavet', 'v2'], ['BRD', 'Poipet – Aranyaprathet', 'v3'], ['BRD', 'Cầu Treo – Nam Phao', 'v1'], ['BRD', 'Sadao – Bukit Kayu Hitam', 'v2']]]
  ]);
  var shape = function (s) { return chip('Neutral', s, { noDot: true }); };
  var rules = tbl('Document rules', [['Document', null], ['Rule shape', 170], ['Parameter', 140, null, 'Mono/Caption'], ['Applies to', 100], ['Blocks', 80], ['', 36, 'RIGHT', 'Label/S', 'text/secondary']], [
    { cells: ['Equine passport', shape('Valid until'), 'arrival + 2 d', 'Per horse', 'Yes', 'Edit'] },
    { cells: ['Influenza vaccination', shape('Booster window'), '7–180 d before', 'Per horse', 'Yes', 'Edit'] },
    { cells: [withChip('EIA (Coggins) test', 'Warn', 'Changed'), shape('Window before dep.'), 'within 60 d (was 90)', 'Per horse', 'Yes', 'Edit'], hl: true },
    { cells: ['Export health certificate', shape('Window before dep.'), 'within 10 d', 'Per horse', 'Yes', 'Edit'] },
    { cells: ['Proof of ownership', shape('Presence only'), '—', 'Per horse', 'Yes', 'Edit'] },
    { cells: [withChip('Piroplasmosis test', 'Warn', 'New'), shape('Window before dep.'), 'within 30 d', 'Per horse', 'Yes', 'Edit'], hl: true },
    { cells: ['Import permit', shape('Valid until'), 'arrival + 2 d', 'Per shipment', 'Yes', 'Edit'] },
    { cells: [withChip('Transit insurance', 'Warn', 'Changed'), shape('Valid until'), 'journey + 2 d', 'Per shipment', 'Optional', 'Edit'], hl: true },
    { cells: ['Customs value declaration', shape('Presence only'), '1 per crossing', 'Per crossing', 'Per crossing', 'Edit'] }
  ]);

  var edit = panel('Edit rule', { gap: 16 });
  add(edit, Tx('Edit rule · EIA (Coggins) test', 'Heading/H4'));
  add(edit, Tx('Rule shape', 'Label/S', 'text/secondary'));
  var shapes = H({ name: 'Shapes', gap: 8, wrap: true, rowGap: 8 });
  addAll(shapes, [chip('Info', 'Window before departure'), chip('Neutral', 'Valid until', { noDot: true }), chip('Neutral', 'Booster window', { noDot: true }), chip('Neutral', 'Presence only', { noDot: true })]);
  add(edit, fillW(shapes));
  var fields = H({ name: 'Fields', gap: 16 });
  addAll(fields, [input('Text', 'Focus', 'Days before departure', '60', 'Was 90 in v7. Source: GDAHP notice 14/2026.', { fill: true }), input('Select', 'Default', 'Applies to', 'Per horse', null, { fill: true })]);
  add(edit, fillW(fields));
  var cb = inst(C.checkbox, { Checked: 'True' }); setP(cb, { Label: 'Blocks departure when not GREEN' });
  add(edit, cb);
  add(edit, callout('Warn', 'Re-check impact: 2 open jobs', 'CBRT-2026-041 and CBRT-2026-044 have Coggins tests older than 60 days at departure. After publishing they are flagged for review; approved documents are not revoked automatically.'));
  var ea = H({ name: 'Actions', gap: 12, main: 'MAX' });
  addAll(ea, [btn('Ghost', 'MD', 'Cancel'), btn('Secondary', 'MD', 'Save to draft')]);
  add(edit, fillW(ea));

  var ver = panel('Versions', { w: SIDE.narrow, gap: 0 });
  add(ver, VV({ name: 'Title', pad: [0, 0, 12, 0] }, [Tx('Versions · Cambodia', 'Heading/H4')]));
  addAll(ver, [
    versionRow('v8', 'Warn', 'Draft', '3 changes · edited by Nguyễn Thị Lan today, 10:40'),
    versionRow('v7', 'Info', 'Current', 'Published 22 Sep 2026 · 3 jobs pinned'),
    versionRow('v6', null, null, 'Published 2 Aug 2026 · 0 jobs pinned'),
    versionRow('v5', null, null, 'Published 14 Jun 2026 · archived')
  ]);

  var lower = H({ name: 'Edit and versions', gap: 24 });
  addAll(lower, [fillW(edit), ver]);
  var mainCol = VV({ name: 'Catalog', gap: 24 });
  addAll(mainCol, [
    fillW(draftPanel('v8', '3 changes', 'Publishing makes v8 the rules for new jobs. The 3 jobs pinned to v7 keep v7; 2 of them are flagged for review under the new EIA window.')),
    fillW(tiles([['Neutral', '21 d', 'Lead time'], ['Neutral', '7 d', 'Quarantine minimum'], ['Neutral', '2 d', 'Arrival buffer'], ['Info', '3', 'Jobs pinned to v7']])),
    fillW(titled('Document rules · Cambodia import', 'Each rule is evaluated against the job\'s travel dates, never against today.', rules)),
    fillW(lower)
  ]);
  var body = H({ name: 'Body', gap: 24 });
  addAll(body, [list, fillW(mainCol)]);
  return adminScreen('Transport specialist · Regulation catalog', 'Regulations', ['Catalogs', 'Regulations'], ['Nguyễn Thị Lan', 'Transport specialist', 'NL'], [
    headAdmin('Regulation catalog', 'Validity rules for each destination and border crossing. Publishing creates a new version; approved jobs keep the version they were pinned to.', draftActions('Draft v8 · 3 changes')),
    body
  ]);
}

/* ---------- Rate catalog ---------- */
function scrRates() {
  var list = sideList('Corridors', [
    ['Air', [['AIR', 'PNH → HKG', 'v12', { sel: true, chip: ['Warn', 'Draft'] }], ['AIR', 'SGN → HKG', 'v12']]],
    ['Road', [['RD', 'HCM → PNH', 'v12'], ['RD', 'HCM → BKK', 'v12'], ['RD', 'BKK → KUL', 'v11'], ['RD', 'HAN → VTE', '', { chip: ['Bad', '2 missing'] }]]]
  ]);
  var classes = tbl('Service classes', [['Class', null], ['Width per horse', 140, null, 'Mono/Data'], ['Horses per position', 160, 'RIGHT', 'Mono/Data'], ['Position rate', 130, 'RIGHT', 'Mono/Data'], ['Per horse', 130, 'RIGHT', 'Mono/Data']], [
    { cells: ['Economy', '32 in', '3', '$16,800', '$5,600'] },
    { cells: ['Business', '48 in', '2', '$16,800', '$8,400'] },
    { cells: ['First', '96 in', '1', '$16,800', '$16,800'] }
  ]);
  var breaks = tbl('Volume breaks', [['Horses', null, null, 'Mono/Data'], ['Discount', 170, 'RIGHT', 'Mono/Data']], [
    { cells: ['1', '0%'] }, { cells: ['2–3', '5%'] }, { cells: [withChip('4–7', 'Warn', 'Was 8%'), '10%'], hl: true }, { cells: ['8+', '15%'] }
  ]);
  var policy = panel('Percentages and policy', { gap: 10 });
  add(policy, Tx('Percentages and policy', 'Heading/H4'));
  [['Fuel surcharge', '18% · air lines only'], ['Insurance', '1.5% of declared value'], ['Contingency', '5% of cost base'], ['Margin', '12%'], ['Short notice', '< 14 d × 1.25 · 14–21 d × 1.10'], ['Deposit', '30%'], ['Quote validity', '7 days'], ['Cancellation', '10 · 25 · 50 · 100%']].forEach(function (r) { add(policy, dlRow(r[0], r[1])); });
  var pair = H({ name: 'Breaks and policy', gap: 24 });
  addAll(pair, [fillW(titled('Volume breaks', 'Applied to air and ground lines.', breaks)), fillW(policy)]);
  var cert = function (c) { return chip(c === 'Fixed' ? 'Neutral' : 'Warn', c, { noDot: true }); };
  var lines = tbl('Catalog lines', [['Line', null], ['Basis', 200, null, 'Mono/Caption', 'text/secondary'], ['Rate', 110, 'RIGHT', 'Mono/Data'], ['', 110, 'RIGHT']], [
    { cells: ['Pre-export isolation · stallion', 'per day', '$140', cert('Fixed')] },
    { cells: ['Pre-export isolation · mare', 'per day', '$85', cert('Fixed')] },
    { cells: ['Pre-export isolation · gelding', 'per day', '$70', cert('Fixed')] },
    { cells: ['Flying groom', '1 per 3 horses', '$1,450', cert('Fixed')] },
    { cells: ['Flight veterinarian', '8+ horses or > $250,000', '$2,200', cert('Fixed')] },
    { cells: ['Export health certificate', 'per horse', '$180', cert('Fixed')] },
    { cells: ['Customs and border documentation', 'per crossing', '$420', cert('Fixed')] },
    { cells: ['Waiting time at terminal', 'per hour', '$95', cert('Estimated')] }
  ]);
  var mainCol = VV({ name: 'Catalog', gap: 24 });
  addAll(mainCol, [
    fillW(draftPanel('v13', '1 change', 'Publishing makes v13 the rates for new quotations. The 4 quotations pinned to v12 keep their prices.')),
    fillW(tiles([['Neutral', '1,510 km', 'Distance'], ['Neutral', '1', 'Border crossings'], ['Info', '4', 'Quotes pinned to v12'], ['Neutral', '23 Sep', 'Last published']])),
    callout('Bad', 'HAN → VTE has 2 missing rates', 'Quotations on that corridor cannot be issued until the road rate and the Cầu Treo crossing fee are filled in.'),
    fillW(titled('Air stall by service class · PNH → HKG', 'Class sets the width per horse. A size L horse cannot fly Economy; a mare with foal needs First.', classes)),
    fillW(pair),
    fillW(titled('Catalog lines', 'Quantities are derived from the request. Estimated lines are marked on the quotation.', lines))
  ]);
  var body = H({ name: 'Body', gap: 24 });
  addAll(body, [list, fillW(mainCol)]);
  return adminScreen('Transport specialist · Rate catalog', 'Rates', ['Catalogs', 'Rates'], ['Nguyễn Thị Lan', 'Transport specialist', 'NL'], [
    headAdmin('Rate catalog', 'Rates for each corridor and service class. A quotation pins the version it was built from, so later changes never alter an issued quote.', draftActions('Draft v13 · 1 change')),
    body
  ]);
}

/* ---------- Charts (static, drawn to scale) ---------- */
function svgStroke(w, h, inner, token) {
  var n = figma.createNodeFromSvg('<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" fill="none">' + inner + '</svg>');
  n.fills = [];
  tint(n, token);
  return n;
}
function chartFrame(name, w, h) { var f = F({ name: name, w: w, h: h }); f.clipsContent = false; return f; }
function put(f, node, x, y) { f.appendChild(node); node.x = x; node.y = y; return node; }
function onTimeChart() {
  var W = 480, Hh = 220, L = 40, R = 16, T = 12, B = 190, lo = 85, hi = 100;
  var weeks = ['W32', 'W33', 'W34', 'W35', 'W36', 'W37', 'W38', 'W39'];
  var vals = [93.8, 97.1, 95.4, 100, 91.7, 96.2, 98.0, 96.9];
  var f = chartFrame('On-time chart', W, Hh);
  var y = function (v) { return B - (v - lo) / (hi - lo) * (B - T); };
  var x = function (i) { return L + i * (W - L - R) / (vals.length - 1); };
  [85, 90, 95, 100].forEach(function (t) {
    put(f, rect(W - L - R + 8, 1, 'border/default', 'Grid ' + t), L - 4, Math.round(y(t)));
    var lab = Tx(t + '%', 'Mono/Caption', 'text/tertiary', { name: 'Tick ' + t });
    put(f, lab, 0, y(t) - 8);
  });
  put(f, svgStroke(W, Hh, '<path d="M' + L + ' ' + y(95) + 'H' + (W - R) + '" stroke="#000" stroke-width="1.5" stroke-dasharray="4 4"/>', 'text/tertiary'), 0, 0);
  var pts = vals.map(function (v, i) { return x(i).toFixed(1) + ' ' + y(v).toFixed(1); }).join(' L');
  put(f, svgStroke(W, Hh, '<path d="M' + pts + '" stroke="#000" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>', 'chart/1'), 0, 0);
  vals.forEach(function (v, i) {
    var last = i === vals.length - 1, s = last ? 10 : 8;
    var d = dot(s, 'chart/1', 'Point ' + weeks[i]);
    d.strokes = [P('surface/card')]; d.strokeWeight = 2; d.strokeAlign = 'OUTSIDE';
    put(f, d, x(i) - s / 2, y(v) - s / 2);
    put(f, Tx(weeks[i], 'Mono/Caption', 'text/tertiary', { name: 'X ' + weeks[i] }), x(i) - 12, B + 10);
  });
  put(f, Tx('96.9%', 'Label/S', 'text/primary', { name: 'Latest' }), x(7) - 44, y(96.9) - 26);
  var tgt = Tx('Target 95%', 'Mono/Caption', 'text/tertiary', { name: 'Target' });
  put(f, tgt, W - R - tgt.width, y(95) + 6);
  return f;
}
function revenueChart() {
  var W = 480, Hh = 220, L = 44, R = 8, T = 12, B = 190, max = 450;
  var months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'];
  var rev = [318, 352, 297, 386, 401, 412.8], cost = [281, 309, 266, 338, 352, 364];
  var f = chartFrame('Revenue chart', W, Hh);
  var y = function (v) { return B - v / max * (B - T); };
  [0, 150, 300, 450].forEach(function (t) {
    put(f, rect(W - L - R + 4, 1, t === 0 ? 'border/strong' : 'border/default', 'Grid ' + t), L - 4, Math.round(y(t)));
    put(f, Tx('$' + t + 'k', 'Mono/Caption', 'text/tertiary', { name: 'Tick ' + t }), 0, y(t) - 8);
  });
  var slot = (W - L - R) / months.length, bw = 22;
  months.forEach(function (m, i) {
    var cx = L + slot * i + slot / 2;
    [[rev[i], 'chart/1', cx - bw - 1], [cost[i], 'chart/2', cx + 1]].forEach(function (b) {
      var hgt = B - y(b[0]);
      var r = rect(bw, hgt, b[1], m + (b[1] === 'chart/1' ? ' revenue' : ' cost'));
      r.topLeftRadius = 4; r.topRightRadius = 4;
      put(f, r, b[2], y(b[0]));
    });
    put(f, Tx(m, 'Mono/Caption', 'text/tertiary', { name: 'X ' + m }), cx - 10, B + 10);
  });
  var lx = L + slot * 5 + slot / 2 - bw - 1;
  put(f, Tx('$412.8k', 'Label/S', 'text/primary', { name: 'Latest' }), lx - 30, y(412.8) - 24);
  return f;
}
function legend(items) {
  var h = H({ name: 'Legend', gap: 16, cross: 'CENTER' });
  items.forEach(function (it) {
    var g = H({ name: it[1], gap: 6, cross: 'CENTER' });
    addAll(g, [rect(10, 10, it[0], 'Swatch', 2), Tx(it[1], 'Mono/Caption', 'text/secondary')]);
    add(h, g);
  });
  return h;
}

/* ---------- Overview dashboard ---------- */
function scrDashboard() {
  var queue = tbl('Review queue', [['Request', 118, null, 'Mono/Caption'], ['Customer', 170], ['Route', null, null, 'Body/S', 'text/secondary'], ['Horses', 50, 'RIGHT', 'Mono/Data'], ['Departs', 64, null, 'Mono/Caption', 'text/secondary'], ['Age', 40, 'RIGHT', 'Mono/Caption'], ['', 24, 'RIGHT']], [
    { cells: ['REQ-2026-0187', 'Mekong Equestrian', 'Phnom Penh → Hong Kong', '3', '12 Nov', '1 d', rowOpen()] },
    { cells: ['REQ-2026-0190', stack('Hanoi Riding Club', 'Lead-time override', 'status/warn/fg'), 'Hanoi → Vientiane', '1', '20 Oct', '20 h', rowOpen()] },
    { cells: ['REQ-2026-0191', 'Bangkok Polo Club', 'Bangkok → Kuala Lumpur', '4', '5 Nov', '9 h', rowOpen()] },
    { cells: ['REQ-2026-0193', 'Saigon Turf Club', 'Ho Chi Minh City → Bangkok', '2', '30 Oct', '2 h', rowOpen()] }
  ]);
  /* the same words and tone as the Jobs list's "What holds it" for these jobs, never a second description */
  var risk = panel('Clearance at risk', { w: SIDE.narrow, gap: 12 });
  add(risk, Tx('Clearance at risk', 'Heading/H4'));
  JOBS.filter(function (j) { return (j[3] === 'Clearance' || j[3] === 'Documents') && j[7]; }).forEach(function (j) {
    var it = VV({ name: j[0], gap: 4, pad: 14, radius: 8, stroke: 'border/default', fill: 'bg/sunken' });
    var h = H({ name: 'Head', gap: 10, cross: 'CENTER' });
    addAll(h, [Tx(j[0], 'Mono/Data'), Tx(j[1], 'Body/S', 'text/tertiary', { fill: true })]);
    addAll(it, [fillW(h), Tx(j[8], 'Label/S', j[7] === 'Bad' ? 'status/bad/fg' : 'status/warn/fg', { fill: true }), Tx(j[9], 'Body/S', 'text/tertiary', { fill: true })]);
    add(risk, fillW(it));
  });
  var row1 = H({ name: 'Queue and risk', gap: 24 });
  addAll(row1, [fillW(titled('Review queue', 'Oldest first. Requests waiting for feasibility review.', queue, btn('Ghost', 'SM', 'View all 4 in Requests', { trail: 'arrow-right' }))), risk]);

  var c1 = panel('On-time delivery', { gap: 16 });
  addAll(c1, [VV({ name: 'Title', gap: 2 }, [Tx('On-time delivery by week', 'Heading/H4'), Tx('Trips delivered inside the promised window. Dashed line: 95% target.', 'Body/S', 'text/tertiary')]), onTimeChart()]);
  var c2 = panel('Revenue and cost', { gap: 16 });
  var c2h = H({ name: 'Head', main: 'SPACE_BETWEEN', cross: 'MAX' });
  addAll(c2h, [VV({ name: 'Title', gap: 2 }, [Tx('Revenue and direct cost by month', 'Heading/H4'), Tx('USD, thousands. One axis for both series.', 'Body/S', 'text/tertiary')]), legend([['chart/1', 'Revenue'], ['chart/2', 'Direct cost']])]);
  addAll(c2, [fillW(c2h), revenueChart()]);
  var row2 = H({ name: 'Charts', gap: 24 });
  addAll(row2, [fillW(c1), fillW(c2)]);

  return adminScreen('Logistics manager · Overview', 'Overview', ['Overview'], ['Vũ Hải Yến', 'Logistics manager', 'VY'], [
    headAdmin('Overview', 'Logistics Manager view for 26 Sep 2026. Figures cover the last 30 days unless marked.', input('Select', 'Default', 'Period', 'Last 30 days', null)),
    tiles([['Warn', '4', 'Quotes out'], ['Ok', '96.4%', 'On-time, 30 d'], ['Neutral', '$412.8k', 'Revenue, 30 d'], ['Neutral', '11.8%', 'Gross margin']]),
    row1,
    row2
  ]);
}

/* ---------- Users and roles ---------- */
var ROLES = ['CUST', 'LM', 'TS', 'FRC', 'DRV'];
var CAPS = [
  ['Create requests, upload documents', [1, 0, 0, 0, 0]],
  ['Review and approve requests', [0, 1, 0, 0, 0]],
  ['Build and issue quotations', [0, 1, 0, 0, 0]],
  ['Approve or reject documents', [0, 0, 1, 0, 0]],
  ['Edit regulation and rate catalogs', [0, 0, 1, 0, 0]],
  ['Record authority submissions', [0, 0, 1, 0, 0]],
  ['Confirm load plans', [0, 0, 0, 1, 0]],
  ['Record departure and trip status', [0, 0, 0, 1, 1]],
  ['Log horse condition', [0, 0, 0, 0, 1]],
  ['Reschedule or cancel a blocked job', [0, 1, 0, 0, 0]]
];
function person(name, id, initials) {
  var h = H({ name: name, gap: 10, cross: 'CENTER' });
  var av = H({ name: 'Avatar', w: 32, h: 32, radius: 999, fill: 'surface/muted', main: 'CENTER', cross: 'CENTER' });
  add(av, Tx(initials, 'Mono/Chip', 'text/secondary'));
  addAll(h, [av, stack(name, id)]);
  return h;
}
function scrUsers() {
  var role = function (r) { return chip('Neutral', r, { noDot: true }); };
  var status = function (s) { return chip(s === 'Active' ? 'Ok' : 'Warn', s); };
  var staff = tbl('Staff', [['Name', null, null, null, null, 'Unsorted'], ['Role', 170], ['Jobs', 64, 'RIGHT', 'Mono/Data', null, 'Unsorted'], ['Last active', 112, null, 'Mono/Caption', 'text/secondary', 'Unsorted'], ['Status', 84]], [
    { cells: [person('Vũ Hải Yến', 'EF-001', 'VY'), role('Logistics manager'), '12', 'Today 09:12', status('Active')] },
    { cells: [person('Nguyễn Thị Lan', 'EF-004', 'NL'), role('Transport specialist'), '3', 'Today 10:40', status('Active')] },
    { cells: [person('Bùi Anh Thư', 'EF-015', 'BT'), role('Transport specialist'), '0', '—', status('Invited')] },
    { cells: [person('Đỗ Minh Khôi', 'EF-007', 'DK'), role('Fleet & route coordinator'), '5', 'Today 08:05', status('Active')] },
    { cells: [person('Trần Văn Minh', 'EF-011', 'TM'), role('Driver / escort'), '1', '25 Sep', status('Active')] },
    { cells: [person('Lê Thị Hoa', 'EF-012', 'LH'), role('Driver / escort'), '1', '24 Sep', status('Active')] },
    { cells: [person('Phạm Quốc Tuấn', 'EF-013', 'PT'), role('Driver / escort'), '1', '19 Sep', status('Active')] }
  ]);
  var perm = panel('Permissions', { w: SIDE.narrow, gap: 0 });
  add(perm, VV({ name: 'Title', gap: 2, pad: [0, 0, 12, 0] }, [Tx('What each role can do', 'Heading/H4'), Tx('Read-only. Roles follow the spec; change them in the spec first.', 'Body/S', 'text/tertiary')]));
  var hr = H({ name: 'Roles', gap: 0, pad: [8, 0, 8, 0], cross: 'MAX' });
  add(hr, fillW(Tx('', 'Mono/Eyebrow', 'text/tertiary')));
  ROLES.forEach(function (r) { add(hr, Tx(r, 'Mono/Eyebrow', 'text/tertiary', { w: 44, align: 'CENTER' })); });
  add(perm, fillW(hr));
  CAPS.forEach(function (c) {
    var row = H({ name: c[0], gap: 0, pad: [9, 0, 9, 0], cross: 'CENTER' });
    borderSide(row, 'border/default', 'top');
    add(row, Tx(c[0], 'Body/S', 'text/primary', { fill: true }));
    c[1].forEach(function (on) {
      var cell = H({ name: 'Cell', w: 44, main: 'CENTER', cross: 'CENTER' });
      add(cell, on ? Ic('check', 16, 'status/ok/fg') : Tx('–', 'Mono/Caption', 'text/tertiary'));
      add(row, cell);
    });
    add(perm, fillW(row));
  });
  add(perm, VV({ name: 'Note', pad: [12, 0, 0, 0] }, [Tx('CUST customer · LM logistics manager · TS transport specialist · FRC fleet & route coordinator · DRV driver / escort. Only the Logistics Manager approves requests (BR-F1-04); only the Transport Specialist approves documents (BR-F2-04).', 'Body/S', 'text/tertiary', { w: 352 })]));
  tableFoot(staff, 7, 7, 'staff');
  var list = tableBlock({ tabs: [['Staff · 7', 'Active'], ['Customers · 8', 'Default'], ['Pending invites · 1', 'Default']],
    filters: [filterField('Search', 'Search', 'Name or email', { placeholder: true }), filterField('Select', 'Role', 'All roles')],
    count: '7 staff', order: 'Order: by role', table: staff });
  var body = H({ name: 'Body', gap: 24 });
  addAll(body, [fillW(list), perm]);
  return adminScreen('Logistics manager · Users & roles', 'Users & roles', ['Users & roles'], ['Vũ Hải Yến', 'Logistics manager', 'VY'], [
    headAdmin('Users & roles', 'Staff accounts and what each role can do. Customers manage their own accounts from the owner portal.', btn('Secondary', 'MD', 'Invite staff', { lead: 'plus' })),
    body
  ]);
}

/* ---------- entries ---------- */
/* ---------- Jobs list ---------- */
/* [code, route, service, stage (one of the seven), unused, time left, date, hold tone, what holds it, next step] */
var JOBS = [
  ['CBRT-2026-038', 'Bangkok → Phnom Penh', '2 horses · road, via Poipet', 'Clearance', null, 'In 7 days', '3 Oct', 'Bad', 'Import permit overdue since 24 Sep', 'Lan: chase MAFF for the permit'],
  ['CBRT-2026-044', 'Vientiane → Bangkok', '3 horses · road, via Nong Khai', 'Documents', null, 'In 16 days', '12 Oct', 'Warn', 'Thai DLD wants a second EIA test', 'Customer: upload it by 30 Sep'],
  ['CBRT-2026-041', 'Ho Chi Minh City → Phnom Penh', '4 horses · road, private trailer', 'Documents', null, 'In 22 days', '18 Oct', 'Bad', 'Departure locked · 9 items outstanding', 'Customer: 4 uploads, one overdue'],
  ['CBRT-2026-040', 'Phnom Penh → Ho Chi Minh City', '1 horse · road, shared load', 'Trip', null, 'In 3 days', '29 Sep, 05:30', null, 'Clear to depart', 'Khôi: confirm the load plan'],
  ['CBRT-2026-039', 'Hong Kong (Sha Tin) → Kuala Lumpur', '2 horses · air, business class', 'Trip', null, 'Arrives in 2 h', 'Today, 13:40', null, 'Nothing holding it', 'Escort: arrival checkpoint'],
  ['CBRT-2026-036', 'Bangkok → Ho Chi Minh City', '3 horses · road, private trailer', 'Handover', null, 'Delivered', '24 Sep, 16:05', 'Warn', 'Handover not confirmed', 'Customer: confirm by today']
];
function twoLine(a, b, tone) {
  var v = VV({ name: 'Two lines', gap: 2 });
  addAll(v, [Tx(a, 'Label/S', tone || 'text/primary'), Tx(b, 'Mono/Caption', 'text/tertiary')]);
  return v;
}
/* the same jobs by departure date, earliest first: the Departure column sorted (the demo of a column sort and Reset) */
var JOBS_BY_DEPARTURE = ['CBRT-2026-036', 'CBRT-2026-039', 'CBRT-2026-040', 'CBRT-2026-038', 'CBRT-2026-044', 'CBRT-2026-041'];
function scrJobsSorted() { return scrJobs(true); }
function scrJobs(sorted) {
  sorted = sorted === true;
  var holdFg = { Bad: 'status/bad/fg', Warn: 'status/warn/fg' };
  var list = sorted ? JOBS_BY_DEPARTURE.map(function (c) { return JOBS.filter(function (j) { return j[0] === c; })[0]; }) : JOBS;
  var t = tbl('Jobs', [['Job', 118, null, 'Mono/Caption', null, 'Unsorted'], ['Route', null], ['Stage', 140, null, null, null, 'Unsorted'], ['Departure', 124, null, null, null, sorted ? 'Ascending' : 'Unsorted'], ['What holds it', 300], ['', 24, 'RIGHT']], list.map(function (j) {
    var hold = VV({ name: 'Hold', gap: 2 });
    addAll(hold, [Tx(j[8], 'Label/S', holdFg[j[7]] || 'text/secondary'), Tx(j[9], 'Body/S', 'text/tertiary')]);
    var route = VV({ name: 'Route', gap: 2 });
    addAll(route, [Tx(j[1], 'Label/S'), Tx(j[2], 'Body/S', 'text/tertiary')]);
    return { cells: [j[0], route, stageChip(j[3]), twoLine(j[5], j[6]), hold, Ic('arrow-right', 16, 'text/tertiary')] };
  }));
  tableFoot(t, JOBS.length, JOBS.length, 'jobs');
  var hint = Tx('Each row opens the job, where Clearance, Authorities, Load plan and Route sit as tabs with their owner named.', 'Body/S', 'text/tertiary', { w: 760 });
  return adminScreen('Logistics manager · Jobs' + (sorted ? ' · Sorted' : ''), 'Jobs', ['Jobs'], STAFF.yen, [
    headAdmin('Jobs', 'Every active job, for 26 Sep 2026. Each job has one owner per step.'),
    tableBlock({ tabs: [['All · 6', 'Active'], ['Needs me · 1', 'Default'], ['Blocked · 3', 'Default'], ['In transit · 1', 'Default']],
      filters: [filterField('Search', 'Search', 'Code, customer or route', { placeholder: true }), filterField('Select', 'Mode', 'Road and air')],
      count: '6 jobs', order: sorted ? 'Sorted by departure, earliest first' : 'Order: blocked first, then by departure', action: sorted ? 'Reset order' : null, table: t }),
    hint
  ]);
}

/* new staff frames land on the first staff row until eCanvas sorts them into their role's row */
function adminRowLabel(page) {
  var name = 'Row label · Staff workspace · Dark';
  var label = page.children.filter(function (n) { return n.name === name || n.name === 'Row label · ' + STAFF_ROWS[0]; })[0];
  if (label) return label;
  var bottom = 0;
  page.children.forEach(function (n) { bottom = Math.max(bottom, n.y + n.height); });
  label = Tx('Staff workspace · Dark', 'Display/M', 'text/primary', { name: name });
  page.appendChild(label);
  label.x = 0; label.y = bottom + 240;
  return label;
}
async function adminScreensCall(builders) {
  var page = await rehydrate(PAGE_NAMES[3]);
  var made = [];
  for (var i = 0; i < builders.length; i++) {
    var s = builders[i]();
    await flush();
    page.children.filter(function (n) { return n.name === s.name && n !== s; }).forEach(function (n) { n.remove(); });
    var label = adminRowLabel(page), y = label.y + 120, x = 0;
    page.children.forEach(function (n) { if (n !== s && n.type === 'FRAME' && Math.abs(n.y - y) < 1) x = Math.max(x, n.x + n.width + 120); });
    s.x = x; s.y = y;
    made.push(s.name + ' ' + s.id + ' ' + Math.round(s.width) + '×' + Math.round(s.height));
  }
  return report({ screens: made });
}
async function eAdminComponents() {
  var page = await rehydrate(PAGE_NAMES[2]);
  addChartVariables();
  var board = page.children.filter(function (n) { return n.name === 'Components'; })[0];
  var grid = board.findOne(function (n) { return n.name === 'Icon grid'; });
  addAdminIcons(grid);
  var old = board.children.filter(function (n) { return n.name === 'Admin shell' || n.name === 'Staff shell'; });
  old.forEach(function (n) { n.remove(); });
  buildAdminComponents(board);
  await flush();
  return report({ icons: Object.keys(ICON).length, chartVars: CHART_COLORS.map(function (c) { return c[0]; }) });
}
/* the table controls block, rebuilt in place (icons first: the header and pager use them) */
async function eTableComponents() {
  var page = await rehydrate(PAGE_NAMES[2]);
  var board = page.children.filter(function (n) { return n.name === 'Components'; })[0];
  addAdminIcons(board.findOne(function (n) { return n.name === 'Icon grid'; }));
  var old = board.children.filter(function (n) { return n.name === 'Table controls'; });
  buildTableComponents(board);
  var block = C.colHead.parent;
  if (old.length) { board.insertChild(board.children.indexOf(old[0]), block); old.forEach(function (n) { n.remove(); }); }
  await flush();
  return report({ columnHeader: C.colHead.id, pageNumber: C.pageNum.id });
}
async function eAdminCatalogs() { return adminScreensCall([scrRegulations, scrRates]); }
async function eAdminOverview() { return adminScreensCall([scrDashboard, scrUsers]); }

/* ---------- MCP: rebuild the sidebar in place and move every staff screen onto it ---------- */
/* frame → [staff key, active item, breadcrumb, [[old, new] for the back link or page title]] */
var SIDEBAR_FRAMES = {
  'Transport specialist · Regulation catalog': ['lan', 'Regulations', ['Catalogs', 'Regulations']],
  'Transport specialist · Rate catalog': ['lan', 'Rates', ['Catalogs', 'Rates']],
  'Logistics manager · Overview': ['yen', 'Overview', ['Overview'], [['Operations overview', 'Overview']]],
  'Logistics manager · Users & roles': ['yen', 'Users & roles', ['Users & roles'], [['Users and roles', 'Users & roles']]],
  'Logistics manager · Jobs': ['yen', 'Jobs', ['Jobs']],
  'Logistics manager · Jobs · Sorted': ['yen', 'Jobs', ['Jobs']],
  'Transport specialist · Clearance checklist': ['lan', 'Jobs', ['Jobs', 'CBRT-2026-041', 'Clearance']],
  'Fleet & route coordinator · Load plan': ['khoi', 'Jobs', ['Jobs', 'CBRT-2026-041', 'Load plan']],
  'Fleet & route coordinator · Route plan': ['khoi', 'Jobs', ['Jobs', 'CBRT-2026-041', 'Route']],
  'Transport specialist · Document review': ['lan', 'Documents', ['Documents', 'Nightfall · EIA test'], [['Clearance checklist', 'Documents']]],
  'Transport specialist · Document review · Reject': ['lan', 'Documents', ['Documents', 'Silver Bell · Proof of ownership'], [['Clearance checklist', 'Documents']]],
  'Logistics manager · Request review': ['yen', 'Requests', ['Requests', 'REQ-2026-0193'], [['Review queue', 'Requests']]],
  'Logistics manager · Request review · Override': ['yen', 'Requests', ['Requests', 'REQ-2026-0190'], [['Review queue', 'Requests']]],
  'Logistics manager · Quotation builder': ['yen', 'Requests', ['Requests', 'REQ-2026-0179', 'Quotation']],
  'Logistics manager · Quotation builder · Blocked': ['yen', 'Requests', ['Requests', 'REQ-2026-0190', 'Quotation']],
  'Transport specialist · Authorities': ['lan', 'Jobs', ['Jobs', 'CBRT-2026-041', 'Authorities']],
  'Transport specialist · Authorities · Overdue': ['lan', 'Jobs', ['Jobs', 'CBRT-2026-041', 'Authorities']],
  'Logistics manager · Incident · Held': ['yen', 'Incidents', ['Incidents', 'CBRT-2026-040'], [['Jobs', 'Incidents']]],
  'Logistics manager · Incident · Customer report': ['yen', 'Incidents', ['Incidents', 'CBRT-2026-036'], [['Jobs', 'Incidents']]],
  'Transport specialist · Customer notes': ['lan', 'Customer notes', ['Customer notes']]
};
async function eSidebar() {
  var page = await rehydrate(PAGE_NAMES[2]);
  if (COLL.light) V['text/tertiary'].setValueForMode(COLL.light, rgba('#5A6A7D'));
  var board = page.children.filter(function (n) { return n.name === 'Components'; })[0];
  addAdminIcons(board.findOne(function (n) { return n.name === 'Icon grid'; }));
  var old = board.children.filter(function (n) { return n.name === 'Staff shell'; });
  buildAdminComponents(board);
  var block = C.adminSide.parent;
  if (old.length) board.insertChild(board.children.indexOf(old[0]), block);
  await flush();
  var screens = pageNamed(PAGE_NAMES[3]);
  await screens.loadAsync();
  var done = [], missing = [];
  screens.children.forEach(function (f) {
    if (f.type !== 'FRAME') return;
    var old1 = f.children.filter(function (n) { return n.name === 'Staff sidebar'; })[0];
    if (!old1) return;
    var cfg = SIDEBAR_FRAMES[f.name.replace(/ · Light$/, '')];
    if (!cfg) { missing.push(f.name); return; }
    /* a fresh instance, not a swap: a swap keeps overrides on same-named layers that point at the old nav-item variants */
    var side = C.adminSide.createInstance();
    f.insertChild(f.children.indexOf(old1), side);
    old1.remove();
    configSidebar(side, STAFF[cfg[0]], cfg[1]);
    side.name = 'Staff sidebar';
    side.layoutSizingVertical = 'FILL';
    var bar = f.findOne(function (n) { return n.name === 'Top bar'; });
    var bc = bar && bar.findOne(function (n) { return n.name === 'Breadcrumb'; });
    if (bc) { var nb = breadcrumb(cfg[2]); bar.insertChild(bar.children.indexOf(bc), nb); bc.remove(); }
    (cfg[3] || []).forEach(function (p) {
      f.findAll(function (n) { return n.type === 'INSTANCE' && n.name === 'Button · ' + p[0]; }).forEach(function (b) { setP(b, { Label: p[1] }); b.name = 'Button · ' + p[1]; });
      f.findAll(function (n) { return n.type === 'TEXT' && n.name === 'Title' && n.characters === p[0]; }).forEach(function (t) { t.characters = p[1]; });
    });
    done.push(f.name + ' ' + f.id);
  });
  await flush();
  old.forEach(function (n) { n.remove(); });
  return report({ sidebar: C.adminSide.id, userMenu: C.userMenu.id, screens: done, missing: missing });
}
