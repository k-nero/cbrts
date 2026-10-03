'use strict';
/* =====================================================================
   EquiFreight Design System — Figma generator
   ---------------------------------------------------------------------
   Builds, inside the open Figma Design file:
     • Variables   EquiFreight / Color (Dark + Light modes)
                   EquiFreight / Dimension (space, radius)
     • Styles      text styles, effect styles
     • Components  icons + component sets with variants and properties
     • Pages       Cover · Foundations · Components · Screens
   Re-running replaces everything it created earlier (matched by name).
   No network access, no UI. Plain ES2017 — the plugin sandbox has no
   optional chaining / object spread guarantees, so none are used.
   ===================================================================== */

var DS = 'EquiFreight';
var PAGE_NAMES = ['◆ Cover', '◆ Foundations', '◆ Components', '◆ Screens'];
var SCREEN_W = 1440;
var PADX = 120;
var CW = SCREEN_W - PADX * 2; // 1200 content width

/* ---------------------------------------------------------------------
   Tokens
   --------------------------------------------------------------------- */
// [token, dark, light, description]
var COLORS = [
  ['bg/canvas', '#0C1520', '#F3F5F8', 'Page background'],
  ['bg/sunken', '#09111A', '#E9EDF2', 'Wells, table headers, fact cells'],
  ['bg/input', '#0E1826', '#FFFFFF', 'Form control fill'],
  ['surface/card', '#111B2C', '#FFFFFF', 'Cards and panels'],
  ['surface/raised', '#15223A', '#F8F9FB', 'Selected or hovered card, toasts'],
  ['surface/muted', '#182538', '#EEF1F5', 'Hover fill, neutral chips'],
  ['border/default', '#1C2E44', '#DDE3EA', 'Hairlines and card borders'],
  ['border/strong', '#2A4266', '#C3CDD9', 'Controls and emphasised borders'],
  ['text/primary', '#EDE9E1', '#0F1A28', 'Headings and body copy'],
  ['text/secondary', '#B3BFCC', '#3C4A5B', 'Supporting copy'],
  ['text/tertiary', '#7A8FA3', '#5A6A7D', 'Captions, labels, placeholders (Light at 4.6:1 on bg/sunken)'],
  ['accent/default', '#C9AA5A', '#C9AA5A', 'Brand gold. Primary actions only, never status'],
  ['accent/hover', '#D6B96B', '#B89846', 'Primary action hover'],
  ['accent/on', '#0C1520', '#0C1520', 'Content placed on gold'],
  ['accent/text', '#D9BD72', '#80611A', 'Gold used as text or icon'],
  ['accent/soft', '#C9AA5A1F', '#C9AA5A29', 'Gold tint fill'],
  ['accent/line', '#C9AA5A59', '#A07D2873', 'Gold tint border'],
  ['status/ok/fg', '#5DC688', '#1D7A47', 'GREEN · cleared, valid'],
  ['status/ok/bg', '#5DC6881F', '#E2F3E9', ''],
  ['status/ok/border', '#5DC68859', '#A9D8BB', ''],
  ['status/warn/fg', '#FDB47A', '#7F3B00', 'AMBER · valid today, fails on the travel dates'],
  ['status/warn/bg', '#FDB47A1F', '#FCE9D8', ''],
  ['status/warn/border', '#FDB47A61', '#EFC199', ''],
  ['status/bad/fg', '#EF6B6B', '#B3261E', 'RED · fails its rule, blocked'],
  ['status/bad/bg', '#EF6B6B1F', '#FBE6E4', ''],
  ['status/bad/border', '#EF6B6B61', '#F0B5B0', ''],
  ['status/info/fg', '#7FB0E8', '#1F5FA8', 'Informational, awaiting review, operations role'],
  ['status/info/bg', '#7FB0E81F', '#E4EEFA', ''],
  ['status/info/border', '#7FB0E859', '#B3CDEF', ''],
  ['stall/standard', '#4A6FA0', '#4F78AD', 'Standard stall'],
  ['stall/box', '#4C9068', '#3F8A5D', 'Box stall'],
  ['stall/climate', '#C7804F', '#C2703F', 'Climate-controlled stall'],
  ['material/brass-light', '#E6CB84', '#E6CB84', 'Nameplate highlight'],
  ['material/brass-dark', '#A8863B', '#A8863B', 'Nameplate shade'],
  ['material/brass-ink', '#2A1F08', '#2A1F08', 'Engraved nameplate text'],
  ['coat/grey', '#8E949B', '#8E949B', 'Horse coat · grey'],
  ['coat/black', '#202329', '#202329', 'Horse coat · black'],
  ['coat/chestnut', '#7B3F1F', '#7B3F1F', 'Horse coat · chestnut'],
  ['coat/bay', '#5B3522', '#5B3522', 'Horse coat · bay'],
  ['overlay/scrim', '#00000066', '#0F1A2840', 'Dialog backdrop']
];
var SPACE = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 64, 72, 88, 96, 120];
var RADII = [['radius/sm', 4], ['radius/md', 8], ['radius/lg', 12], ['radius/xl', 16], ['radius/pill', 999]];

// [name, role, style, size, lineHeight, letterSpacing %, upper]
var TYPE = [
  ['Display/XL', 'display', 'Regular', 68, 72, -2],
  ['Display/L', 'display', 'Regular', 44, 50, -1],
  ['Display/M', 'display', 'Regular', 32, 38, -0.5],
  ['Heading/H3', 'display', 'SemiBold', 22, 28, 0],
  ['Heading/H4', 'display', 'Regular', 18, 24, 0],
  ['Body/L', 'body', 'Light', 18, 28, 0],
  ['Body/M', 'body', 'Regular', 15, 24, 0],
  ['Body/S', 'body', 'Regular', 13, 20, 0],
  ['Label/M', 'body', 'Medium', 14, 20, 0],
  ['Label/S', 'body', 'Medium', 13, 18, 0],
  ['Mono/Data L', 'mono', 'Medium', 28, 32, -1],
  ['Mono/Data', 'mono', 'Regular', 14, 20, 0],
  ['Mono/Caption', 'mono', 'Regular', 12, 16, 0],
  ['Mono/Eyebrow', 'mono', 'Regular', 12, 16, 14, true],
  ['Mono/Chip', 'mono', 'Medium', 12, 14, 8, true]
];

function shadow(type, a, y, r, s, rgb) {
  var c = rgb || { r: 0, g: 0, b: 0 };
  return { type: type, color: { r: c.r, g: c.g, b: c.b, a: a }, offset: { x: 0, y: y }, radius: r, spread: s, visible: true, blendMode: 'NORMAL' };
}
var GOLD = { r: 0.788, g: 0.667, b: 0.353 };
var EFFECTS = [
  ['Elevation/1 Card', [shadow('DROP_SHADOW', 0.28, 10, 28, -14)]],
  ['Elevation/2 Overlay', [shadow('DROP_SHADOW', 0.45, 24, 56, -16)]],
  ['Focus/Ring', [shadow('DROP_SHADOW', 0.45, 0, 0, 3, GOLD)]],
  ['Material/Brass', [shadow('INNER_SHADOW', 0.35, -1, 0, 0), shadow('DROP_SHADOW', 0.45, 2, 6, 0)]]
];

/* ---------------------------------------------------------------------
   Registries
   --------------------------------------------------------------------- */
var V = {};        // token -> Variable
var RADV = {};     // radius number -> Variable
var STY = {};      // text style name -> { id, font, size, lh, ls, upper }
var EFX = {};      // effect style name -> id
var ICON = {};     // icon name -> ComponentNode
var C = {};        // components / component sets
var COLL = {};     // variable collections + mode ids
/* Light is the presented theme (DESIGN.md, Theme): every frame sets it explicitly, because the collection's
   default mode is still Dark. Dark stays supported; a frame's dark copy is named with ALT_SUFFIX. */
var ALT_SUFFIX = ' · Dark';
function primaryTheme(n) { if (COLL.light) n.setExplicitVariableModeForCollection(COLL.color, COLL.light); return n; }
function altCopy(src) { var c = src.clone(); c.name = src.name + ALT_SUFFIX; c.setExplicitVariableModeForCollection(COLL.color, COLL.dark); return c; }
var FONT = {};     // role/style -> FontName
var PENDING = [];  // async style applications
var SZ = {};       // node.id -> deferred sizing ({ w, h, abs })
var STATS = { components: 0, variants: 0 };

function flush() { var p = PENDING.splice(0); return Promise.all(p); }
/* queue a text style; a node removed before the style lands (e.g. a table dropped for an error state) is not an error */
function styleLater(t, id) {
  PENDING.push(t.setTextStyleIdAsync(id).catch(function (e) { if (!t.removed) throw e; }));
}

/* ---------------------------------------------------------------------
   Colour + paint helpers
   --------------------------------------------------------------------- */
function rgba(hex) {
  var h = hex.replace('#', '');
  var n = parseInt(h.slice(0, 6), 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255, a: h.length > 6 ? parseInt(h.slice(6, 8), 16) / 255 : 1 };
}
function P(token) {
  var v = V[token];
  if (!v) throw new Error('Unknown colour token: ' + token);
  return figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', v);
}
function gradient(stops, vertical) {
  return {
    type: 'GRADIENT_LINEAR',
    gradientTransform: vertical ? [[0, 1, 0], [-1, 0, 1]] : [[1, 0, 0], [0, 1, 0]],
    gradientStops: stops.map(function (s) { var c = rgba(s[1]); return { position: s[0], color: c }; })
  };
}
function tint(node, token) {
  if (!node) return node;
  var list = node.findAll ? node.findAll(function (n) { return 'strokes' in n && n.strokes.length > 0; }) : [];
  for (var i = 0; i < list.length; i++) list[i].strokes = [P(token)];
  var filled = node.findAll ? node.findAll(function (n) { return n.type !== 'FRAME' && 'fills' in n && Array.isArray(n.fills) && n.fills.length > 0; }) : [];
  for (var j = 0; j < filled.length; j++) filled[j].fills = [P(token)];
  return node;
}

/* ---------------------------------------------------------------------
   Layout helpers
   --------------------------------------------------------------------- */
function sz(n, key, val) { var s = SZ[n.id] || {}; s[key] = val; SZ[n.id] = s; return n; }
function fillW(n) { return sz(n, 'w', 'FILL'); }
function fillH(n) { return sz(n, 'h', 'FILL'); }
function absAt(n, x, y) { return sz(n, 'abs', [x, y]); }
function isAL(n) { return n && n.layoutMode && n.layoutMode !== 'NONE'; }

function add(parent, child) {
  if (!child) return null;
  parent.appendChild(child);
  var s = SZ[child.id];
  if (s) {
    if (s.abs) {
      if (isAL(parent)) child.layoutPositioning = 'ABSOLUTE';
      child.x = s.abs[0]; child.y = s.abs[1];
    }
    if (isAL(parent) && !s.abs) {
      if (s.w === 'FILL' && child.type === 'TEXT') child.textAutoResize = 'HEIGHT';
      if (s.w) child.layoutSizingHorizontal = s.w;
      if (s.h) child.layoutSizingVertical = s.h;
    }
  }
  return child;
}
function addAll(parent, kids) { for (var i = 0; i < kids.length; i++) add(parent, kids[i]); return parent; }

function num(node, field, n) {
  node[field] = n;
  var v = V['space/' + n];
  if (v && n > 0) { try { node.setBoundVariable(field, v); } catch (e) { /* not bindable here */ } }
}
function R(node, r) {
  node.cornerRadius = r;
  var v = RADV[r];
  if (!v) return;
  var keys = ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius'];
  for (var i = 0; i < keys.length; i++) { try { node.setBoundVariable(keys[i], v); } catch (e) { /* ignore */ } }
}
function pad(p) {
  if (p == null) return [0, 0, 0, 0];
  if (typeof p === 'number') return [p, p, p, p];
  if (p.length === 2) return [p[0], p[1], p[0], p[1]];
  return p;
}
function strokeOf(node, token, w, dash) {
  node.strokes = [P(token)];
  node.strokeWeight = w || 1;
  node.strokeAlign = 'INSIDE';
  if (dash) node.dashPattern = dash;
}
function borderSide(node, token, side) {
  node.strokes = [P(token)];
  node.strokeAlign = 'INSIDE';
  node.strokeTopWeight = side === 'top' ? 1 : 0;
  node.strokeBottomWeight = side === 'bottom' ? 1 : 0;
  node.strokeLeftWeight = 0;
  node.strokeRightWeight = 0;
}

/* Frame builder. o: { name, component, dir:'H'|'V', gap, pad, main, cross,
   wrap, rowGap, w, h, fill, stroke, sw, dash, radius, clip, opacity, children } */
function F(o) {
  o = o || {};
  var f = o.component ? figma.createComponent() : figma.createFrame();
  f.name = o.name || 'Frame';
  f.fills = o.fill ? [typeof o.fill === 'string' ? P(o.fill) : o.fill] : [];
  f.clipsContent = !!o.clip;
  if (o.dir) {
    f.layoutMode = o.dir === 'H' ? 'HORIZONTAL' : 'VERTICAL';
    num(f, 'itemSpacing', o.gap || 0);
    var p = pad(o.pad);
    num(f, 'paddingTop', p[0]); num(f, 'paddingRight', p[1]);
    num(f, 'paddingBottom', p[2]); num(f, 'paddingLeft', p[3]);
    f.primaryAxisAlignItems = o.main || 'MIN';
    f.counterAxisAlignItems = o.cross || 'MIN';
    if (o.wrap && o.dir === 'H') { f.layoutWrap = 'WRAP'; f.counterAxisSpacing = o.rowGap != null ? o.rowGap : (o.gap || 0); }
  }
  if (o.w != null || o.h != null) f.resize(o.w != null ? o.w : f.width, o.h != null ? o.h : f.height);
  if (o.dir) {
    f.layoutSizingHorizontal = o.w != null ? 'FIXED' : 'HUG';
    f.layoutSizingVertical = o.h != null ? 'FIXED' : 'HUG';
  }
  if (o.radius != null) R(f, o.radius);
  if (o.stroke) strokeOf(f, o.stroke, o.sw, o.dash);
  if (o.opacity != null) f.opacity = o.opacity;
  if (o.children) addAll(f, o.children);
  return f;
}
function H(o, kids) { o = o || {}; o.dir = 'H'; if (kids) o.children = kids; return F(o); }
function VV(o, kids) { o = o || {}; o.dir = 'V'; if (kids) o.children = kids; return F(o); }

function rect(w, h, token, name, r) {
  var n = figma.createRectangle();
  n.name = name || 'Rect';
  n.resize(Math.max(w, 0.01), Math.max(h, 0.01));
  n.fills = token ? [P(token)] : [];
  if (r != null) R(n, r);
  return n;
}
function dot(size, token, name) {
  var e = figma.createEllipse();
  e.name = name || 'Dot';
  e.resize(size, size);
  e.fills = token ? [P(token)] : [];
  return e;
}
function divider() { return fillW(rect(10, 1, 'border/default', 'Divider')); }
function spacer() { var s = F({ name: 'Spacer', dir: 'H' }); return fillW(s); }

/* Text builder. o: { name, w, fill, align, strike, opacity } */
function Tx(str, style, color, o) {
  o = o || {};
  var s = STY[style];
  if (!s) throw new Error('Unknown text style: ' + style);
  var t = figma.createText();
  t.name = o.name || String(str).slice(0, 40);
  t.fontName = s.font;
  t.fontSize = s.size;
  t.lineHeight = { unit: 'PIXELS', value: s.lh };
  t.letterSpacing = { unit: 'PERCENT', value: s.ls };
  if (s.upper) t.textCase = 'UPPER';
  t.characters = String(str);
  if (!o.noStyle) styleLater(t, s.id);
  t.fills = [P(color || 'text/primary')];
  if (o.align) t.textAlignHorizontal = o.align;
  if (o.w) { t.textAutoResize = 'HEIGHT'; t.resize(o.w, t.height); } else t.textAutoResize = 'WIDTH_AND_HEIGHT';
  if (o.fill) { t.textAutoResize = 'HEIGHT'; fillW(t); }
  if (o.strike) t.textDecoration = 'STRIKETHROUGH';
  if (o.opacity != null) t.opacity = o.opacity;
  return t;
}
/* re-set a text node (often inside an instance) to another style: prose leaves Mono, data joins it */
function restyle(t, style, color) {
  var s = STY[style];
  if (!s) throw new Error('Unknown text style: ' + style);
  t.fontName = s.font;
  t.fontSize = s.size;
  t.lineHeight = { unit: 'PIXELS', value: s.lh };
  t.letterSpacing = { unit: 'PERCENT', value: s.ls };
  t.textCase = s.upper ? 'UPPER' : 'ORIGINAL';
  styleLater(t, s.id);
  if (color) t.fills = [P(color)];
  return t;
}

/* ---------------------------------------------------------------------
   Component helpers
   --------------------------------------------------------------------- */
function layers(root, name) {
  var out = [];
  (function walk(n) {
    var kids = n.children || [];
    for (var i = 0; i < kids.length; i++) {
      var ch = kids[i];
      if (ch.name === name) out.push(ch);
      if (ch.type !== 'INSTANCE' && 'children' in ch) walk(ch);
    }
  })(root);
  return out;
}
function wire(owner, prop, type, def, layerName, field) {
  var key;
  try { key = owner.addComponentProperty(prop, type, def); } catch (e) { console.warn('addComponentProperty ' + prop + ': ' + e.message); return null; }
  var targets = owner.type === 'COMPONENT_SET' ? owner.children : [owner];
  for (var i = 0; i < targets.length; i++) {
    var ls = layers(targets[i], layerName);
    for (var j = 0; j < ls.length; j++) {
      try {
        var refs = Object.assign({}, ls[j].componentPropertyReferences || {});
        refs[field] = key;
        ls[j].componentPropertyReferences = refs;
      } catch (e2) { console.warn('ref ' + prop + ': ' + e2.message); }
    }
  }
  return key;
}
function wireText(owner, names) { for (var i = 0; i < names.length; i++) wire(owner, names[i], 'TEXT', firstText(owner, names[i]), names[i], 'characters'); }
function firstText(owner, layerName) {
  var targets = owner.type === 'COMPONENT_SET' ? owner.children : [owner];
  for (var i = 0; i < targets.length; i++) {
    var ls = layers(targets[i], layerName);
    for (var j = 0; j < ls.length; j++) if (ls[j].type === 'TEXT') return ls[j].characters;
  }
  return layerName;
}
function expose(inst) { try { inst.isExposedInstance = true; } catch (e) { /* older API */ } return inst; }

function combine(comps, parent, name, doc) {
  var set = figma.combineAsVariants(comps, parent);
  set.name = name;
  if (doc) set.description = doc;
  set.layoutMode = 'HORIZONTAL';
  set.layoutWrap = 'WRAP';
  set.itemSpacing = 20;
  set.counterAxisSpacing = 20;
  set.paddingTop = set.paddingBottom = set.paddingLeft = set.paddingRight = 28;
  set.fills = [P('bg/sunken')];
  strokeOf(set, 'border/strong', 1, [4, 4]);
  set.cornerRadius = 12;
  try { set.layoutSizingHorizontal = 'FILL'; set.layoutSizingVertical = 'HUG'; } catch (e) { set.resize(1400, set.height); }
  STATS.components++; STATS.variants += comps.length;
  return set;
}
function single(comp, parent, doc) {
  if (doc) comp.description = doc;
  add(parent, comp);
  STATS.components++;
  return comp;
}
function variantOf(set, props) {
  var want = Object.assign({}, set.defaultVariant.variantProperties, props || {});
  var kids = set.children;
  for (var i = 0; i < kids.length; i++) {
    var vp = kids[i].variantProperties, ok = true;
    for (var k in want) if (vp[k] !== want[k]) { ok = false; break; }
    if (ok) return kids[i];
  }
  console.warn('No variant ' + JSON.stringify(props) + ' in ' + set.name);
  return set.defaultVariant;
}
function inst(compOrSet, props) {
  var comp = compOrSet.type === 'COMPONENT_SET' ? variantOf(compOrSet, props) : compOrSet;
  return comp.createInstance();
}
function applyProp(i, k, val) {
  var props = i.componentProperties || {};
  for (var pk in props) {
    if (pk.split('#')[0] !== k) continue;
    var type = props[pk].type, o = {};
    if (type === 'VARIANT') { o[pk] = String(val); i.setProperties(o); return true; }
    if (type === 'TEXT' && typeof val === 'string') { o[pk] = val; i.setProperties(o); return true; }
    if (type === 'BOOLEAN' && typeof val === 'boolean') { o[pk] = val; i.setProperties(o); return true; }
    if (type === 'INSTANCE_SWAP' && val && val.id) { o[pk] = val.id; i.setProperties(o); return true; }
  }
  return false;
}
/* Set properties by name on an instance or any nested instance; fall back to a text layer of that name. */
function setP(i, map) {
  for (var k in map) {
    var val = map[k];
    if (applyProp(i, k, val)) continue;
    var nested = i.findAll(function (n) { return n.type === 'INSTANCE'; });
    var done = false;
    for (var j = 0; j < nested.length && !done; j++) done = applyProp(nested[j], k, val);
    if (done) continue;
    if (typeof val === 'string') {
      var t = i.findOne(function (n) { return n.type === 'TEXT' && n.name === k; });
      if (t) { t.characters = val; continue; }
    }
    console.warn('No property "' + k + '" on ' + i.name);
  }
  return i;
}
function nested(i, name) { return i.findOne(function (n) { return n.type === 'INSTANCE' && n.name === name; }); }
function named(i, name) { return i.findOne(function (n) { return n.name === name; }); }

/* ---------------------------------------------------------------------
   Fonts
   --------------------------------------------------------------------- */
var FAMILIES = {
  display: ['Fraunces', 'Playfair Display', 'Inter'],
  body: ['Outfit', 'Inter'],
  mono: ['DM Mono', 'Roboto Mono', 'Inter']
};
var AVAILABLE = null;
var FALLBACKS = [];
function norm(s) { return s.toLowerCase().replace(/\s+/g, ''); }
function base(s) { return norm(s.replace(/^\d+pt\s*/i, '')); }

function resolveFont(role, style) {
  var key = role + '/' + style;
  if (FONT[key]) return Promise.resolve(FONT[key]);
  var fams = FAMILIES[role];
  var tryAt = function (idx) {
    if (idx >= fams.length) return Promise.reject(new Error('No font for ' + key));
    var fam = fams[idx];
    var styles = AVAILABLE.filter(function (f) { return f.fontName.family === fam; }).map(function (f) { return f.fontName.style; });
    if (!styles.length) return tryAt(idx + 1);
    var pick = styles.filter(function (s) { return norm(s) === norm(style); })[0];
    if (!pick) {
      var cands = styles.filter(function (s) { return base(s) === norm(style); });
      pick = cands.filter(function (s) { return /72pt/i.test(s); })[0] || cands.filter(function (s) { return /144pt/i.test(s); })[0] || cands[0];
    }
    if (!pick && style === 'Light') pick = styles.filter(function (s) { return base(s) === 'regular'; })[0];
    if (!pick) pick = styles.filter(function (s) { return base(s) === 'regular'; })[0] || styles[0];
    var font = { family: fam, style: pick };
    return figma.loadFontAsync(font).then(function () {
      if (idx > 0) FALLBACKS.push(fams[0] + ' ' + style + ' → ' + fam + ' ' + pick);
      FONT[key] = font;
      return font;
    }, function () { return tryAt(idx + 1); });
  };
  return tryAt(0);
}

async function loadFonts() {
  AVAILABLE = await figma.listAvailableFontsAsync();
  await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
  var need = [['display', 'Regular'], ['display', 'Italic'], ['display', 'SemiBold'], ['body', 'Light'], ['body', 'Regular'], ['body', 'Medium'], ['mono', 'Regular'], ['mono', 'Medium']];
  for (var i = 0; i < need.length; i++) await resolveFont(need[i][0], need[i][1]);
}

/* ---------------------------------------------------------------------
   Cleanup of an earlier run
   --------------------------------------------------------------------- */
async function cleanup() {
  var cols = await figma.variables.getLocalVariableCollectionsAsync();
  for (var i = 0; i < cols.length; i++) if (cols[i].name.indexOf(DS + ' / ') === 0) cols[i].remove();
  var typeNames = TYPE.map(function (t) { return DS + '/' + t[0]; });
  var ts = await figma.getLocalTextStylesAsync();
  for (var j = 0; j < ts.length; j++) if (typeNames.indexOf(ts[j].name) >= 0) ts[j].remove();
  var effNames = EFFECTS.map(function (e) { return DS + '/' + e[0]; });
  var es = await figma.getLocalEffectStylesAsync();
  for (var k = 0; k < es.length; k++) if (effNames.indexOf(es[k].name) >= 0) es[k].remove();
}

/* ---------------------------------------------------------------------
   Variables & styles
   --------------------------------------------------------------------- */
function scopesFor(name) {
  if (name.indexOf('text/') === 0) return ['TEXT_FILL', 'STROKE_COLOR', 'SHAPE_FILL'];
  if (name.indexOf('border/') === 0) return ['STROKE_COLOR'];
  if (name.indexOf('bg/') === 0 || name.indexOf('surface/') === 0) return ['FRAME_FILL', 'SHAPE_FILL'];
  return ['ALL_SCOPES'];
}
function buildVariables() {
  var col = figma.variables.createVariableCollection(DS + ' / Color');
  var dark = col.modes[0].modeId;
  col.renameMode(dark, 'Dark');
  var light = col.addMode('Light');
  COLORS.forEach(function (c) {
    var v = figma.variables.createVariable(c[0], col, 'COLOR');
    v.setValueForMode(dark, rgba(c[1]));
    v.setValueForMode(light, rgba(c[2]));
    if (c[3]) v.description = c[3];
    try { v.scopes = scopesFor(c[0]); } catch (e) { /* ignore */ }
    V[c[0]] = v;
  });
  var dim = figma.variables.createVariableCollection(DS + ' / Dimension');
  var m = dim.modes[0].modeId;
  dim.renameMode(m, 'Default');
  SPACE.forEach(function (s) {
    var v = figma.variables.createVariable('space/' + s, dim, 'FLOAT');
    v.setValueForMode(m, s);
    try { v.scopes = ['GAP']; } catch (e) { /* ignore */ }
    V['space/' + s] = v;
  });
  RADII.forEach(function (r) {
    var v = figma.variables.createVariable(r[0], dim, 'FLOAT');
    v.setValueForMode(m, r[1]);
    try { v.scopes = ['CORNER_RADIUS']; } catch (e) { /* ignore */ }
    RADV[r[1]] = v;
  });
  COLL = { color: col, dark: dark, light: light, dim: dim };
}
function buildStyles() {
  TYPE.forEach(function (t) {
    var font = FONT[t[1] + '/' + t[2]];
    var s = figma.createTextStyle();
    s.name = DS + '/' + t[0];
    s.fontName = font;
    s.fontSize = t[3];
    s.lineHeight = { unit: 'PIXELS', value: t[4] };
    s.letterSpacing = { unit: 'PERCENT', value: t[5] };
    if (t[6]) s.textCase = 'UPPER';
    s.description = font.family + ' ' + font.style + ' · ' + t[3] + '/' + t[4];
    STY[t[0]] = { id: s.id, font: font, size: t[3], lh: t[4], ls: t[5], upper: !!t[6] };
  });
  EFFECTS.forEach(function (e) {
    var s = figma.createEffectStyle();
    s.name = DS + '/' + e[0];
    s.effects = e[1];
    EFX[e[0]] = s.id;
  });
}
function effect(node, name) { PENDING.push(node.setEffectStyleIdAsync(EFX[name])); return node; }

/* ---------------------------------------------------------------------
   Icons (24 × 24, 1.75 stroke, round caps)
   --------------------------------------------------------------------- */
var ICONS = {
  'truck': '<path d="M1 5h14v11H1z"/><path d="M15 9h4l3 3v4h-7"/><circle cx="5.5" cy="18" r="2"/><circle cx="18.5" cy="18" r="2"/>',
  'plane': '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>',
  'route': '<circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/>',
  'shield': '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
  'file': '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
  'check': '<path d="M20 6 9 17l-5-5"/>',
  'x': '<path d="M18 6 6 18M6 6l12 12"/>',
  'alert': '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h16.9a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  'info': '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  'clock': '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  'calendar': '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  'pin': '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
  'snowflake': '<path d="M2 12h20M12 2v20M20 16l-4-4 4-4M4 8l4 4-4 4M16 4l-4 4-4-4M8 20l4-4 4 4"/>',
  'box': '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
  'stall': '<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M4 9h16M12 9v12"/>',
  'plus': '<path d="M12 5v14M5 12h14"/>',
  'arrow-right': '<path d="M5 12h14M13 6l6 6-6 6"/>',
  'arrow-left': '<path d="M19 12H5M11 18l-6-6 6-6"/>',
  'arrow-up': '<path d="M12 19V5M6 11l6-6 6 6"/>',
  'chevron-down': '<path d="m6 9 6 6 6-6"/>',
  'upload': '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5M12 3v12"/>',
  'lock': '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  'unlock': '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>',
  'medical': '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/>',
  'flag': '<path d="M4 22V4"/><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1"/>',
  'foal': '<circle cx="8.5" cy="10" r="5.5"/><circle cx="18" cy="16" r="3.5"/>',
  'coffee': '<path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><path d="M6 2v2M10 2v2M14 2v2"/>',
  'users': '<circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="M16 3.1a4 4 0 0 1 0 7.8M21 21v-2a4 4 0 0 0-3-3.9"/>',
  'history': '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l4 2"/>',
  'grip': '<path d="M9 5h.01M9 12h.01M9 19h.01M15 5h.01M15 12h.01M15 19h.01" stroke-width="3"/>',
  'scale': '<path d="M12 3v18M5 7h14"/><path d="m5 7-3 7a3 3 0 0 0 6 0zM19 7l-3 7a3 3 0 0 0 6 0z"/>',
  'menu': '<path d="M4 6h16M4 12h16M4 18h16"/>',
  'moon': '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  'sun': '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  'pencil': '<path d="M17 3a2.85 2.85 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
  'eye': '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  'bell': '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  'phone': '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>'
};

function buildIcons(parent) {
  var names = Object.keys(ICONS);
  for (var i = 0; i < names.length; i++) {
    var n = names[i];
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">' + ICONS[n] + '</svg>';
    var frame = figma.createNodeFromSvg(svg);
    var comp = figma.createComponentFromNode(frame);
    comp.name = 'Icon/' + n;
    comp.fills = [];
    comp.description = 'Icon · ' + n + ' · 24 px grid, 1.75 stroke. Colour via stroke override.';
    var kids = comp.children;
    for (var k = 0; k < kids.length; k++) { try { kids[k].constraints = { horizontal: 'SCALE', vertical: 'SCALE' }; } catch (e) { /* groups */ } }
    tint(comp, 'text/primary');
    ICON[n] = comp;
    var cell = VV({ name: n, gap: 10, pad: [16, 8, 12, 8], w: 104, cross: 'CENTER', radius: 8, fill: 'surface/card', stroke: 'border/default' });
    add(cell, comp);
    add(cell, Tx(n, 'Mono/Caption', 'text/tertiary', { name: 'Name' }));
    add(parent, cell);
    STATS.components++;
  }
}
function Ic(name, size, color) {
  var i = ICON[name].createInstance();
  i.name = 'Icon';
  var s = size || 24;
  i.resize(s, s);
  if (color) tint(i, color);
  return i;
}
