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
  ['Mono/Eyebrow', 'mono', 'Regular', 11, 14, 14, true],
  ['Mono/Chip', 'mono', 'Medium', 11, 12, 8, true]
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
var FONT = {};     // role/style -> FontName
var PENDING = [];  // async style applications
var SZ = {};       // node.id -> deferred sizing ({ w, h, abs })
var STATS = { components: 0, variants: 0 };

function flush() { var p = PENDING.splice(0); return Promise.all(p); }

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
  if (!o.noStyle) PENDING.push(t.setTextStyleIdAsync(s.id));
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
  PENDING.push(t.setTextStyleIdAsync(s.id));
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
/* =====================================================================
   Page builders: Foundations, Screens, Cover
   ===================================================================== */
function money(n, dp) {
  var d = dp == null ? 2 : dp;
  var s = Math.abs(n).toFixed(d).split('.');
  s[0] = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (n < 0 ? '-$' : '$') + s.join('.');
}
function panel(name, o) {
  o = o || {};
  return VV({ name: name, gap: o.gap != null ? o.gap : 16, pad: o.pad != null ? o.pad : 24, w: o.w, radius: 12, fill: o.fill || 'surface/card', stroke: o.stroke || 'border/default', clip: o.clip });
}
function dlRow(label, value, o) {
  o = o || {};
  var r = H({ name: label, gap: 16, cross: 'CENTER', main: 'SPACE_BETWEEN' });
  add(r, Tx(label, o.labelStyle || 'Body/S', 'text/secondary', { name: 'Label' }));
  add(r, Tx(value, o.valueStyle || 'Mono/Data', o.valueColor || 'text/primary', { name: 'Value', align: 'RIGHT' }));
  return fillW(r);
}
function place(nodes, x0, y0, gap) {
  var x = x0;
  for (var i = 0; i < nodes.length; i++) { nodes[i].x = x; nodes[i].y = y0; x += nodes[i].width + gap; }
  return x;
}

/* ---------------------------------------------------------------------
   Foundations
   --------------------------------------------------------------------- */
var COLOR_GROUPS = [
  ['Background & surface', ['bg/canvas', 'bg/sunken', 'bg/input', 'surface/card', 'surface/raised', 'surface/muted']],
  ['Border & text', ['border/default', 'border/strong', 'text/primary', 'text/secondary', 'text/tertiary']],
  ['Accent · gold means act', ['accent/default', 'accent/hover', 'accent/on', 'accent/text', 'accent/soft', 'accent/line']],
  ['Status · always paired with a word', ['status/ok/fg', 'status/ok/bg', 'status/ok/border', 'status/warn/fg', 'status/warn/bg', 'status/warn/border', 'status/bad/fg', 'status/bad/bg', 'status/bad/border', 'status/info/fg', 'status/info/bg', 'status/info/border']],
  ['Stall types', ['stall/standard', 'stall/box', 'stall/climate']],
  ['Materials & coats', ['material/brass-light', 'material/brass-dark', 'material/brass-ink', 'coat/grey', 'coat/black', 'coat/chestnut', 'coat/bay']]
];
function colorPanel(mode) {
  var dark = mode === 'Dark';
  var p = VV({ name: 'Colour · ' + mode, gap: 28, pad: 40, w: 1080, radius: 16, fill: 'bg/canvas', stroke: 'border/default' });
  if (!dark) p.setExplicitVariableModeForCollection(COLL.color, COLL.light);
  add(p, Tx(mode + ' mode', 'Heading/H3'));
  var hex = {};
  COLORS.forEach(function (c) { hex[c[0]] = dark ? c[1] : c[2]; });
  COLOR_GROUPS.forEach(function (g) {
    add(p, Tx(g[0], 'Mono/Eyebrow', 'text/tertiary'));
    var row = H({ name: g[0], gap: 16, wrap: true, rowGap: 20 });
    g[1].forEach(function (tok) {
      var cell = VV({ name: tok, gap: 6, w: 150 });
      var sw = rect(150, 64, tok, 'Swatch', 8);
      sw.strokes = [P('border/default')]; sw.strokeWeight = 1; sw.strokeAlign = 'INSIDE';
      addAll(cell, [sw, Tx(tok, 'Mono/Caption', 'text/primary', { name: 'Token', w: 150 }), Tx(hex[tok].toUpperCase(), 'Mono/Caption', 'text/tertiary', { name: 'Hex' })]);
      add(row, cell);
    });
    add(p, fillW(row));
  });
  return p;
}
var TYPE_SAMPLES = {
  'Display/XL': 'Precision transport', 'Display/L': 'Clearance', 'Display/M': '$11,300 – $16,100',
  'Heading/H3': 'Departure locked', 'Heading/H4': 'Shadowfax',
  'Body/L': 'Every document is checked against your travel dates.',
  'Body/M': 'All horses in one request share the same route and dates.',
  'Body/S': 'Valid today, but 77 days old at departure. A new test must be dated 19 Aug 2026 or later.',
  'Label/M': 'Request transport', 'Label/S': 'Edit profile',
  'Mono/Data L': '38,019.20', 'Mono/Data': 'CBRT-2026-041', 'Mono/Caption': 'v2 · 23 Sep 2026',
  'Mono/Eyebrow': 'Transport specialist', 'Mono/Chip': 'Cleared'
};
var PRINCIPLES = [
  ['Gold means act.', 'Gold marks the one forward action on a view and the brand. It never signals status, so a gold element is always something you can press.'],
  ['Status is said twice.', 'Every state pairs a tone with a word: Cleared, In review, Expires in transit, Fails rule, Required. It survives colour blindness and greyscale print.'],
  ['Mono is for data.', 'Codes, dates, weights, microchips and money use DM Mono with tabular figures. Names and prose never do.'],
  ['Fraunces carries names.', 'Horses, stops and page titles use the display face, never below 18 px. Outfit carries everything people read at length.'],
  ['The gate is visible from operations.', 'Load plan and route views repeat the clearance state, so nobody dispatches around it.'],
  ['Estimates are ranges.', 'Customer-facing prices before a quotation is issued are always a low–high range with a non-binding notice.']
];
function buildFoundations(page) {
  var board = VV({ name: 'Foundations', gap: 56, pad: 80, w: 2360, fill: 'bg/canvas' });
  page.appendChild(board);
  var intro = VV({ name: 'Intro', gap: 12 });
  addAll(intro, [Tx('Foundations', 'Display/L'), Tx('Tokens live in two variable collections: EquiFreight / Color (Dark and Light modes) and EquiFreight / Dimension (space and radius). Components bind to these, so switching a frame\'s mode re-themes everything inside it.', 'Body/L', 'text/secondary', { w: 900 })]);
  add(board, intro);

  var pr = H({ name: 'Principles', gap: 20, wrap: true, rowGap: 20 });
  PRINCIPLES.forEach(function (p, i) {
    var c = panel('Principle ' + (i + 1), { w: 720, gap: 8 });
    addAll(c, [Tx(p[0], 'Heading/H3'), Tx(p[1], 'Body/M', 'text/secondary', { fill: true })]);
    add(pr, c);
  });
  add(board, fillW(pr));

  var colors = H({ name: 'Colour', gap: 40 });
  addAll(colors, [colorPanel('Dark'), colorPanel('Light')]);
  add(board, colors);

  var typeP = panel('Typography', { w: 2200, gap: 0, pad: 0, clip: true });
  var th = H({ name: 'Faces', gap: 48, pad: [28, 32, 28, 32], fill: 'bg/sunken' });
  addAll(th, [
    Tx('Display · ' + FONT['display/Regular'].family, 'Heading/H4', 'text/primary'),
    Tx('Body · ' + FONT['body/Regular'].family, 'Label/M', 'text/primary'),
    Tx('Data · ' + FONT['mono/Regular'].family, 'Mono/Data', 'text/primary')
  ]);
  add(typeP, fillW(th));
  TYPE.forEach(function (t) {
    var row = H({ name: t[0], gap: 40, pad: [18, 32, 18, 32], cross: 'CENTER' });
    borderSide(row, 'border/default', 'top');
    var meta = VV({ name: 'Meta', gap: 2, w: 300 });
    var f = FONT[t[1] + '/' + t[2]];
    addAll(meta, [Tx(DS + '/' + t[0], 'Mono/Caption', 'text/secondary'), Tx(f.family + ' ' + f.style + ' · ' + t[3] + '/' + t[4] + (t[5] ? ' · ' + t[5] + '%' : '') + (t[6] ? ' · caps' : ''), 'Mono/Caption', 'text/tertiary')]);
    addAll(row, [meta, Tx(TYPE_SAMPLES[t[0]], t[0], 'text/primary', { fill: true })]);
    add(typeP, fillW(row));
  });
  add(board, typeP);

  var dims = H({ name: 'Space, radius, elevation', gap: 40 });
  var sp = panel('Space', { w: 700, gap: 10 });
  add(sp, Tx('Space · EquiFreight / Dimension', 'Heading/H3'));
  SPACE.forEach(function (s) {
    var r = H({ name: 'space/' + s, gap: 16, cross: 'CENTER' });
    var bar = rect(Math.max(s * 3, 2), 12, 'surface/muted', 'Bar', 2);
    bar.strokes = [P('border/strong')]; bar.strokeWeight = 1;
    addAll(r, [Tx('space/' + s, 'Mono/Caption', 'text/secondary', { w: 90 }), bar, Tx(s + ' px', 'Mono/Caption', 'text/tertiary')]);
    add(sp, r);
  });
  var rd = panel('Radius', { w: 700, gap: 20 });
  add(rd, Tx('Radius', 'Heading/H3'));
  var rrow = H({ name: 'Radii', gap: 20 });
  RADII.forEach(function (r) {
    var cell = VV({ name: r[0], gap: 8, cross: 'CENTER' });
    var sq = rect(88, 88, 'surface/muted', 'Sample', r[1]);
    sq.strokes = [P('border/strong')]; sq.strokeWeight = 1;
    addAll(cell, [sq, Tx(r[0] + ' · ' + r[1], 'Mono/Caption', 'text/tertiary')]);
    add(rrow, cell);
  });
  add(rd, rrow);
  add(rd, Tx('Controls 8 · cards 12 · dialogs and heroes 16 · chips pill · nameplate 4', 'Body/S', 'text/secondary'));
  var el = panel('Elevation', { w: 720, gap: 20 });
  add(el, Tx('Elevation & materials', 'Heading/H3'));
  var erow = H({ name: 'Effects', gap: 24 });
  EFFECTS.forEach(function (e) {
    var cell = VV({ name: e[0], gap: 10, cross: 'CENTER' });
    var sq = F({ name: 'Sample', w: 140, h: 88, radius: 12, fill: 'surface/raised' });
    if (e[0] === 'Material/Brass') sq.fills = [gradient([[0, '#EAD08C'], [0.55, '#C9AA5A'], [1, '#9C7C33']])];
    effect(sq, e[0]);
    addAll(cell, [sq, Tx(e[0], 'Mono/Caption', 'text/tertiary')]);
    add(erow, cell);
  });
  add(el, erow);
  addAll(dims, [sp, VV({ name: 'Column', gap: 40 }, [rd, el])]);
  add(board, dims);
  return board;
}

/* ---------------------------------------------------------------------
   Screen scaffolding
   --------------------------------------------------------------------- */
function screen(name, active, blocks, o) {
  o = o || {};
  var s = VV({ name: name, w: SCREEN_W, fill: 'bg/canvas' });
  var hdr = inst(C.header);
  if (active) setP(nested(hdr, 'Nav · ' + active), { State: 'Active' });
  add(s, fillW(hdr));
  var main = VV({ name: 'Content', gap: o.gap != null ? o.gap : 28, pad: [0, PADX, 96, PADX] });
  for (var i = 0; i < blocks.length; i++) add(main, fillW(blocks[i]));
  add(s, fillW(main));
  add(s, fillW(footer('Full', o.asOf)));
  return s;
}
function footer(size, asOf) { var f = inst(C.footer, { Size: size }); if (asOf) setP(f, { 'As of': asOf }); return f; }
/* ---------- the one page header ----------
   Every page (owner, tracking, staff) opens with it: an optional back link, the title (or a
   banner such as a horse's coat), then either a mono code with a one-line summary or a short
   paragraph, and a right slot for chips, a deadline or a control. A page without a back link
   reserves the back row, so every title in a shell sits at the same height (owner 142, staff 143).
   o: { shell: 'owner'|'staff', back, title, banner, code, summary, metaChips, right: [nodes], below: [nodes], rule } */
var HEAD_TOP = { owner: 32, staff: 28 };
/* two side-column widths on the 1440 grid, both at a 24 gutter: narrow for a decision, the people,
   an estimate or the cab's context; wide for a route or the stages */
var SIDE = { narrow: 400, wide: 456 };
var BACK_ROW = 46; // a Ghost SM back link (32) plus the header's 14 gap
function pageHeader(o) {
  var top = HEAD_TOP[o.shell || 'owner'];
  var wrap = VV({ name: 'Page header', gap: 14, pad: [o.back ? top : top + BACK_ROW, 0, o.rule === false ? 0 : 24, 0] });
  if (o.rule !== false) borderSide(wrap, 'border/default', 'bottom');
  if (o.back) add(wrap, btn('Ghost', 'SM', o.back, { lead: 'arrow-left' }));
  if (o.banner) add(wrap, fillW(o.banner));
  var row = H({ name: 'Title row', gap: 24, main: 'SPACE_BETWEEN', cross: 'MAX' });
  var t = VV({ name: 'Title block', gap: 8 });
  if (o.title) add(t, Tx(o.title, 'Display/L', 'text/primary', { name: 'Title' }));
  if (o.code || o.metaChips) {
    var m = H({ name: 'Meta', gap: 10, cross: 'CENTER' });
    if (o.code) add(m, Tx(o.code, 'Mono/Data', 'text/secondary', { name: 'Code' }));
    if (o.summary) add(m, Tx(o.summary, 'Body/M', 'text/secondary', { name: 'Summary' }));
    (o.metaChips || []).forEach(function (c) { add(m, c); });
    add(t, m);
  } else if (o.summary) add(t, Tx(o.summary, 'Body/M', 'text/secondary', { name: 'Summary', w: 640 }));
  var r = H({ name: 'Status', gap: 8, cross: 'CENTER' });
  (o.right || []).forEach(function (c) { if (c) add(r, c); });
  // an empty hug frame keeps Figma's default 100px height and pushes the title down
  add(row, t);
  if (r.children.length) add(row, r); else r.remove();
  add(wrap, fillW(row));
  (o.below || []).forEach(function (n) { add(wrap, fillW(n)); });
  return wrap;
}
/* REQ-2026-0193 as the customer sent it; the Review step, In review and Yến's review read these rows */
var REQ_0193 = [
  ['Horses', 'Shadowfax, Nightfall'],
  ['Service', 'Road, shared load, climate-controlled stall'],
  ['Insurance', 'Your own policy'],
  ['Pickup', 'Phú Thọ training centre, Ho Chi Minh City'],
  ['Route', 'Ho Chi Minh City → Bangkok via Mộc Bài – Bavet and Poipet – Aranyaprathet'],
  ['Departure', '30 Oct 2026 ±3 d', true],
  ['Instructions', 'Quiet loading. Arrive by 07:00 for vet check.']
];
/* rows: [label, value, mono]; o: { title, edit, bare, only: [labels], extra: [[label, value, mono]] }
   bare: no card of its own, for use inside another panel */
function requestSummary(rows, o) {
  o = o || {};
  var list = rows.filter(function (r) { return !o.only || o.only.indexOf(r[0]) >= 0; }).concat(o.extra || []);
  var p = panel(o.title || 'Summary', { gap: 0, pad: o.bare ? [4, 0, 0, 0] : (o.title ? [20, 24, 12, 24] : 0), clip: !o.title });
  if (o.bare) { p.fills = []; p.strokes = []; }
  if (o.title) add(p, VV({ name: 'Title', pad: [0, 0, 12, 0] }, [Tx(o.title, 'Heading/H4')]));
  list.forEach(function (r, i) {
    var row = H({ name: r[0], gap: 24, pad: o.title ? [10, 0, 10, 0] : [16, 24, 16, 24], cross: 'CENTER' });
    if (i || o.title) borderSide(row, 'border/default', 'top');
    addAll(row, [Tx(r[0], 'Body/S', 'text/secondary', { name: 'Label', w: o.title ? 120 : 140 }), Tx(r[1], r[2] ? 'Mono/Data' : (o.title ? 'Label/S' : 'Body/M'), 'text/primary', { name: 'Value', fill: true })]);
    if (o.edit) add(row, Tx('Edit', 'Label/S', 'text/secondary'));
    add(p, fillW(row));
  });
  return p;
}
function pageHead(title, sub, right) { return pageHeader({ title: title, summary: sub, right: [right] }); }
function section(title, sub, content) {
  var s = VV({ name: title, gap: 32, pad: [80, 0, 0, 0] });
  var h = VV({ name: 'Section header', gap: 10 });
  add(h, Tx(title, 'Display/L'));
  if (sub) add(h, Tx(sub, 'Body/M', 'text/secondary', { w: 680 }));
  addAll(s, [h, fillW(content)]);
  return s;
}
function stepper(states) {
  var labels = ['Horses', 'Service', 'Route & dates', 'Review'];
  var r = H({ name: 'Stepper', gap: 16, cross: 'CENTER', pad: [8, 0, 8, 0] });
  for (var i = 0; i < 4; i++) {
    add(r, stepI(states[i], i + 1, labels[i]));
    if (i < 3) add(r, fillW(rect(40, 1, states[i] === 'Done' ? 'status/ok/border' : 'border/default', 'Connector')));
  }
  return r;
}

/* ---------------------------------------------------------------------
   Domain data (demo)
   --------------------------------------------------------------------- */
var HORSES = [
  { name: 'Shadowfax', coat: 'Grey', sub: 'Andalusian · Gelding', tags: [['Ok', 'Calm']], age: '7 y', height: '16.2 hh', weight: '510 kg', size: 'M · 32', chip: '250 259 600 123 456', value: '$85,000', notes: 'Annual vaccinations up to date. No known allergies. Loads best in a quiet yard.', ready: '3 of 5 cleared', pct: 60 },
  { name: 'Nightfall', coat: 'Black', sub: 'Thoroughbred · Mare', tags: [['Warn', 'Nervous'], ['Info', 'Climate stall']], age: '4 y', height: '16.0 hh', weight: '478 kg', size: 'M · 32', chip: '250 259 600 223 311', value: '$240,000', notes: 'Sensitive to loud noise. Needs a slow, gentle load and a climate-controlled stall.', ready: '3 of 5 cleared', pct: 60 },
  { name: 'Copper King', coat: 'Chestnut', sub: 'Quarter Horse · Stallion', tags: [['Bad', 'Aggressive'], ['Neutral', 'Box stall']], age: '9 y', height: '15.3 hh', weight: '583 kg', size: 'L · 48', chip: '985 141 000 876 502', value: '$120,000', notes: 'Box stall only. Never next to a mare. Experienced handlers only.', ready: '4 of 5 cleared', pct: 80 },
  { name: 'Silver Bell', coat: 'Grey', sub: 'Lipizzan · Mare', tags: [['Ok', 'Calm']], age: '6 y', height: '15.1 hh', weight: '445 kg', size: 'M · 32', chip: '203 098 100 554 120', value: '$60,000', notes: 'Travels well. Hay net at shoulder height.', ready: '2 of 5 cleared', pct: 40 }
];
function horseCard(h) {
  var c = inst(C.horse, { Coat: h.coat });
  setP(c, { Name: h.name, Subtitle: h.sub, Age: h.age, Height: h.height, Weight: h.weight, Size: h.size, Microchip: h.chip, 'Declared value': h.value, Notes: h.notes, Readiness: h.ready });
  setP(nested(c, 'Tag 1'), { Label: h.tags[0][1], Tone: h.tags[0][0] });
  if (h.tags[1]) setP(nested(c, 'Tag 2'), { Label: h.tags[1][1], Tone: h.tags[1][0] });
  else setP(c, { 'Show tag 2': false });
  setP(nested(c, 'Readiness bar'), { Value: String(h.pct), Tone: h.pct >= 80 ? 'Ok' : 'Neutral' });
  c.name = 'Horse card · ' + h.name;
  return c;
}

/* ---------------------------------------------------------------------
   Screen: Home
   --------------------------------------------------------------------- */
var HOME_COMMITMENTS = [
  ['6', 'Countries, by road and air', 'Vietnam, Cambodia, Thailand, Laos, Malaysia and Hong Kong.'],
  ['21 days', 'Lead time across a border', 'Three days within one country. Too-early requests are told the earliest valid date.'],
  ['7 days', 'A quotation holds its price', 'Itemised line by line from a rate catalog pinned to that quote.'],
  ['1 per 3', 'Grooms to horses', 'Rounded up, so four horses travel with two grooms.']
];
async function scrHome() {
  var hero = H({ name: 'Hero', gap: 64, pad: [88, 0, 24, 0], cross: 'CENTER' });
  var left = VV({ name: 'Hero copy', gap: 24 });
  var h1 = Tx('Precision transport\nfor every horse', 'Display/XL', 'text/primary', { name: 'Headline', fill: true });
  await flush();
  var i = h1.characters.indexOf('transport');
  h1.setRangeFontName(i, i + 9, FONT['display/Italic']);
  var ctas = H({ name: 'Actions', gap: 12 });
  addAll(ctas, [btn('Primary', 'MD', 'Request transport', { trail: 'arrow-right' }), btn('Secondary', 'MD', 'Add a horse profile', { lead: 'plus' })]);
  addAll(left, [h1,
    Tx('Road and air moves across Vietnam, Cambodia, Thailand, Laos, Malaysia and Hong Kong. Every document is checked against your travel dates, and no horse leaves until clearance is complete.', 'Body/L', 'text/secondary', { w: 560 }),
    ctas]);
  addAll(hero, [fillW(left), heroCard()]);

  var services = H({ name: 'Service grid', gap: 24, wrap: true, rowGap: 24 });
  [
    ['truck', 'Domestic · up to 500 km', 'Regional road', 'Scheduled and private trailer runs between training centres, studs and racecourses in one country.', '$800'],
    ['route', 'VN · KH · TH · LA · MY', 'Cross-border road', 'Door to door, with every border document prepared, checked against your dates and filed for you.', '$2,400'],
    ['plane', 'Economy · Business · First', 'Air freight', 'Stall positions planned by width: 32 in, 48 in or a full 96 in box. A flying groom travels with every three horses.', '$9,500'],
    ['medical', 'Injury, rehab, post-surgery', 'Veterinary escort', 'A veterinarian travels with the horse and logs its condition at every stop.', '$650 / day'],
    ['flag', 'Arrive settled, on time', 'Race-day logistics', 'Timed to post time, with stabling at the venue and a groom who knows the horse.', '$1,600'],
    ['foal', 'Full box · 96 in', 'Mare & foal', 'Mare and foal travel together in a full-width box for the whole journey.', '$2,800']
  ].forEach(function (s) {
    var c = inst(C.service);
    setP(c, { Icon: ICON[s[0]], Scope: s[1], Title: s[2], Body: s[3], Price: s[4] });
    tint(named(c, 'Icon badge').children[0], 'text/secondary');
    c.name = 'Service · ' + s[2];
    add(services, c);
  });

  var how = H({ name: 'Steps', gap: 24 });
  /* the tracker's seven stages, grouped into four phases */
  [
    ['1–2', 'Request and Quotation', 'Tell us the horses, route and dates. You see an indicative range straight away; the itemised quotation follows review and holds for 7 days.', 'Logistics Manager'],
    ['3–4', 'Approval and Documents', 'You accept, the job is approved and your checklist opens. Every upload is checked against your travel dates.', 'Logistics Manager · Transport Specialist'],
    ['5–6', 'Clearance and Trip', 'Departure unlocks only when every document clears. On the road, the escort records each checkpoint and how the horses are.', 'Transport Specialist · Fleet & Route Coordinator'],
    ['7', 'Handover', 'You confirm the horses arrived sound, or report a problem, and the job closes.', 'You, with the escort']
  ].forEach(function (s, idx) {
    var c = VV({ name: 'Step ' + (idx + 1), gap: 12, pad: [24, 0, 0, 0] });
    borderSide(c, 'border/default', 'top');
    addAll(c, [Tx(s.shift(), 'Mono/Data L', 'text/tertiary'), Tx(s[0], 'Heading/H3'), Tx(s[1], 'Body/S', 'text/secondary', { fill: true }), Tx(s[2], 'Body/S', 'text/tertiary', { fill: true })]);
    add(how, fillW(c));
  });

  var feats = H({ name: 'Features', gap: 24 });
  addAll(feats, [
    featureCard(windowVisual(), 'Documents checked against your travel dates', 'A Coggins test that is valid today but 77 days old on departure day is flagged now, with the date a new test must carry.'),
    featureCard(widthVisual(), 'Stalls planned by width and temperament', 'A 96 in air stall takes three standard horses, two at 48 in, or one in a full box. Stallions get box stalls and never stand beside a mare.'),
    featureCard(quoteVisual(), 'Quotes that say what can move', 'Every line shows its basis. Lines that can change on the final invoice, such as waiting time, are marked before you accept.')
  ]);

  /* commitments the system enforces, not operating figures (PRODUCT.md: no stats presented as real) */
  var stats = H({ name: 'Stats', gap: 24, pad: [40, 0, 40, 0] });
  borderSide(stats, 'border/default', 'top');
  HOME_COMMITMENTS.forEach(function (s) {
    var c = VV({ name: s[1], gap: 6 });
    addAll(c, [Tx(s[0], 'Mono/Data L'), Tx(s[1], 'Label/M'), Tx(s[2], 'Body/S', 'text/secondary', { fill: true })]);
    add(stats, fillW(c));
  });

  return screen('Home', 'Home', [
    hero,
    section('Six ways to move a racehorse', 'Each service is priced from the same rate catalog. What you see here is a starting point; your quotation is itemised line by line.', services),
    section('Seven stages, one owner each', 'Your request page tracks the same seven stages, shown here in four phases. The next stage never starts until the one before it is done.', how),
    section('Built around the paperwork and the horse', null, feats),
    VV({ name: 'Stats wrap', pad: [80, 0, 0, 0] }, [fillW(stats)])
  ], { gap: 0 });
}
function heroCard() {
  var card = panel('Live job card', { w: 480, gap: 20, pad: 28 });
  R(card, 16);
  effect(card, 'Elevation/1 Card');
  var top = H({ name: 'Top', main: 'SPACE_BETWEEN', cross: 'CENTER' });
  var id = VV({ name: 'Job', gap: 2 });
  addAll(id, [Tx('Transport job', 'Body/S', 'text/tertiary'), Tx('CBRT-2026-041', 'Mono/Data', 'text/primary')]);
  addAll(top, [id, chip('Bad', 'Locked')]);
  add(card, fillW(top));

  var route = H({ name: 'Route', gap: 8 });
  [['Ho Chi Minh City', '06:00'], ['Mộc Bài – Bavet', '08:30'], ['Phnom Penh', '12:30']].forEach(function (s, idx) {
    var stop = VV({ name: s[0], gap: 6 });
    addAll(stop, [dot(10, 'text/tertiary'), Tx(s[0], 'Label/S', 'text/primary'), Tx(s[1], 'Mono/Caption', 'text/tertiary')]);
    add(route, stop);
    if (idx < 2) add(route, fillW(VV({ name: 'Leg', pad: [4, 0, 0, 0] }, [fillW(rect(40, 1, 'border/strong', 'Line'))])));
  });
  add(card, fillW(route));
  add(card, Tx('Departs 18 Oct 2026 · 4 horses · Road, private trailer', 'Body/S', 'text/secondary'));
  add(card, divider());
  add(card, Tx('Documents, checked against travel dates', 'Body/S', 'text/tertiary'));
  var tones = { c: 'status/ok/fg', r: 'status/info/fg', a: 'status/warn/fg', x: 'status/bad/fg' };
  [['Shadowfax', 'ccc-c', '4/5'], ['Nightfall', 'cca-c', '3/5'], ['Copper King', 'ccc-c', '4/5'], ['Silver Bell', 'cxc-x', '2/5']].forEach(function (h) {
    var row = H({ name: h[0], gap: 12, cross: 'CENTER' });
    var dots = H({ name: 'Dots', gap: 6, cross: 'CENTER' });
    h[1].split('').forEach(function (ch) {
      if (ch === '-') { var e = dot(10, null, 'Required'); e.strokes = [P('border/strong')]; e.strokeWeight = 1.5; add(dots, e); }
      else add(dots, dot(10, tones[ch]));
    });
    addAll(row, [Tx(h[0], 'Label/M', 'text/primary', { fill: true }), dots, Tx(h[2], 'Mono/Caption', 'text/secondary')]);
    add(card, fillW(row));
  });
  var legend = H({ name: 'Legend', gap: 14, wrap: true, rowGap: 6 });
  [['status/ok/fg', 'Cleared'], ['status/info/fg', 'In review'], ['status/warn/fg', 'Expires in transit'], ['status/bad/fg', 'Fails rule'], [null, 'Not uploaded']].forEach(function (l) {
    var it = H({ name: l[1], gap: 6, cross: 'CENTER' });
    var d = dot(8, l[0]);
    if (!l[0]) { d.strokes = [P('border/strong')]; d.strokeWeight = 1.5; }
    addAll(it, [d, Tx(l[1], 'Mono/Caption', 'text/tertiary')]);
    add(legend, it);
  });
  add(card, fillW(legend));
  var foot = H({ name: 'Gate', gap: 10, pad: [12, 14, 12, 14], radius: 8, cross: 'CENTER', fill: 'status/bad/bg', stroke: 'status/bad/border' });
  addAll(foot, [Ic('lock', 16, 'status/bad/fg'), Tx('Departure locked · 9 items outstanding', 'Label/S', 'text/primary', { fill: true }), Tx('Open clearance', 'Label/S', 'text/primary')]);
  add(card, fillW(foot));
  return card;
}
function featureCard(visual, title, body) {
  var c = panel(title, { gap: 16, pad: 28 });
  addAll(c, [fillW(visual), Tx(title, 'Heading/H3', 'text/primary', { fill: true }), Tx(body, 'Body/S', 'text/secondary', { fill: true })]);
  return fillW(c);
}
function windowVisual() {
  var f = VV({ name: 'Window visual', gap: 8, pad: 16, radius: 8, fill: 'bg/sunken' });
  var track = F({ name: 'Track', w: 300, h: 28 });
  var line = rect(300, 2, 'border/strong', 'Axis'); line.y = 13; track.appendChild(line);
  var win = rect(150, 10, 'status/ok/bg', 'Valid window', 999); win.x = 150; win.y = 9; win.strokes = [P('status/ok/border')]; win.strokeWeight = 1; track.appendChild(win);
  var issued = dot(12, 'status/warn/fg', 'Test date'); issued.x = 92; issued.y = 8; track.appendChild(issued);
  var dep = rect(2, 28, 'text/primary', 'Departure'); dep.x = 298; track.appendChild(dep);
  add(f, fillW(track));
  var lbl = H({ name: 'Labels', gap: 8, wrap: true, rowGap: 4 });
  addAll(lbl, [Tx('Test 2 Aug', 'Mono/Caption', 'status/warn/fg'), Tx('60-day window', 'Mono/Caption', 'status/ok/fg'), Tx('Departs 18 Oct', 'Mono/Caption', 'text/primary')]);
  add(f, fillW(lbl));
  add(f, chip('Warn', 'Expires in transit'));
  return f;
}
function widthVisual() {
  var f = VV({ name: 'Width visual', gap: 10, pad: 16, radius: 8, fill: 'bg/sunken' });
  [['Economy', 3, '3 × 32 in'], ['Business', 2, '2 × 48 in'], ['First', 1, '1 × 96 in']].forEach(function (r) {
    var row = H({ name: r[0], gap: 10, cross: 'CENTER' });
    var bar = H({ name: 'Stall', gap: 3, w: 180, h: 18 });
    for (var i = 0; i < r[1]; i++) add(bar, fillW(rect(10, 18, i === 0 ? 'stall/standard' : 'stall/box', 'Position', 4)));
    addAll(row, [Tx(r[0], 'Mono/Caption', 'text/secondary', { w: 70 }), bar, Tx(r[2], 'Mono/Caption', 'text/tertiary')]);
    add(f, row);
  });
  return f;
}
function quoteVisual() {
  var f = VV({ name: 'Quote visual', gap: 10, pad: 16, radius: 8, fill: 'bg/sunken' });
  [['Air stall position', 'Neutral', 'Fixed', '$16,800'], ['Pre-export isolation', 'Neutral', 'Fixed', '$2,170'], ['Waiting time, 2 h', 'Warn', 'Estimated', '$190']].forEach(function (r) {
    var row = H({ name: r[0], gap: 10, cross: 'CENTER' });
    addAll(row, [Tx(r[0], 'Body/S', 'text/primary', { fill: true }), chip(r[1], r[2], { noDot: true }), Tx(r[3], 'Mono/Caption', 'text/primary', { w: 60, align: 'RIGHT' })]);
    add(f, fillW(row));
  });
  return f;
}

/* ---------------------------------------------------------------------
   Screen: My horses (desktop + mobile)
   --------------------------------------------------------------------- */
function addHorseCard(w, h) {
  var c = VV({ name: 'Add a horse', gap: 12, pad: 32, w: w, h: h, radius: 12, stroke: 'border/strong', dash: [6, 4], main: 'CENTER', cross: 'CENTER' });
  var badge = H({ name: 'Badge', w: 44, h: 44, radius: 999, fill: 'surface/muted', main: 'CENTER', cross: 'CENTER' });
  add(badge, Ic('plus', 22, 'text/secondary'));
  addAll(c, [badge, Tx('Add a horse', 'Heading/H4'), Tx('Name, sex, size class and microchip are needed for quotes and border checks.', 'Body/S', 'text/tertiary', { w: 260, align: 'CENTER' })]);
  return c;
}
function scrHorses() {
  var grid = H({ name: 'Horse grid', gap: 24, wrap: true, rowGap: 24 });
  var cards = HORSES.map(horseCard);
  addAll(grid, cards);
  add(grid, addHorseCard(CARD_W, cards[0].height));
  return screen('My horses', 'My horses', [
    pageHead('My horses', '4 horses · Saigon Turf Club. Profiles feed transport requests, load plans and document checks.'),
    grid
  ]);
}
function scrHorsesMobile() {
  var s = VV({ name: 'My horses · Mobile', w: 390, fill: 'bg/canvas' });
  add(s, fillW(inst(C.headerM)));
  var m = VV({ name: 'Content', gap: 20, pad: [24, 16, 48, 16] });
  addAll(m, [Tx('My horses', 'Display/M'), Tx('4 horses · Saigon Turf Club', 'Body/S', 'text/secondary', { fill: true }), btn('Primary', 'MD', 'Add horse', { lead: 'plus', fill: true })]);
  add(m, fillW(horseCard(HORSES[1])));
  add(m, fillW(horseCard(HORSES[2])));
  add(s, fillW(m));
  return s;
}

/* ---------------------------------------------------------------------
   Screens: Request transport (steps 1, 3, 4)
   --------------------------------------------------------------------- */
function estimateCard(range, horses, grooms, crossings, dist) {
  var e = inst(C.estimate);
  setP(e, { Range: range, Horses: horses, Grooms: grooms, 'Border crossings': crossings, Distance: dist });
  e.name = 'Estimate';
  return e;
}
function requestLayout(title, stepStates, left, right) {
  var body = H({ name: 'Body', gap: 24 });
  right.resize(SIDE.narrow, right.height); right.layoutSizingHorizontal = 'FIXED';
  addAll(body, [fillW(left), right]);
  return screen(title, 'My requests', [
    pageHead('Request transport', 'Draft saved 25 Sep 2026. Your estimate updates as you go; the binding price comes as an itemised quotation.'),
    stepper(stepStates),
    body
  ]);
}
function scrRequest1() {
  var left = VV({ name: 'Step 1', gap: 24 });
  addAll(left, [Tx('Which horses are travelling?', 'Heading/H3'), Tx('All horses in one request share the same route and dates. Size class and temperament decide stall allocation.', 'Body/M', 'text/secondary', { fill: true })]);
  var grid = H({ name: 'Horse options', gap: 16, wrap: true, rowGap: 16 });
  [['Selected', 'Shadowfax', 'Andalusian · Gelding · 510 kg', 'Size M · 32 in · Calm'],
   ['Selected', 'Nightfall', 'Thoroughbred · Mare · 478 kg', 'Size M · 32 in · Nervous · Climate stall'],
   ['Default', 'Copper King', 'Quarter Horse · Stallion · 583 kg', 'Size L · 48 in · Box stall only'],
   ['Default', 'Silver Bell', 'Lipizzan · Mare · 445 kg', 'Size M · 32 in · Calm']].forEach(function (o) {
    var c = inst(C.option, { State: o[0] });
    setP(c, { Title: o[1], Description: o[2], Meta: o[3], 'Show icon': false });
    var mt = c.findOne(function (n) { return n.type === 'TEXT' && n.name === 'Meta'; });
    if (mt) restyle(mt, 'Label/S', 'text/secondary');
    c.resize(380, c.height); // two per row in the 776 left column: (776 − 16) / 2
    c.name = 'Option · ' + o[1];
    add(grid, c);
  });
  add(left, fillW(grid));
  add(left, callout('Info', 'Nightfall needs a climate-controlled stall', 'We have added a climate stall to this request. You can see it on the next step.'));
  var foot = H({ name: 'Footer', main: 'SPACE_BETWEEN', cross: 'CENTER' });
  addAll(foot, [Tx('2 horses selected', 'Label/M', 'text/secondary'), btn('Primary', 'MD', 'Continue', { trail: 'arrow-right' })]);
  add(left, fillW(foot));
  return requestLayout('Request · 1 Horses', ['Current', 'Upcoming', 'Upcoming', 'Upcoming'], left, estimateCard('$11,300 – $16,100', '2', '1 per 3 horses → 1', '2', '~960 km'));
}
function scrRequest3() {
  var left = VV({ name: 'Step 3', gap: 24 });
  addAll(left, [Tx('Route and dates', 'Heading/H3'), Tx('We work out the border crossings from the route. Cross-border moves need time for documents to clear.', 'Body/M', 'text/secondary', { fill: true })]);
  var r1 = H({ name: 'Places', gap: 16 });
  addAll(r1, [input('Select', 'Default', 'From', 'Ho Chi Minh City, Vietnam', null, { fill: true }), input('Select', 'Default', 'To', 'Bangkok, Thailand', null, { fill: true })]);
  add(left, fillW(r1));
  var cr = VV({ name: 'Crossings', gap: 10 });
  var chips = H({ name: 'Chips', gap: 8 });
  addAll(chips, [chip('Neutral', 'Mộc Bài – Bavet'), chip('Neutral', 'Poipet – Aranyaprathet')]);
  addAll(cr, [Tx('Border crossings on this route', 'Label/S', 'text/secondary'), chips]);
  add(left, cr);
  var r2 = H({ name: 'Dates', gap: 16 });
  addAll(r2, [input('Date', 'Error', 'Departure date', '05/10/2026', 'Cross-border moves need 21 days for document clearance. The earliest departure is 17 Oct 2026.', { fill: true }), input('Text', 'Default', 'Special instructions', 'Quiet loading. Arrive by 07:00 for vet check.', null, { fill: true })]);
  add(left, fillW(r2));
  var cb = inst(C.checkbox, { Checked: 'True' }); setP(cb, { Label: 'My dates can move by ±3 days' });
  add(left, cb);
  var foot = H({ name: 'Footer', main: 'SPACE_BETWEEN', cross: 'CENTER' });
  var rightBtns = H({ name: 'Forward', gap: 12 });
  addAll(rightBtns, [btn('Secondary', 'MD', 'Use 17 Oct 2026', { lead: 'calendar' }), btn('Primary', 'MD', 'Continue', { trail: 'arrow-right', state: 'Disabled' })]);
  addAll(foot, [btn('Secondary', 'MD', 'Back', { lead: 'arrow-left' }), rightBtns]);
  add(left, fillW(foot));
  return requestLayout('Request · 3 Route & dates (error)', ['Done', 'Done', 'Current', 'Upcoming'], left, estimateCard('$11,300 – $16,100', '2', '1 per 3 horses → 1', '2', '~960 km'));
}
function scrRequest4() {
  var left = VV({ name: 'Step 4', gap: 24 });
  add(left, Tx('Review and submit', 'Heading/H3'));
  add(left, fillW(requestSummary(REQ_0193, { edit: true })));
  add(left, callout('Ok', 'Lead time is fine', 'Cross-border moves need 21 days\' notice. Your departure is 34 days away.'));
  var next = panel('What happens next', { gap: 14 });
  add(next, Tx('What happens next', 'Heading/H4'));
  [['Request: a logistics manager reviews it', 'Usually within 1 business day'], ['Quotation: itemised line by line', 'Valid for 7 days'], ['Approval: you accept; the 30% deposit is acknowledged', 'The job gets its CBRT code'], ['Documents: your checklist opens', 'Then Clearance, Trip and Handover']].forEach(function (s, i) {
    var row = H({ name: s[0], gap: 14, cross: 'CENTER' });
    var n = H({ name: 'N', w: 26, h: 26, radius: 999, stroke: 'border/strong', main: 'CENTER', cross: 'CENTER' });
    add(n, Tx(String(i + 1), 'Mono/Caption', 'text/tertiary'));
    addAll(row, [n, Tx(s[0], 'Label/M', 'text/primary', { fill: true }), Tx(s[1], 'Mono/Caption', 'text/tertiary')]);
    add(next, fillW(row));
  });
  add(left, fillW(next));
  var foot = H({ name: 'Footer', main: 'SPACE_BETWEEN', cross: 'CENTER' });
  addAll(foot, [btn('Secondary', 'MD', 'Back', { lead: 'arrow-left' }), btn('Primary', 'MD', 'Submit request', { trail: 'arrow-right' })]);
  add(left, fillW(foot));
  return requestLayout('Request · 4 Review', ['Done', 'Done', 'Done', 'Current'], left, estimateCard('$11,300 – $16,100', '2', '1 per 3 horses → 1', '2', '~960 km'));
}

/* ---------------------------------------------------------------------
   Screen: Quotation
   --------------------------------------------------------------------- */
var QUOTE = [
  ['A', 'Ground transport · origin', false, [
    ['Road transfer, Phnom Penh stable → PNH cargo terminal', 'per km · 14 km · minimum charge applies', 1, 250, 'Fixed'],
    ['Loading and handling at origin', 'per horse', 2, 120, 'Fixed']]],
  ['B', 'Pre-export', false, [
    ['Pre-export isolation · Nightfall (mare)', 'per day · 14 days', 14, 85, 'Fixed'],
    ['Pre-export isolation · Shadowfax (gelding)', 'per day · 14 days', 14, 70, 'Fixed'],
    ['Veterinary inspection and bloods', 'per horse', 2, 310, 'Fixed']]],
  ['C', 'Air freight', true, [
    ['Air stall position PNH → HKG, business', 'per position · business class gives each horse 48 in · 2 × 48 in = 96 in = 1 position', 1, 16800, 'Fixed'],
    ['Airline handling and stall build-up', 'per shipment', 1, 950, 'Fixed']]],
  ['D', 'Escort', false, [
    ['Flying groom', 'one per three horses · 2 ÷ 3, rounded up = 1', 1, 1450, 'Fixed']]],
  ['E', 'Documentation', false, [
    ['Export health certificate', 'per horse', 2, 180, 'Fixed'],
    ['Customs and border documentation', 'per crossing · 1', 1, 420, 'Fixed'],
    ['Hong Kong import permit handling', 'per shipment', 1, 380, 'Fixed']]],
  ['F', 'Post-arrival', false, [
    ['Post-arrival isolation, Sha Tin', 'per horse per day · 2 × 7 days', 14, 95, 'Fixed']]],
  ['G', 'Ground transport · destination', false, [
    ['Road transfer, HKG cargo terminal → Sha Tin', 'per km · 38 km · minimum charge', 1, 300, 'Overridden', 180, 'Override: shares the truck with a second consignment on the same flight.']]],
  ['H', 'Surcharges', false, [
    ['Waiting time at the cargo terminal', 'per hour · 2 h estimated', 2, 95, 'Estimated', null, 'Billed by the hour if the flight is delayed.']]]
];
/* The customer's biggest decision, on the tracking page model: route as the
   title, the decision as the one owed item, the people who made the quote,
   how it compares with the estimate, and what accepting starts. The ledger
   underneath is unchanged. Every figure is computed from QUOTE. */
function quoteTotals(q) {
  var t = { subtotal: 0, air: 0, ground: 0, groups: {}, lines: 0 };
  (q || QUOTE).forEach(function (g) {
    var gsum = 0;
    g[3].forEach(function (l) { t.lines++; if (l[3] == null && l[5] == null) { t.missing = (t.missing || 0) + 1; return; } gsum += (l[5] != null ? l[5] : l[2] * l[3]); });
    t.groups[g[0]] = gsum;
    t.subtotal += gsum;
    if (g[2]) t.air += gsum;
  });
  t.ground = (t.groups.A || 0) + (t.groups.G || 0);
  t.volume = Math.round((t.air + t.ground) * 0.05 * 100) / 100;
  t.net = t.subtotal - t.volume;
  t.fuel = Math.round(t.air * 0.95 * 0.18 * 100) / 100;
  t.ins = 325000 * 0.015;
  t.base1 = t.net + t.fuel + t.ins;
  t.cont = Math.round(t.base1 * 0.05 * 100) / 100;
  t.base2 = t.base1 + t.cont;
  t.fee = Math.round(t.base2 * 0.12 * 100) / 100;
  t.total = Math.round((t.base2 + t.fee) * 100) / 100;
  t.deposit = Math.round(t.total * 0.30 * 100) / 100;
  return t;
}
var QUOTE_ESTIMATE = [33900, 43600];
/* the ledger, shared by the customer quotation and the staff builder.
   after(line) may return a node to place under that line (the inline override editor) */
function quoteTable(lines, T, after) {
  var table = panel('Quotation lines', { gap: 0, pad: 0, clip: true });
  var th = H({ name: 'Table header', gap: 16, pad: [12, 20, 12, 20], fill: 'bg/sunken' });
  addAll(th, [Tx('Item', 'Mono/Eyebrow', 'text/tertiary', { fill: true }), Tx('Qty', 'Mono/Eyebrow', 'text/tertiary', { w: 48, align: 'RIGHT' }), Tx('Rate', 'Mono/Eyebrow', 'text/tertiary', { w: 96, align: 'RIGHT' }), Tx('Amount', 'Mono/Eyebrow', 'text/tertiary', { w: 120, align: 'RIGHT' }), Tx('', 'Mono/Eyebrow', 'text/tertiary', { w: 110 })]);
  add(table, fillW(th));
  lines.forEach(function (g) {
    var gh = H({ name: 'Group ' + g[0], gap: 12, pad: [18, 20, 10, 20], cross: 'CENTER' });
    var badge = H({ name: 'Letter', w: 26, h: 26, radius: 6, fill: 'surface/muted', main: 'CENTER', cross: 'CENTER' });
    add(badge, Tx(g[0], 'Mono/Chip', 'text/secondary'));
    var gMissing = g[3].some(function (l) { return l[3] == null && l[5] == null; });
    addAll(gh, [badge, Tx(g[1], 'Heading/H4', 'text/primary', { fill: true }), Tx(gMissing ? '—' : money(T.groups[g[0]]), 'Mono/Data', 'text/secondary')]);
    add(table, fillW(gh));
    g[3].forEach(function (l) {
      var ln = inst(C.quoteLine, { Certainty: l[4] });
      var missing = l[3] == null;
      var amount = l[5] != null ? l[5] : l[2] * l[3];
      var m = { Description: l[0], Basis: l[1], Qty: String(l[2]), Rate: missing ? '—' : money(l[3]), Amount: missing ? 'No rate' : money(amount) };
      if (l[4] === 'Overridden') { m.Reason = l[6]; m.Catalog = money(l[2] * l[3]); }
      if (l[4] === 'Estimated') m.Why = l[6];
      setP(ln, m);
      if (missing) { var am = ln.findOne(function (n) { return n.type === 'TEXT' && n.name === 'Amount'; }); if (am) am.fills = [P('status/bad/fg')]; var tg = ln.findOne(function (n) { return n.name === 'Certainty'; }); if (tg) tg.visible = false; }
      /* a basis that explains itself in words is prose, so it leaves DM Mono */
      if (l[1].length > 40) { var bs = ln.findOne(function (n) { return n.type === 'TEXT' && n.name === 'Basis'; }); if (bs) restyle(bs, 'Body/S', 'text/tertiary'); }
      ln.name = 'Line · ' + l[0];
      add(table, fillW(ln));
      var extra = after && after(l);
      if (extra) add(table, fillW(extra));
    });
  });
  return table;
}
function quoteTotalsPanel(T) {
  var tot = panel('Totals', { gap: 12 });
  [['Direct cost subtotal', 'Groups A–H', money(T.subtotal)],
   ['Volume break, 2–3 horses', '5% of air and ground lines (A, C, G) · ' + money(T.air + T.ground), '−' + money(T.volume)],
   ['Fuel surcharge', '18% of air lines (C) after the volume break · ' + money(T.air * 0.95), money(T.fuel)],
   ['Transit insurance', '1.5% of declared value · $325,000', money(T.ins)],
   ['Contingency', '5% of ' + money(T.base1), money(T.cont)],
   ['Service fee', '12% of ' + money(T.base2), money(T.fee)]].forEach(function (r) {
    var row = H({ name: r[0], gap: 16, cross: 'CENTER' });
    var l = VV({ name: 'Label', gap: 2 });
    addAll(l, [Tx(r[0], 'Label/M'), Tx(r[1], 'Mono/Caption', 'text/tertiary')]);
    addAll(row, [fillW(l), Tx(r[2], 'Mono/Data', 'text/primary', { align: 'RIGHT' })]);
    add(tot, fillW(row));
  });
  add(tot, divider());
  var tr = H({ name: 'Total', cross: 'CENTER', main: 'SPACE_BETWEEN' });
  addAll(tr, [Tx('Total, USD', 'Heading/H3'), Tx(money(T.total), 'Display/M')]);
  add(tot, fillW(tr));
  add(tot, Tx('Applied in a fixed order: the volume break on air and ground lines, fuel on the discounted air lines, insurance on declared value, then contingency, then the service fee. USD at the 23 Sep rate; rate catalog v12 is pinned to this quotation.', 'Body/S', 'text/tertiary', { fill: true }));
  return tot;
}
function scrQuote() {
  var T = quoteTotals();
  var left = VV({ name: 'Lines', gap: 24 });
  addAll(left, [fillW(quoteTable(QUOTE, T)), fillW(quoteTotalsPanel(T))]);

  var est = panel('Against your estimate', { gap: 12 });
  var inside = T.total >= QUOTE_ESTIMATE[0] && T.total <= QUOTE_ESTIMATE[1];
  var head = H({ name: 'Head', main: 'SPACE_BETWEEN', cross: 'CENTER' });
  addAll(head, [Tx('Against your estimate', 'Heading/H4'), chip(inside ? 'Ok' : 'Warn', inside ? 'Inside your range' : 'Outside your range')]);
  addAll(est, [fillW(head), dlRow('Your estimate at submission', money(QUOTE_ESTIMATE[0], 0) + ' – ' + money(QUOTE_ESTIMATE[1], 0)), dlRow('This quotation', money(T.total)), dlRow('Deposit on acceptance', '30% · ' + money(T.deposit)),
    Tx('The largest line is the business-class air stall, $16,800, or ' + Math.round(16800 / T.total * 100) + '% of the total. Waiting time (H) is the only line that can change on the final invoice.', 'Body/S', 'text/tertiary', { fill: true })]);

  var next = panel('After you accept', { gap: 14 });
  add(next, Tx('After you accept', 'Heading/H4'));
  [['Your deposit is acknowledged', '30% · ' + money(T.deposit)], ['Yến approves the job and it gets its CBRT code', 'Price and horses lock'], ['Your document checklist opens', '2 horses · KH export, HK import']].forEach(function (x, i) {
    var row = H({ name: x[0], gap: 14, cross: 'MIN' });
    var n = H({ name: 'N', w: 26, h: 26, radius: 999, stroke: 'border/strong', main: 'CENTER', cross: 'CENTER' });
    add(n, Tx(String(i + 1), 'Mono/Caption', 'text/tertiary'));
    var t = VV({ name: 'Text', gap: 2 });
    addAll(t, [Tx(x[0], 'Label/S', 'text/primary', { fill: true }), Tx(x[1], 'Body/S', 'text/tertiary', { fill: true })]);
    addAll(row, [n, fillW(t)]);
    add(next, fillW(row));
  });

  var who = peoplePanel([['Yến', 'logistics manager', 'Built this quotation from rate catalog v12 on 23 Sep, and re-issued it when your departure moved to 20 Nov.']], 'Who prepared it');
  add(who, VV({ name: 'Ask', pad: [4, 0, 12, 0] }, [btn('Secondary', 'SM', 'Ask Yến about a line')]));

  var canc = panel('Cancellation', { gap: 8 });
  add(canc, Tx('Cancellation fee by notice period', 'Label/M'));
  [['More than 30 days', '10%', true], ['15–30 days', '25%'], ['7–14 days', '50%'], ['Under 7 days', '100%']].forEach(function (b) {
    var row = H({ name: b[0], gap: 10, pad: [8, 10, 8, 10], radius: 8, cross: 'CENTER', fill: b[2] ? 'status/info/bg' : null });
    addAll(row, [Tx(b[0], 'Body/S', 'text/secondary', { fill: true })]);
    if (b[2]) add(row, chip('Info', 'Now · 55 days', { noDot: true }));
    add(row, Tx(b[1], 'Mono/Data', 'text/primary', { w: 48, align: 'RIGHT' }));
    add(canc, fillW(row));
  });
  var sizing = panel('Stall sizing', { gap: 10 });
  addAll(sizing, [Tx('How the stalls were sized', 'Label/M'), dlRow('Nightfall · business class', '48 in'), dlRow('Shadowfax · business class', '48 in'), dlRow('Total width', '96 in → 1 position'), dlRow('Flying grooms', '2 ÷ 3, rounded up = 1'), dlRow('Flight veterinarian', 'Not required'), Tx('In business class every horse gets 48 in, whatever its size class. A flight vet joins from 8 horses, or when any horse is declared above $250,000.', 'Body/S', 'text/tertiary', { fill: true })]);
  var ver = panel('Versions', { gap: 10 });
  var v2 = H({ name: 'v2', gap: 10, cross: 'CENTER' });
  addAll(v2, [Tx('v2', 'Mono/Data'), Tx('Issued 23 Sep 2026', 'Body/S', 'text/secondary', { fill: true }), chip('Info', 'Current', { noDot: true })]);
  var v1 = H({ name: 'v1', gap: 10, cross: 'CENTER' });
  addAll(v1, [Tx('v1', 'Mono/Data', 'text/tertiary'), Tx('Superseded. Departure moved from 12 Nov to 20 Nov.', 'Body/S', 'text/tertiary', { fill: true })]);
  addAll(ver, [Tx('Version history', 'Label/M'), fillW(v2), fillW(v1)]);
  var right = column([est, next, who, canc, sizing, ver]);

  var lead = owedPanel('1 item', 'Yến, logistics manager, issued version 2 on 23 Sep. Accepting locks the price and the horse list; declining closes the request.',
    [owedItem('Soon', 'Accept or decline this quotation', 'Q-2026-0188 · version 2 · ' + money(T.total), 'It holds its price for 7 days from 23 Sep. After 30 Sep it expires and Yến re-prices it from the rate catalog in force then.', 'Due in 4 days', '30 Sep 2026', 'Accept quotation', 'check', { second: 'Decline' })],
    { chipTone: 'Warn', chipLabel: 'Waiting for you' }, null);
  return trackScreen('Quotation', trackHead('Phnom Penh → Hong Kong (Sha Tin)', ['REQ-2026-0179', 'quotation Q-2026-0188 v2 · Nightfall and Shadowfax · air, business class · departs 20 Nov 2026'], [stageChip('Quotation'), chip('Neutral', 'Rates v12 pinned', { noDot: true })], true), [lead, split(left, right, 400)], '26 Sep 2026, 11:20');
}

/* ---------------------------------------------------------------------
   Screen: Load plan
   --------------------------------------------------------------------- */
function scrLoadPlan() {
  var left = VV({ name: 'Queue', gap: 16, w: 300 });
  var li = inst(C.loadItem, { State: 'Selected' });
  setP(li, { Horse: 'Silver Bell', Meta: 'Mare · 445 kg · Lipizzan' });
  addAll(left, [Tx('To load · 1', 'Label/S', 'text/secondary'), fillW(li)]);
  var rules = panel('Placement rules', { gap: 12, pad: 20 });
  add(rules, Tx('Placement rules', 'Label/M'));
  [['box', 'stall/box', 'Stallions and aggressive horses need a box stall.'], ['snowflake', 'stall/climate', 'Heat-sensitive horses need the climate stall.'], ['alert', 'status/bad/fg', 'No stallion beside or behind a mare.'], ['info', 'status/info/fg', 'Keep nervous horses away from the ramp.']].forEach(function (r) {
    var row = H({ name: r[2], gap: 10 });
    addAll(row, [Ic(r[0], 16, r[1]), Tx(r[2], 'Body/S', 'text/secondary', { fill: true })]);
    add(rules, fillW(row));
  });
  add(left, fillW(rules));

  var veh = VV({ name: 'Vehicle', gap: 14, pad: 20, radius: 16, fill: 'bg/sunken', stroke: 'border/strong' });
  var cab = H({ name: 'Cab', main: 'SPACE_BETWEEN', cross: 'CENTER', pad: [12, 16, 12, 16], radius: 8, fill: 'surface/muted' });
  var cl = H({ name: 'Cab label', gap: 8, cross: 'CENTER' });
  addAll(cl, [Ic('truck', 16, 'text/secondary'), Tx('Cab · TX-447', 'Mono/Chip', 'text/secondary')]);
  var legend = H({ name: 'Legend', gap: 14, cross: 'CENTER' });
  [['stall/standard', 'Standard'], ['stall/box', 'Box'], ['stall/climate', 'Climate']].forEach(function (l) {
    var it = H({ name: l[1], gap: 6, cross: 'CENTER' });
    addAll(it, [rect(10, 10, l[0], 'Swatch', 2), Tx(l[1], 'Mono/Caption', 'text/tertiary')]);
    add(legend, it);
  });
  addAll(cab, [cl, legend, Tx('Front', 'Mono/Chip', 'text/tertiary')]);
  add(veh, fillW(cab));
  var selbar = H({ name: 'Selection', gap: 12, pad: [10, 14, 10, 14], radius: 8, cross: 'CENTER', fill: 'accent/soft', stroke: 'accent/line' });
  addAll(selbar, [Tx('Silver Bell selected. Choose a stall.', 'Label/S', 'text/primary', { fill: true }), btn('Ghost', 'SM', 'Unload'), btn('Ghost', 'SM', 'Cancel')]);
  add(veh, fillW(selbar));
  [[stallI('Standard', 'Occupied', 1, { horse: 'Shadowfax', meta: 'Gelding · 510 kg · Calm' }), stallI('Box', 'Empty', 2)],
   [stallI('Standard', 'Conflict', 3, { horse: 'Copper King', meta: 'Stallion · 583 kg · Aggressive', issue: 'Needs a box stall (2 or 5), and stands beside a mare' }), stallI('Climate', 'Occupied', 4, { horse: 'Nightfall', meta: 'Mare · 478 kg · Nervous' })],
   [stallI('Box', 'Empty', 5), stallI('Standard', 'Target', 6, { target: 'Place Silver Bell here' })]].forEach(function (pair, i) {
    var row = H({ name: 'Row ' + (i + 1), gap: 16 });
    addAll(row, pair);
    add(veh, fillW(row));
  });
  var ramp = H({ name: 'Ramp', pad: [10, 0, 10, 0], radius: 8, main: 'CENTER', stroke: 'border/strong', dash: [6, 4] });
  add(ramp, Tx('Rear ramp', 'Mono/Chip', 'text/tertiary'));
  add(veh, fillW(ramp));

  var sum = panel('Summary', { gap: 20 });
  var cols = H({ name: 'Columns', gap: 24 });
  var c1 = VV({ name: 'Payload', gap: 8 });
  addAll(c1, [Tx('Payload', 'Body/S', 'text/tertiary'), Tx('1,571 kg of 3,200 kg', 'Mono/Data'), progress('Neutral', 40)]);
  var c2 = VV({ name: 'Crew', gap: 6 });
  addAll(c2, [Tx('Crew', 'Body/S', 'text/tertiary'), Tx('2 grooms · 1 per 3 horses', 'Mono/Data'), Tx('Trần Văn Minh (driver), Lê Thị Hoa, Phạm Quốc Tuấn', 'Body/S', 'text/secondary', { fill: true })]);
  var c3 = VV({ name: 'Clearance', gap: 8 });
  addAll(c3, [Tx('Clearance', 'Body/S', 'text/tertiary'), chip('Bad', 'Locked · 9 items'), Tx('Departure stays locked until clearance is ready.', 'Body/S', 'text/tertiary', { fill: true })]);
  addAll(cols, [fillW(c1), fillW(c2), fillW(c3)]);
  add(sum, fillW(cols));
  add(sum, divider());
  var foot = H({ name: 'Footer', main: 'SPACE_BETWEEN', cross: 'CENTER' });
  var bs = H({ name: 'Buttons', gap: 12 });
  addAll(bs, [btn('Secondary', 'MD', 'Auto-arrange'), btn('Primary', 'MD', 'Confirm load plan', { state: 'Disabled' })]);
  addAll(foot, [Tx('Place every horse and resolve 1 conflict to confirm.', 'Body/S', 'text/tertiary'), bs]);
  add(sum, fillW(foot));

  var center = VV({ name: 'Plan', gap: 20 });
  addAll(center, [fillW(veh), fillW(sum)]);
  var body = H({ name: 'Body', gap: 24 });
  addAll(body, [left, fillW(center)]);
  var tiles = H({ name: 'Tiles', gap: 16 });
  addAll(tiles, [fillW(stat('Neutral', '3/6', 'Positions filled')), fillW(stat('Bad', '1', 'Conflict')), fillW(stat('Warn', '1', 'Horse to place'))]);
  return jobScreen('Fleet & route coordinator · Load plan', 'Load plan', STAFF.khoi, [tiles, body]);
}

/* ---------------------------------------------------------------------
   Screens: Clearance (checklist + route plan)
   --------------------------------------------------------------------- */
var RULE = { passport: 'Valid through arrival + 2 days', vacc: 'Influenza booster given 7–180 days before departure', eia: 'Sampled within 60 days of departure', health: 'Issued within 10 days of departure', own: 'Presence only' };
var DOCNAME = { passport: 'Equine passport', vacc: 'Influenza vaccination', eia: 'EIA (Coggins) test', health: 'Export health certificate', own: 'Proof of ownership' };
var HEALTH = ['health', 'Required', 'Due 8–14 Oct 2026 from the Dept. of Animal Health (VN), in time for clearance on 14 Oct.', '—'];
/* canonical fixture for CBRT-2026-041 as of 26 Sep 2026, 11:20; the customer's tracking screens show the same facts */
var CHECKLIST = [
  ['Shadowfax', 'Gelding · Andalusian', '4 of 5 cleared', [
    ['passport', 'Cleared', 'Valid until 1 May 2031; covers 20 Oct 2026.', 'v1 · 2 Sep 2026'],
    ['vacc', 'Cleared', 'Given 130 days before departure.', 'v1 · 2 Sep 2026'],
    ['eia', 'Cleared', 'Sampled 20 Sep 2026; 28 days old at departure. Approved 21 Sep.', 'v1 · 21 Sep 2026'],
    HEALTH,
    ['own', 'Cleared', 'On file.', 'v1 · 2 Sep 2026']]],
  ['Nightfall', 'Mare · Thoroughbred', '3 of 5 cleared', [
    ['passport', 'Cleared', 'Valid until 14 Mar 2029; covers 20 Oct 2026.', 'v1 · 2 Sep 2026'],
    ['vacc', 'Cleared', 'Given 108 days before departure.', 'v1 · 2 Sep 2026'],
    ['eia', 'Amber', 'Valid today, but 77 days old at departure; the limit is 60. The customer must upload a new test by 4 Oct.', 'v1 · 4 Aug 2026'],
    HEALTH,
    ['own', 'Cleared', 'On file.', 'v1 · 2 Sep 2026']]],
  ['Copper King', 'Stallion · Quarter Horse', '4 of 5 cleared', [
    ['passport', 'Cleared', 'Valid until 30 Jun 2030; covers 20 Oct 2026.', 'v1 · 3 Sep 2026'],
    ['vacc', 'Cleared', 'Given 156 days before departure.', 'v1 · 3 Sep 2026'],
    ['eia', 'Cleared', 'Sampled 10 Sep 2026; 38 days old at departure.', 'v1 · 11 Sep 2026'],
    HEALTH,
    ['own', 'Cleared', 'On file.', 'v1 · 3 Sep 2026']]],
  ['Silver Bell', 'Mare · Lipizzan', '2 of 5 cleared', [
    ['passport', 'Cleared', 'Valid until 2 Feb 2027; covers 20 Oct 2026.', 'v1 · 4 Sep 2026'],
    ['vacc', 'Red', 'Booster lapsed on 16 Sep 2026. The customer must upload a new booster record by 11 Oct.', 'v1 · 22 Mar 2026'],
    ['eia', 'Cleared', 'Sampled 18 Sep 2026; 30 days old at departure.', 'v1 · 19 Sep 2026'],
    HEALTH,
    ['own', 'Red', 'Rejected 24 Sep by Lan: the bill of sale is unsigned. A signed copy was due 25 Sep.', 'v1 · 24 Sep 2026']]],
  ['Shipment', 'Documents for the whole job', '1 of 3 cleared', [
    ['Cambodia import permit', 'Required', 'With GDAHP since 15 Sep 2026 (ref KH-IP-2026-3381). Due by 11 Oct 2026.', '—', 'Valid through arrival + 2 days'],
    ['Transit insurance', 'Amber', 'Expires 15 Oct 2026, before 20 Oct 2026 (arrival + 2 days). The customer must upload an extended policy by 30 Sep.', 'v1 · PVI Insurance', 'Must cover the journey + 2 days'],
    ['Customs value declaration · Mộc Bài – Bavet', 'Cleared', 'On file.', 'v1 · 20 Sep 2026', 'One per border crossing']]]
];
/* 23 items: 14 cleared, 4 with the customer, 4 health certificates and 1 permit with authorities */
var STAFF = { yen: ['Vũ Hải Yến', 'Logistics manager', 'VY'], lan: ['Nguyễn Thị Lan', 'Transport specialist', 'NL'], khoi: ['Đỗ Minh Khôi', 'Fleet & route coordinator', 'DK'], minh: ['Trần Văn Minh', 'Driver', 'TM'], hoa: ['Lê Thị Hoa', 'Groom', 'LH'] };
var JOB = { code: 'CBRT-2026-041', title: 'Ho Chi Minh City → Phnom Penh', meta: '4 horses · trailer TX-447 · departs 18 Oct 2026, 06:00' };
var JOB_TABS = [['Clearance', 'Lan, transport specialist'], ['Authorities', 'Lan, transport specialist'], ['Load plan', 'Khôi, fleet & route coordinator'], ['Route', 'Khôi, fleet & route coordinator'], ['Trip', 'Minh, driver']];
/* one header for every tab of a job: route title, code, stage, the clearance gate, then tabs with the tab's owner */
function jobHead(tab, gateBody, stage, gateState) {
  var gate = inst(C.gate, { State: gateState || 'Locked' });
  setP(gate, { Body: gateBody || '9 items must clear first: 4 uploads from the customer, 4 export health certificates and the Cambodia import permit. Pre-export quarantine runs 10–17 Oct.' });
  var tabs = H({ name: 'Tabs', gap: 24, main: 'SPACE_BETWEEN', cross: 'CENTER' });
  borderSide(tabs, 'border/default', 'bottom');
  var list = H({ name: 'Tab list', gap: 28 });
  JOB_TABS.forEach(function (tb) {
    var i = inst(C.tab, { State: tb[0] === tab ? 'Active' : 'Default' });
    setP(i, { Label: tb[0] }); i.name = 'Tab · ' + tb[0];
    add(list, i);
  });
  var owner = JOB_TABS.filter(function (tb) { return tb[0] === tab; })[0][1];
  var own = H({ name: 'Owner', gap: 6, cross: 'CENTER' });
  addAll(own, [Tx('Owner', 'Body/S', 'text/tertiary'), Tx(owner, 'Label/S', 'text/primary')]);
  addAll(tabs, [list, own]);
  /* the tabs carry the rule, so the header itself has none */
  return pageHeader({ shell: 'staff', back: 'Jobs', title: JOB.title, code: JOB.code, summary: JOB.meta, right: [stageChip(stage || 'Documents')], below: [gate, tabs], rule: false });
}
function jobScreen(name, tab, user, blocks, o) {
  o = o || {};
  return adminScreen(name, 'Jobs', ['Jobs', JOB.code, tab], user, [jobHead(tab, o.gate, o.stage, o.gateState)].concat(blocks), o.today);
}
/* Lan's checklist is the customer's All documents list, in the same words, with the holder named for staff */
function scrClearance() {
  var top = H({ name: 'Summary', gap: 16, cross: 'MAX' });
  var s = docTableSummary('staff');
  addAll(top, [fillW(s), input('Date', 'Default', 'Planned departure', '18 Oct 2026', 'Changing it re-checks all 23 documents before it saves.')]);
  return jobScreen('Transport specialist · Clearance checklist', 'Clearance', STAFF.lan, [top, docTableTabs('staff'), docTable('staff')]);
}
function scrRoute() {
  var strip = H({ name: 'Summary', gap: 40, pad: [18, 24, 18, 24], radius: 12, fill: 'surface/card', stroke: 'border/default' });
  [['Origin', 'Ho Chi Minh City, VN'], ['Destination', 'Phnom Penh, KH'], ['Distance', '240 km'], ['Duration', '6.5 h'], ['Border crossing', 'Mộc Bài – Bavet'], ['Welfare stops', '1']].forEach(function (s) {
    var c = VV({ name: s[0], gap: 4 });
    addAll(c, [Tx(s[0], 'Body/S', 'text/tertiary'), Tx(s[1], 'Label/M')]);
    add(strip, c);
  });
  var tl = VV({ name: 'Timeline', gap: 16 });
  [['Pickup', 'Phú Thọ training centre, HCMC', '06:00', 'Loading and condition check, logged with photos.'],
   ['Border', 'Mộc Bài – Bavet border', '08:30', 'Vietnam export clearance and Cambodia entry. Recorded per leg as Cleared or Held.'],
   ['Welfare', 'Svay Rieng welfare stop', '09:30', '45-minute rest, water and hay, welfare check by the escort.'],
   ['Delivery', 'Phnom Penh Equestrian Centre', '12:30', 'Handover to the receiving groom with a final condition log.']].forEach(function (s) {
    var st = inst(C.stop, { Kind: s[0] });
    setP(st, { Stop: s[1], Time: s[2], Details: s[3] });
    st.name = 'Stop · ' + s[1];
    add(tl, fillW(st));
  });
  var refuse = VV({ name: 'Depart', gap: 16 });
  add(refuse, callout('Bad', 'Departure can\'t be recorded yet', '9 items are outstanding: 4 uploads from the customer, 4 export health certificates and the Cambodia import permit. Pre-export quarantine runs 10–17 Oct. Record departure opens when the gate is clear.'));
  add(refuse, btn('Primary', 'MD', 'Record departure', { state: 'Disabled', lead: 'lock' }));
  return jobScreen('Fleet & route coordinator · Route plan', 'Route', STAFF.khoi, [strip, tl, refuse]);
}

/* ---------------------------------------------------------------------
   Components page toast demo + Cover
   --------------------------------------------------------------------- */
function buildCover(page) {
  var f = VV({ name: 'Cover', gap: 32, pad: 96, w: 1600, h: 1000, fill: 'bg/canvas', main: 'SPACE_BETWEEN' });
  page.appendChild(f);
  var top = VV({ name: 'Top', gap: 24 });
  var mk = H({ name: 'Mark', w: 72, h: 72, radius: 12, fill: 'accent/default', main: 'CENTER', cross: 'CENTER' });
  var eq = Tx('Eq', 'Display/M', 'accent/on', { noStyle: true });
  eq.fontName = FONT['display/Italic'];
  add(mk, eq);
  var meta = H({ name: 'Meta', gap: 8 });
  addAll(meta, [chip('Neutral', 'v1.0', { noDot: true }), chip('Neutral', '26 Sep 2026', { noDot: true }), chip('Neutral', 'Dark + Light', { noDot: true })]);
  addAll(top, [mk, Tx('EquiFreight', 'Display/XL'), Tx('Design system and screens for CBRTS, the Cross-Border Racehorse Transport System.', 'Body/L', 'text/secondary', { w: 820 }), meta]);
  var cols = H({ name: 'Contents', gap: 40 });
  [['Foundations', 'Colour variables in Dark and Light modes, space and radius variables, 15 text styles, 4 effect styles, principles.'],
   ['Components', (STATS.components - Object.keys(ICON).length) + ' components and component sets with ' + STATS.variants + ' variants, plus ' + Object.keys(ICON).length + ' icons: buttons, chips, inputs, option cards, nameplate, horse card, stall tile, document row, clearance gate, quote line and more.'],
   ['Screens', 'Home, My horses (desktop + mobile), Request transport steps 1, 3 and 4, Quotation, Load plan, Clearance checklist and route plan, plus Light-mode copies.']].forEach(function (c) {
    var col = VV({ name: c[0], gap: 8, pad: [20, 0, 0, 0] });
    borderSide(col, 'border/default', 'top');
    addAll(col, [Tx(c[0], 'Heading/H3'), Tx(c[1], 'Body/S', 'text/secondary', { fill: true })]);
    add(cols, fillW(col));
  });
  var how = Tx('Theme a frame: select it, then in the right panel under Appearance choose EquiFreight / Color → Light. Everything inside re-themes because components bind to variables.', 'Mono/Caption', 'text/tertiary', { fill: true });
  addAll(f, [top, fillW(cols), how]);
  return f;
}

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
/* =====================================================================
   Owner · Request tracking (customer). Desktop 1440. "Owed first":
   the page opens on what the customer owes, then where the move stands.
   Gold marks only the one forward action; status uses status tones.
   DM Mono is for codes, dates, times and counts; names and prose are not.
   ===================================================================== */
var URGENCY = {
  Overdue: { fg: 'status/bad/fg', bg: 'status/bad/bg', icon: 'alert', btn: 'Primary' },
  Soon: { fg: 'status/warn/fg', bg: 'status/warn/bg', icon: 'clock', btn: 'Primary' },
  Upcoming: { fg: 'text/secondary', bg: 'surface/muted', icon: 'upload', btn: 'Secondary' },
  Done: { fg: 'status/ok/fg', bg: 'status/ok/bg', icon: 'check', btn: 'Ghost' }
};
/* one tone per stage, shared by list and detail chips */
/* one process vocabulary everywhere: the seven stages, named the same on
   Home, the request wizard, tracking, the quotation and the staff jobs.
   A stage chip says where a request is, not how urgent it is: urgency lives
   in the owed items and deadlines, so stage chips are always neutral. */
var STAGES = ['Request', 'Quotation', 'Approval', 'Documents', 'Clearance', 'Trip', 'Handover'];
function stageChip(s) { return chip('Neutral', s + ' · ' + (STAGES.indexOf(s) + 1) + ' of 7', { noDot: true }); }

function buildTrackingComponents(board) {
  var b = docBlock(board, 'Request tracking', 'Customer-side tracking pieces. Owed item: one thing the customer owes, with its reason and a two-line deadline (time left, then the date); urgency drives tone, and only the top item\'s action is gold. Stage row: a stage (or a collapsed run of stages) with its owner and a two-line deadline. Route stop: a checkpoint on the schematic route; positions come from recorded checkpoints only. Status tones only, never gold.');

  var owed = Object.keys(URGENCY).map(function (u) {
    var s = URGENCY[u];
    var c = H({ component: true, name: 'Urgency=' + u, gap: 16, pad: [16, 20, 16, 20], cross: 'CENTER', w: 1100, fill: 'surface/card' });
    borderSide(c, 'border/default', 'top');
    var ic = H({ name: 'Icon wrap', w: 36, h: 36, radius: 8, fill: s.bg, main: 'CENTER', cross: 'CENTER' });
    add(ic, Ic(s.icon, 18, s.fg));
    var txt = VV({ name: 'Text', gap: 3 });
    addAll(txt, [
      Tx('Owed item title', 'Label/M', u === 'Done' ? 'text/tertiary' : 'text/primary', { name: 'Title', fill: true }),
      Tx('Horse · document', 'Label/S', 'text/tertiary', { name: 'Subject', fill: true }),
      Tx('Why this is needed.', 'Body/S', 'text/secondary', { name: 'Reason', fill: true })
    ]);
    var due = VV({ name: 'Due col', gap: 2, w: 140, cross: 'MAX' });
    addAll(due, [Tx('Due in 8 days', 'Label/S', s.fg, { name: 'Due', align: 'RIGHT' }), Tx('4 Oct 2026', 'Mono/Caption', 'text/tertiary', { name: 'Date', align: 'RIGHT' })]);
    var act = H({ name: 'Action col', gap: 8, main: 'MAX', cross: 'CENTER' });
    var a2 = btn('Secondary', 'SM', 'Report a problem'); a2.name = 'Action 2';
    var a = btn(s.btn, 'SM', u === 'Done' ? 'View' : 'Upload', u === 'Done' ? {} : { lead: 'upload' }); a.name = 'Action';
    addAll(act, [a2, a]);
    addAll(c, [ic, fillW(txt), due, act]);
    return c;
  });
  C.owed = combine(owed, b, 'Owed item');
  wireText(C.owed, ['Title', 'Subject', 'Reason', 'Due', 'Date']);
  wire(C.owed, 'Show second action', 'BOOLEAN', false, 'Action 2', 'visible');

  var MARK = {
    Done: { fill: 'status/ok/bg', stroke: 'status/ok/border', ink: 'status/ok/fg' },
    Current: { fill: 'status/info/bg', stroke: 'status/info/fg', ink: 'status/info/fg' },
    Upcoming: { fill: null, stroke: 'border/strong', ink: 'text/tertiary' },
    Blocked: { fill: 'status/bad/bg', stroke: 'status/bad/border', ink: 'status/bad/fg' }
  };
  var stages = Object.keys(MARK).map(function (st) {
    var k = MARK[st];
    var c = H({ component: true, name: 'State=' + st, gap: 14, pad: [12, 0, 12, 0], cross: 'MIN', w: 640 });
    borderSide(c, 'border/default', 'top');
    var m = H({ name: 'Marker', w: 28, h: 28, radius: 999, main: 'CENTER', cross: 'CENTER', fill: k.fill, stroke: k.stroke, sw: st === 'Current' ? 1.5 : 1 });
    if (st === 'Done') add(m, Ic('check', 14, k.ink));
    else if (st === 'Blocked') add(m, Ic('lock', 14, k.ink));
    else add(m, Tx('1', 'Mono/Caption', k.ink, { name: 'Number' }));
    var t = VV({ name: 'Text', gap: 2 });
    addAll(t, [Tx('Stage', 'Label/M', st === 'Upcoming' ? 'text/secondary' : 'text/primary', { name: 'Stage', fill: true }), Tx('Who does what next.', 'Body/S', st === 'Current' || st === 'Blocked' ? 'text/secondary' : 'text/tertiary', { name: 'Detail', fill: true })]);
    var meta = VV({ name: 'Meta col', gap: 2, w: 130, cross: 'MAX' });
    addAll(meta, [Tx('Due in 2 days', 'Label/S', st === 'Current' ? 'status/info/fg' : st === 'Blocked' ? 'status/bad/fg' : 'text/secondary', { name: 'Meta', align: 'RIGHT' }), Tx('28 Sep', 'Mono/Caption', 'text/tertiary', { name: 'Meta 2', align: 'RIGHT' })]);
    addAll(c, [m, fillW(t), meta]);
    return c;
  });
  C.stageRow = combine(stages, b, 'Stage row');
  wireText(C.stageRow, ['Stage', 'Detail', 'Meta', 'Meta 2', 'Number']);

  var stops = ['Done', 'Current', 'Upcoming'].map(function (st) {
    var c = VV({ component: true, name: 'State=' + st, gap: 6, w: 132, cross: 'CENTER' });
    var mark = H({ name: 'Marker', w: 20, h: 20, main: 'CENTER', cross: 'CENTER' });
    var d = dot(st === 'Current' ? 20 : 14, st === 'Done' ? 'status/ok/fg' : 'bg/canvas', 'Point');
    if (st === 'Upcoming') { d.strokes = [P('border/strong')]; d.strokeWeight = 2; }
    if (st === 'Current') { d.fills = [P('status/info/bg')]; d.strokes = [P('status/info/fg')]; d.strokeWeight = 2; }
    add(mark, d);
    addAll(c, [mark,
      Tx('Stop', 'Label/S', st === 'Upcoming' ? 'text/secondary' : 'text/primary', { name: 'Stop', w: 132, align: 'CENTER' }),
      Tx('Kind', 'Mono/Eyebrow', 'text/tertiary', { name: 'Kind', w: 132, align: 'CENTER' }),
      Tx('06:00', 'Mono/Caption', st === 'Current' ? 'status/info/fg' : 'text/tertiary', { name: 'Time', w: 132, align: 'CENTER' })]);
    return c;
  });
  C.stop2 = combine(stops, b, 'Route stop');
  wireText(C.stop2, ['Stop', 'Kind', 'Time']);
}

/* ---------- builders ---------- */
function trackScreen(name, head, blocks, asOf) {
  return screen(name, 'My requests', [head].concat(blocks), { gap: 28, asOf: asOf });
}
/* meta: [code, prose] so the code stays mono and the rest reads as prose */
/* a back link names its destination: "My requests" by default, or the page it returns to */
function trackHead(title, meta, chips, back) {
  return pageHeader({ back: back ? (typeof back === 'string' ? back : 'My requests') : null, title: title, code: meta[0], summary: meta[1], right: chips });
}
function owedItem(u, title, subject, reason, due, date, action, icon, o) {
  o = o || {};
  var it = inst(C.owed, { Urgency: u });
  setP(it, { Title: title, Subject: subject, Reason: reason, Due: due, Date: date });
  var a = nested(it, 'Action');
  if (a) {
    var m = { Label: action };
    if (icon) m['Leading icon'] = ICON[icon]; else m['Show leading icon'] = false;
    setP(a, m);
    if (o.secondary) setP(a, { Variant: 'Secondary' });
    if (icon) tint(a.children[0], o.secondary ? 'text/primary' : BTN_FG[URGENCY[u].btn]);
  }
  if (o.second) {
    setP(it, { 'Show second action': true });
    var a2 = nested(it, 'Action 2');
    if (a2) setP(a2, { Label: o.second });
  }
  it.name = 'Owed · ' + title;
  return fillW(it);
}
/* status: { text, note, pct } → progress bar; or { text, chipTone, chipLabel } → words + chip */
function owedPanel(count, sub, items, status, footer) {
  var p = panel('You owe', { gap: 0, pad: 0, clip: true });
  var head = H({ name: 'Head', gap: 24, pad: [20, 20, 16, 20], main: 'SPACE_BETWEEN', cross: 'CENTER' });
  var t = VV({ name: 'Text', gap: 4 });
  addAll(t, [Tx('You owe ' + count, 'Heading/H3'), Tx(sub, 'Body/S', 'text/secondary', { w: 620 })]);
  var pr = VV({ name: 'Status', gap: 6, w: 280, cross: 'MAX' });
  if (status.text) add(pr, Tx(status.text, 'Label/S', 'text/secondary', { align: 'RIGHT' }));
  if (status.pct != null) add(pr, progress('Ok', status.pct));
  if (status.chipLabel) add(pr, chip(status.chipTone, status.chipLabel));
  if (status.note) add(pr, Tx(status.note, 'Body/S', 'text/tertiary', { w: 280, align: 'RIGHT' }));
  addAll(head, [t, pr]);
  add(p, fillW(head));
  items.forEach(function (i) { add(p, i); });
  if (footer) {
    var f = H({ name: 'Footer', pad: [10, 12, 10, 12], fill: 'bg/sunken' });
    borderSide(f, 'border/default', 'top');
    add(f, btn('Ghost', 'SM', footer));
    add(p, fillW(f));
  }
  return p;
}
/* nothing owed: the next owner and step, with the deadline shown twice */
function nothingOwed(title, next, dueText, dueDate) {
  var p = H({ name: 'You owe · nothing', gap: 16, pad: [20, 20, 20, 20], radius: 12, cross: 'CENTER', fill: 'surface/card', stroke: 'border/default' });
  var ic = H({ name: 'Icon wrap', w: 40, h: 40, radius: 999, fill: 'status/ok/bg', main: 'CENTER', cross: 'CENTER' });
  add(ic, Ic('check', 20, 'status/ok/fg'));
  var t = VV({ name: 'Text', gap: 4 });
  addAll(t, [Tx(title, 'Heading/H3'), Tx(next, 'Body/M', 'text/secondary', { fill: true })]);
  var d = VV({ name: 'Next due', gap: 2, w: 160, cross: 'MAX' });
  addAll(d, [Tx(dueText, 'Label/S', 'status/info/fg', { align: 'RIGHT' }), Tx(dueDate, 'Mono/Caption', 'text/tertiary', { align: 'RIGHT' })]);
  addAll(p, [ic, fillW(t), d]);
  return p;
}
function joinNames(list) { return list.length < 2 ? list.join('') : list.slice(0, -1).join(', ') + ' and ' + list[list.length - 1]; }
/* compact track: done stages collapse to one row, then the current stage and
   the one after it in full, then the remaining stages as one summary row.
   rows: 7 × [state, detail, meta, meta2] */
function stagePanel(rows, title) {
  var p = panel('Where it stands', { gap: 0, pad: [20, 24, 8, 24] });
  add(p, VV({ name: 'Title', pad: [0, 0, 12, 0] }, [Tx(title || 'Where it stands', 'Heading/H4')]));
  var put = function (state, stage, detail, meta, meta2, number) {
    var s = inst(C.stageRow, { State: state });
    setP(s, { Stage: stage, Detail: detail, Meta: meta || '', 'Meta 2': meta2 || '' });
    if (number) setP(s, { Number: number });
    s.name = 'Stage · ' + stage;
    add(p, fillW(s));
  };
  var done = [], i = 0;
  while (i < rows.length && rows[i][0] === 'Done') { done.push(i); i++; }
  if (done.length > 1) {
    var last = rows[done[done.length - 1]];
    put('Done', joinNames(done.map(function (d) { return STAGES[d]; })), rows[0][1] ? 'Done. ' + last[1] : 'Done.', last[2], last[3]);
  } else if (done.length === 1) put('Done', STAGES[0], rows[0][1], rows[0][2], rows[0][3]);
  var shown = 0;
  while (i < rows.length && shown < 2) { var r = rows[i]; put(r[0], STAGES[i], r[1], r[2], r[3], String(i + 1)); i++; shown++; }
  if (i < rows.length) {
    var rest = [];
    for (var j = i; j < rows.length; j++) rest.push(STAGES[j]);
    put('Upcoming', 'Then ' + joinNames(rest).toLowerCase(), rows[rows.length - 1][1], rows[rows.length - 1][2], rows[rows.length - 1][3], '+' + rest.length);
  }
  return p;
}
/* horizontal route for full-width use */
function routeStrip(stops, gate) {
  var line = H({ name: 'Route line', gap: 0 });
  var legTone = function (ok) { return ok ? 'status/ok/fg' : 'border/strong'; };
  if (gate) {
    var g = VV({ name: 'Gate', gap: 6, w: 96, cross: 'CENTER' });
    var lk = H({ name: 'Lock', w: 20, h: 20, radius: 999, main: 'CENTER', cross: 'CENTER', fill: gate === 'Locked' ? 'status/bad/bg' : 'status/ok/bg' });
    add(lk, Ic(gate === 'Locked' ? 'lock' : 'unlock', 12, gate === 'Locked' ? 'status/bad/fg' : 'status/ok/fg'));
    addAll(g, [lk, Tx('Clearance', 'Label/S', 'text/primary', { w: 96, align: 'CENTER' }), Tx(gate === 'Locked' ? 'Locked' : 'Clear', 'Mono/Eyebrow', gate === 'Locked' ? 'status/bad/fg' : 'status/ok/fg', { w: 96, align: 'CENTER' })]);
    add(line, g);
    add(line, fillW(VV({ name: 'Leg', pad: [9, 0, 0, 0] }, [fillW(rect(20, 2, legTone(gate !== 'Locked'), 'Leg line'))])));
  }
  stops.forEach(function (s, i) {
    var n = inst(C.stop2, { State: s[0] });
    setP(n, { Stop: s[1], Kind: s[2], Time: s[3] });
    n.name = 'Stop · ' + s[1];
    add(line, n);
    if (i < stops.length - 1) {
      var ok = s[0] === 'Done' && (stops[i + 1][0] === 'Done' || stops[i + 1][0] === 'Current');
      add(line, fillW(VV({ name: 'Leg', pad: [9, 0, 0, 0] }, [fillW(rect(20, 2, legTone(ok), 'Leg line'))])));
    }
  });
  return line;
}
/* vertical checkpoint list for side columns */
function routeList(stops, gate) {
  var v = VV({ name: 'Route list', gap: 0 });
  var rows = [];
  if (gate) rows.push(['Gate', 'Clearance', gate === 'Locked' ? 'Departure locked' : 'Clear to depart', '', gate]);
  stops.forEach(function (s) { rows.push([s[0], s[1], s[2], s[3]]); });
  rows.forEach(function (r, i) {
    var last = i === rows.length - 1;
    var row = H({ name: r[1], gap: 12 });
    var mk = VV({ name: 'Marker', gap: 4, w: 20, cross: 'CENTER' });
    var passed = r[0] === 'Done' || (r[0] === 'Gate' && r[4] !== 'Locked');
    if (r[0] === 'Gate') {
      var lk = H({ name: 'Lock', w: 20, h: 20, radius: 999, main: 'CENTER', cross: 'CENTER', fill: r[4] === 'Locked' ? 'status/bad/bg' : 'status/ok/bg' });
      add(lk, Ic(r[4] === 'Locked' ? 'lock' : 'unlock', 12, r[4] === 'Locked' ? 'status/bad/fg' : 'status/ok/fg'));
      add(mk, lk);
    } else {
      var d = dot(14, r[0] === 'Done' ? 'status/ok/fg' : 'bg/canvas', 'Point');
      if (r[0] === 'Upcoming') { d.strokes = [P('border/strong')]; d.strokeWeight = 2; }
      if (r[0] === 'Current') { d.fills = [P('status/info/bg')]; d.strokes = [P('status/info/fg')]; d.strokeWeight = 2; }
      add(mk, d);
    }
    var next = rows[i + 1];
    if (!last) add(mk, rect(2, 28, passed && next && (next[0] === 'Done' || next[0] === 'Current') ? 'status/ok/fg' : 'border/strong', 'Leg'));
    var t = VV({ name: 'Text', gap: 2 });
    addAll(t, [Tx(r[1], 'Label/S', r[0] === 'Upcoming' ? 'text/secondary' : 'text/primary'), Tx(r[2], 'Mono/Eyebrow', r[4] === 'Locked' ? 'status/bad/fg' : 'text/tertiary')]);
    addAll(row, [mk, fillW(t), Tx(r[3], 'Mono/Caption', r[0] === 'Current' ? 'status/info/fg' : 'text/tertiary', { w: 110, align: 'RIGHT' })]);
    add(v, fillW(row));
  });
  return v;
}
/* facts: [label, value, mono?] — mono only for codes, counts and distances */
function factRow(f) {
  var r = H({ name: f[0], gap: 16, cross: 'CENTER', main: 'SPACE_BETWEEN' });
  addAll(r, [Tx(f[0], 'Body/S', 'text/secondary', { name: 'Label' }), Tx(f[1], f[2] ? 'Mono/Data' : 'Label/S', 'text/primary', { name: 'Value', align: 'RIGHT' })]);
  return fillW(r);
}
function routePanel(title, sub, stops, gate, facts) {
  var p = panel('Route', { gap: 18 });
  var h = VV({ name: 'Title', gap: 2 });
  addAll(h, [Tx(title, 'Heading/H4'), Tx(sub, 'Body/S', 'text/tertiary', { fill: true })]);
  addAll(p, [fillW(h), fillW(routeList(stops, gate))]);
  if (facts) {
    add(p, divider());
    facts.forEach(function (f) { add(p, factRow(f)); });
  }
  return p;
}
function historyPanel(rows, more) {
  var p = panel('History', { gap: 0, pad: [20, 24, 12, 24] });
  add(p, VV({ name: 'Title', pad: [0, 0, 12, 0] }, [Tx('History', 'Heading/H4')]));
  rows.forEach(function (r) {
    var row = H({ name: r[1], gap: 20, pad: [10, 0, 10, 0], cross: 'CENTER' });
    borderSide(row, 'border/default', 'top');
    addAll(row, [Tx(r[0], 'Mono/Caption', 'text/tertiary', { w: 150 }), Tx(r[1], 'Body/S', 'text/primary', { fill: true }), Tx(r[2], 'Body/S', 'text/tertiary', { w: 220, align: 'RIGHT' })]);
    add(p, fillW(row));
  });
  if (more) add(p, VV({ name: 'More', pad: [8, 0, 4, 0] }, [btn('Ghost', 'SM', more)]));
  return p;
}
/* people on the move: first name + role + what they handle */
function peoplePanel(people, title) {
  title = title || 'Who is on your move';
  var p = panel(title, { gap: 0, pad: [20, 24, 8, 24] });
  add(p, VV({ name: 'Title', pad: [0, 0, 12, 0] }, [Tx(title, 'Heading/H4')]));
  people.forEach(function (x) {
    var row = H({ name: x[0], gap: 12, pad: [10, 0, 10, 0], cross: 'CENTER' });
    borderSide(row, 'border/default', 'top');
    var av = H({ name: 'Avatar', w: 32, h: 32, radius: 999, fill: 'surface/muted', main: 'CENTER', cross: 'CENTER' });
    add(av, Tx(x[0].charAt(0), 'Label/S', 'text/secondary'));
    var t = VV({ name: 'Text', gap: 2 });
    addAll(t, [Tx(x[0] + ', ' + x[1], 'Label/S', 'text/primary'), Tx(x[2], 'Body/S', 'text/tertiary', { fill: true })]);
    addAll(row, [av, fillW(t)]);
    add(p, fillW(row));
  });
  return p;
}
function split(left, right, rightW) {
  var r = H({ name: 'Status row', gap: 24 });
  right.resize(rightW || SIDE.wide, right.height);
  right.layoutSizingHorizontal = 'FIXED';
  addAll(r, [fillW(left), right]);
  return r;
}
function column(kids) { var c = VV({ name: 'Column', gap: 24 }); kids.forEach(function (k) { add(c, fillW(k)); }); return c; }
var HCMC_PNH = [
  ['Ho Chi Minh City', 'Pickup', '06:00'], ['Mộc Bài – Bavet', 'Border', '08:30'], ['Svay Rieng', 'Welfare stop', '09:30'], ['Phnom Penh', 'Delivery', '12:30']
];
function stopsWith(states, times) { return HCMC_PNH.map(function (s, i) { return [states[i], s[0], s[1], times ? times[i] : s[2]]; }); }

/* ---------- My requests ---------- */
/* the requests table, the same with no rows (first run) or three; a row opens with its chevron */
var REQ_COLS = [['Request', 150, null, 'Mono/Caption', null, 'Unsorted'], ['Route', null], ['Horses', 70, 'RIGHT', 'Mono/Data'], ['Departs', 110, null, 'Mono/Caption', 'text/secondary', 'Unsorted'], ['Stage', 170, null, null, null, 'Unsorted'], ['', 150, 'RIGHT'], ['', 24, 'RIGHT']];
function rowOpen() { var i = Ic('arrow-right', 16, 'text/tertiary'); i.name = 'Open'; return i; }
function scrMyRequests() {
  var owe = function (n, tone) { return n ? chip(tone, 'You owe ' + n) : Tx('Nothing needed', 'Body/S', 'text/tertiary'); };
  var route = function (a, b) { var v = VV({ name: 'Stack', gap: 2 }); addAll(v, [Tx(a, 'Label/S'), Tx(b, 'Body/S', 'text/tertiary')]); return v; };
  /* the customer's reference never changes; quotation and job codes sit beside it once they exist */
  var ref = function (req, also) { var v = VV({ name: 'Reference', gap: 2 }); add(v, Tx(req, 'Mono/Caption', 'text/primary')); if (also) add(v, Tx(also, 'Mono/Caption', 'text/tertiary')); return v; };
  var t = tbl('Requests', REQ_COLS, [
    { cells: [ref('REQ-2026-0162', 'Job CBRT-2026-041'), route('Ho Chi Minh City → Phnom Penh', 'Road, private trailer'), '4', '18 Oct 2026', stageChip('Documents'), owe(4, 'Bad'), rowOpen()], hl: true },
    { cells: [ref('REQ-2026-0179', 'Quote Q-2026-0188'), route('Phnom Penh → Hong Kong (Sha Tin)', 'Air, business class'), '2', '20 Nov 2026', stageChip('Quotation'), owe(1, 'Warn'), rowOpen()] },
    { cells: [ref('REQ-2026-0193'), route('Ho Chi Minh City → Bangkok', 'Road, shared load'), '2', '30 Oct 2026', stageChip('Request'), owe(0), rowOpen()] }
  ]);
  tableFoot(t, 3, 3, 'requests');
  var list = tableBlock({ tabs: [['Active · 3', 'Active'], ['Past · 1', 'Default']], filters: [filterField('Search', 'Search', 'Code, route or horse', { placeholder: true })],
    count: '3 active requests', order: 'Order: what needs you first', table: t });
  var hint = Tx('Your request number stays the same from submission to handover; the quotation and job codes appear beside it once they exist.', 'Body/S', 'text/tertiary', { w: 760 });
  return trackScreen('Tracking · My requests', trackHead('My requests', [null, '3 active, 1 past · Saigon Turf Club'], [], false), [list, hint], '26 Sep 2026');
}

/* ---------- Detail: in review (submitted Sat 26 Sep) ---------- */
function scrTrackReview() {
  var lead = nothingOwed('Nothing needed from you right now', 'Next: Yến, logistics manager, checks the route, dates and capacity within 1 business day. You will get the itemised quotation here.', 'Due Monday', '28 Sep 2026');
  var stagesP = stagePanel([
    ['Current', 'Submitted Sat 26 Sep. Yến, logistics manager, is reviewing feasibility.', 'Due Monday', '28 Sep'],
    ['Upcoming', 'Itemised and valid for 7 days. You accept and pay a 30% deposit.', '', ''],
    ['Upcoming', 'Price and horse list lock; the job gets its CBRT code.', '', ''],
    ['Upcoming', 'Your document checklist opens after approval.', '', ''],
    ['Upcoming', 'Two border crossings must clear before departure.', '', ''],
    ['Upcoming', 'Departs 30 Oct 2026, flexible by 3 days.', '', ''],
    ['Upcoming', 'Departure 30 Oct; you confirm handover on arrival.', 'In 34 days', '30 Oct']
  ]);
  var est = panel('Estimate', { gap: 10 });
  addAll(est, [Tx('Your estimate at submission', 'Heading/H4'), Tx('$11,300 – $16,100', 'Display/M'), Tx('An indicative range, not a quote. The quotation will be itemised line by line.', 'Body/S', 'text/tertiary', { fill: true }), divider(),
    fillW(requestSummary(REQ_0193, { title: 'What you sent', bare: true, only: ['Horses', 'Service', 'Route', 'Departure'] }))]);
  var hist = historyPanel([['26 Sep · 09:14', 'Request submitted with 2 horses and a climate-controlled stall.', 'You'], ['26 Sep · 09:14', 'Lead time checked: 34 days before departure, 21 required.', 'System']], null);
  return trackScreen('Tracking · In review', trackHead('Ho Chi Minh City → Bangkok', ['REQ-2026-0193', '2 horses · road, shared load · departs 30 Oct 2026'], [stageChip('Request')], true), [lead, split(stagesP, est), hist], '26 Sep 2026, 11:20');
}

/* ---------- Detail: documents needed ---------- */
function scrTrackDocs() {
  var items = [
    owedItem('Overdue', 'Upload a signed bill of sale', 'Silver Bell · Proof of ownership', 'Rejected 24 Sep by Lan, transport specialist: the bill of sale is unsigned. Upload a signed copy.', 'Overdue by 1 day', 'Was due 25 Sep', 'Upload signed copy', 'upload'),
    owedItem('Soon', 'Extend transit insurance to 20 Oct', 'Shipment · PVI Insurance policy', 'The policy ends 15 Oct, before arrival plus 2 days (20 Oct). Upload the extended policy.', 'Due in 4 days', '30 Sep 2026', 'Upload extended policy', 'upload', { secondary: true }),
    owedItem('Upcoming', 'Book a new EIA (Coggins) test', 'Nightfall · EIA (Coggins) test', 'Valid today, but 77 days old at departure; the limit is 60. The new test must be dated 19 Aug or later.', 'Due in 8 days', '4 Oct 2026', 'Upload test result', 'upload'),
    owedItem('Upcoming', 'Upload a new influenza booster record', 'Silver Bell · Influenza vaccination', 'The booster lapsed on 16 Sep. Give a new booster at least 7 days before departure and upload the record.', 'Due in 15 days', '11 Oct 2026', 'Upload booster record', 'upload')
  ];
  var lead = owedPanel('4 items', 'One is overdue. Each upload is checked against your travel dates the moment you send it, so you will know at once if it passes.', items,
    { text: '14 of 23 documents cleared', pct: 60, note: '4 owed by you. The vet authority issues 4 export health certificates (8–14 Oct); the import permit is with the Cambodian authority.' }, 'See all 23 documents');
  var stagesP = stagePanel([
    ['Done', 'You submitted the request with 4 horses.', '', '2 Sep'],
    ['Done', 'Quotation v2 accepted; deposit paid.', '', '10 Sep'],
    ['Done', 'Approved by Yến, logistics manager. Job CBRT-2026-041.', 'Done', '12 Sep'],
    ['Current', 'You upload; Lan, transport specialist, checks each document.', 'Last due in 15 days', '11 Oct'],
    ['Blocked', 'Lan files the dossiers once documents are cleared. Departure stays locked until then.', 'Expected in 18 days', '14 Oct'],
    ['Upcoming', 'Minh, driver, with two grooms. Pickup 06:00.', '', ''],
    ['Upcoming', 'Pickup 06:00 on 18 Oct; you confirm handover in Phnom Penh.', 'In 22 days', '18 Oct']
  ]);
  var people = peoplePanel([['Lan', 'transport specialist', 'Checks your documents and files the border dossiers.'], ['Yến', 'logistics manager', 'Approved the job; handles changes to dates or price.'], ['Minh', 'driver', 'Drives trailer TX-447 on 18 Oct with two grooms.']]);
  var route = routePanel('Route', 'Planned. Positions will come from checkpoints recorded by the escort.', stopsWith(['Upcoming', 'Upcoming', 'Upcoming', 'Upcoming']), 'Locked', [['Vehicle', 'Trailer TX-447', true], ['Driver', 'Minh'], ['Grooms', '2, one per 3 horses'], ['Distance', '240 km · 6.5 h', true]]);
  var hist = historyPanel([
    ['24 Sep · 16:02', 'Proof of ownership for Silver Bell rejected: the bill of sale is unsigned.', 'Lan, transport specialist'],
    ['21 Sep · 10:15', 'EIA test for Shadowfax uploaded and approved.', 'You, then Lan'],
    ['16 Sep · 02:00', 'Silver Bell\'s influenza booster lapsed; the item was reopened.', 'System'],
    ['12 Sep · 11:30', 'Job approved as CBRT-2026-041; document checklist created (23 items).', 'Yến, logistics manager'],
    ['10 Sep · 18:44', 'Quotation v2 accepted; 30% deposit confirmed.', 'You']
  ], 'Show all 14 events');
  return trackScreen('Tracking · Documents needed', trackHead('Ho Chi Minh City → Phnom Penh', ['REQ-2026-0162', 'job CBRT-2026-041 · 4 horses · road, private trailer · departs 18 Oct 2026, 06:00'], [stageChip('Documents'), chip('Bad', 'Departure locked')], true), [lead, split(column([stagesP, people]), route, SIDE.wide), hist], '26 Sep 2026, 11:20');
}

/* ---------- Detail: in transit ---------- */
function scrTrackTransit() {
  var lead = nothingOwed('Nothing needed from you', 'Your horses cleared the Mộc Bài – Bavet border at 08:34. Next checkpoint: the Svay Rieng welfare stop.', 'Expected in 49 min', '09:30');
  var route = panel('Route', { gap: 20 });
  var rh = H({ name: 'Head', main: 'SPACE_BETWEEN', cross: 'MAX' });
  addAll(rh, [VV({ name: 'Title', gap: 2 }, [Tx('On the road', 'Heading/H3'), Tx('Positions come from checkpoints the escort records. Between checkpoints we show the last confirmed one, never a guess.', 'Body/S', 'text/tertiary')]), Tx('Updated 08:41', 'Mono/Caption', 'text/tertiary')]);
  addAll(route, [fillW(rh), fillW(routeStrip(stopsWith(['Done', 'Current', 'Upcoming', 'Upcoming'], ['06:05 · departed', '08:34 · cleared', 'exp. 09:30', 'exp. 12:30']), 'Clear'))]);
  var log = panel('Condition log', { gap: 12 });
  add(log, Tx('Latest condition log', 'Heading/H4'));
  [['08:40', 'All four horses settled and drinking after the border check. Nightfall sweated during loading and is calm now.', 'Hoa, groom'], ['06:02', 'Loaded without incident. Copper King in the box stall, Nightfall in the climate stall.', 'Minh, driver']].forEach(function (r) {
    var e = VV({ name: r[0], gap: 4, pad: [12, 0, 0, 0] });
    borderSide(e, 'border/default', 'top');
    var h = H({ name: 'Head', gap: 10, cross: 'CENTER' });
    addAll(h, [Tx(r[0], 'Mono/Data', 'text/primary'), Tx(r[2], 'Body/S', 'text/tertiary')]);
    addAll(e, [h, Tx(r[1], 'Body/S', 'text/secondary', { fill: true })]);
    add(log, fillW(e));
  });
  var stagesP = stagePanel([
    ['Done', 'Submitted with 4 horses.', '', '2 Sep'], ['Done', 'Quotation v2 accepted.', '', '10 Sep'], ['Done', 'Approved. Job CBRT-2026-041.', '', '12 Sep'],
    ['Done', '21 of 21 documents cleared.', '', '14 Oct'], ['Done', 'Dossiers approved; quarantine complete.', 'Done', '17 Oct'],
    ['Current', 'On the road with Minh, driver, and two grooms since 06:05.', 'Arrives in about 4 h', '12:30'], ['Upcoming', 'You confirm handover and condition on arrival.', 'Due within 2 days', 'by 20 Oct']
  ], 'Where it stands');
  var hist = historyPanel([['18 Oct · 08:34', 'Cleared Vietnam export and Cambodia entry at Mộc Bài – Bavet.', 'Minh, driver'], ['18 Oct · 06:05', 'Departed Phú Thọ training centre.', 'Minh, driver'], ['17 Oct · 16:20', 'Clearance complete; departure unlocked.', 'Lan, transport specialist']], 'Show all 31 events');
  return trackScreen('Tracking · In transit', trackHead('Ho Chi Minh City → Phnom Penh', ['REQ-2026-0162', 'job CBRT-2026-041 · 4 horses · departed 18 Oct 2026, 06:05'], [stageChip('Trip')], true), [lead, route, split(stagesP, log, SIDE.wide), hist], '18 Oct 2026, 08:41');
}

/* ---------- Detail: delivered ---------- */
function scrTrackDelivered() {
  var items = [owedItem('Soon', 'Confirm handover and condition', 'Shipment · 4 horses delivered 12:41', 'Hoa, groom, logged all four horses sound on arrival. Confirm receipt, or report a problem. If you don’t reply by 20 Oct, the handover is taken as accepted on Hoa’s record.', 'Due in 2 days', '20 Oct 2026', 'Confirm handover', 'check', { second: 'Report a problem' })];
  var lead = owedPanel('1 item', 'Your horses arrived at Phnom Penh Equestrian Centre at 12:41, eleven minutes after the planned time.', items,
    { chipTone: 'Warn', chipLabel: 'Waiting for you' }, null);
  var route = routePanel('Route', 'Completed. Every checkpoint was recorded by the escort.', stopsWith(['Done', 'Done', 'Done', 'Done'], ['06:05', '08:34', '09:36', '12:41']), 'Clear', [['On time', 'Yes, 11 min after plan'], ['Distance', '240 km', true], ['Border', 'Cleared, no hold']]);
  var arr = panel('Arrival record', { gap: 12 });
  add(arr, Tx('Arrival condition', 'Heading/H4'));
  [['Shadowfax', 'Sound. Ate on arrival.'], ['Nightfall', 'Sound. Slight sweat at unloading, settled within 10 min.'], ['Copper King', 'Sound. Walked off calmly.'], ['Silver Bell', 'Sound. Drinking well.']].forEach(function (h) {
    var row = H({ name: h[0], gap: 16, pad: [10, 0, 10, 0], cross: 'CENTER' });
    borderSide(row, 'border/default', 'top');
    addAll(row, [Tx(h[0], 'Heading/H4', 'text/primary', { w: 140 }), Tx(h[1], 'Body/S', 'text/secondary', { fill: true }), chip('Ok', 'Sound')]);
    add(arr, fillW(row));
  });
  add(arr, Tx('Logged at 12:48 by Hoa, groom. Handed over to Sophea, receiving groom.', 'Body/S', 'text/tertiary', { fill: true }));
  var stagesP = stagePanel([
    ['Done', 'Submitted with 4 horses.', '', '2 Sep'], ['Done', '', '', ''], ['Done', '', '', ''], ['Done', '', '', ''], ['Done', '', '', ''],
    ['Done', 'Delivered at 12:41, 11 minutes after plan.', 'Done', '18 Oct'],
    ['Current', 'Confirm receipt and condition, or report a problem.', 'Due in 2 days', '20 Oct']
  ]);
  var hist = historyPanel([['18 Oct · 12:48', 'Arrival condition logged for 4 horses.', 'Hoa, groom'], ['18 Oct · 12:41', 'Delivered at Phnom Penh Equestrian Centre.', 'Minh, driver'], ['18 Oct · 09:36', 'Welfare stop at Svay Rieng, 45 minutes.', 'Minh, driver']], 'Show all 36 events');
  return trackScreen('Tracking · Delivered', trackHead('Ho Chi Minh City → Phnom Penh', ['REQ-2026-0162', 'job CBRT-2026-041 · 4 horses · delivered 18 Oct 2026, 12:41'], [stageChip('Handover')], true), [lead, split(column([arr, stagesP]), route, SIDE.wide), hist], '18 Oct 2026, 12:50');
}

/* ---------- entries ---------- */
var TRACK_ORDER = ['Tracking · My requests', 'Tracking · In review', 'Tracking · Documents needed', 'Tracking · In transit', 'Tracking · Delivered'];
function trackRowLabel(page) {
  var name = 'Row label · Owner · Request tracking';
  var label = page.children.filter(function (n) { return n.name === name; })[0];
  if (label) return label;
  var bottom = 0;
  page.children.forEach(function (n) { bottom = Math.max(bottom, n.y + n.height); });
  label = Tx('Owner · Request tracking', 'Display/M', 'text/primary', { name: name });
  page.appendChild(label);
  label.x = 0; label.y = bottom + 240;
  return label;
}
/* rebuilds keep row order: a replaced frame takes the old frame's slot */
async function trackScreensCall(builders) {
  var page = await rehydrate(PAGE_NAMES[3]);
  var made = [];
  for (var i = 0; i < builders.length; i++) {
    var s = builders[i]();
    await flush();
    var old = page.children.filter(function (n) { return n.name === s.name && n !== s; });
    var label = trackRowLabel(page), y = label.y + 120;
    if (old.length) { s.x = old[0].x; s.y = old[0].y; old.forEach(function (n) { n.remove(); }); }
    else {
      var idx = TRACK_ORDER.indexOf(s.name), x = 0;
      page.children.forEach(function (n) { if (n !== s && n.type === 'FRAME' && Math.abs(n.y - y) < 1 && TRACK_ORDER.indexOf(n.name) < idx) x = Math.max(x, n.x + n.width + 120); });
      s.x = x; s.y = y;
    }
    made.push(s.name + ' ' + s.id + ' ' + Math.round(s.width) + '×' + Math.round(s.height));
  }
  return report({ screens: made });
}
async function eTrackComponents() {
  var page = await rehydrate(PAGE_NAMES[2]);
  var board = page.children.filter(function (n) { return n.name === 'Components'; })[0];
  board.children.filter(function (n) { return n.name === 'Request tracking'; }).forEach(function (n) { n.remove(); });
  buildTrackingComponents(board);
  await flush();
  return report({ owed: C.owed.id, stageRow: C.stageRow.id, stop: C.stop2.id });
}
async function eTrackScreensA() { return trackScreensCall([scrMyRequests, scrTrackReview, scrTrackDocs]); }
async function eTrackScreensB() { return trackScreensCall([scrTrackTransit, scrTrackDelivered]); }
/* =====================================================================
   Request review (Flow 1, feasibility). The logistics manager decides
   whether a request can be taken before any price exists: five checks,
   each with its evidence, then one of four outcomes (quote, ask for
   information, reject, or grant a lead-time override). The customer's
   side of "ask for information" is a tracking page with one owed item.
   ===================================================================== */
var CHECK_TONE = { ok: 'Ok', pending: 'Info', warn: 'Warn', bad: 'Bad' };

/* rows: [state, check, word, evidence, sub] */
function checksPanel(rows) {
  var p = panel('Feasibility checks', { gap: 0, pad: [20, 24, 8, 24] });
  /* only an 'ok' check passes; pending is said as pending, never counted as a pass */
  var pass = rows.filter(function (r) { return r[0] === 'ok'; }).length, pending = rows.filter(function (r) { return r[0] === 'pending'; }).length;
  var head = H({ name: 'Head', main: 'SPACE_BETWEEN', cross: 'CENTER', pad: [0, 0, 12, 0] });
  var tally = pass === rows.length ? 'All ' + rows.length + ' pass' : pass + ' of ' + rows.length + ' pass' + (pending ? ' · ' + pending + ' pending' : '');
  addAll(head, [Tx('Feasibility checks', 'Heading/H4'), Tx(tally, 'Label/S', pass === rows.length ? 'status/ok/fg' : 'text/secondary')]);
  add(p, fillW(head));
  rows.forEach(function (r) {
    var row = H({ name: r[1], gap: 16, pad: [14, 0, 14, 0], cross: 'MIN' });
    borderSide(row, 'border/default', 'top');
    var st = H({ name: 'Status col', w: 116 });
    add(st, chip(CHECK_TONE[r[0]], r[2]));
    var t = VV({ name: 'Text', gap: 3 });
    addAll(t, [Tx(r[1], 'Label/M', 'text/primary', { fill: true }), Tx(r[3], 'Body/S', 'text/secondary', { fill: true })]);
    if (r[4]) add(t, Tx(r[4], 'Body/S', 'text/tertiary', { fill: true }));
    addAll(row, [st, fillW(t)]);
    add(p, fillW(row));
  });
  return p;
}
function sentPanel(title, facts) {
  var p = panel(title, { gap: 10 });
  add(p, Tx(title, 'Heading/H4'));
  facts.forEach(function (f) { add(p, factRow(f)); });
  return p;
}
/* a multi-line field: the Input component has no textarea. Filled or empty, it has
   the control border; gold is only ever the focused Input, never a resting field */
function noteField(label, value, helper, empty) {
  var v = VV({ name: 'Field · ' + label, gap: 8 });
  var box = VV({ name: 'Control', pad: [12, 12, 12, 12], radius: 8, fill: 'bg/input', stroke: 'border/strong' });
  add(box, Tx(value, 'Body/S', empty ? 'text/tertiary' : 'text/primary', { fill: true }));
  box.resize(100, 104); box.layoutSizingVertical = 'FIXED';
  addAll(v, [Tx(label, 'Label/S', 'text/primary'), fillW(box), Tx(helper, 'Body/S', 'text/tertiary', { fill: true })]);
  return v;
}
function reviewHead(title, code, meta, due, date) {
  var d = VV({ name: 'Review due', gap: 2, cross: 'MAX' });
  addAll(d, [Tx(due, 'Label/S', 'status/warn/fg', { align: 'RIGHT' }), Tx(date, 'Mono/Caption', 'text/tertiary', { align: 'RIGHT' })]);
  var h = pageHeader({ shell: 'staff', back: 'Requests', title: title, code: code, summary: meta, right: [stageChip('Request'), d] });
  h.findOne(function (n) { return n.name === 'Status'; }).itemSpacing = 16;
  return h;
}
function reviewScreen(name, code, head, left, right) {
  var body = H({ name: 'Body', gap: 24 });
  right.resize(SIDE.narrow, right.height); right.layoutSizingHorizontal = 'FIXED';
  addAll(body, [fillW(left), right]);
  return adminScreen(name, 'Requests', ['Requests', code], STAFF.yen, [head, body], 'Mon 28 Sep 2026');
}

/* ---------- REQ-2026-0193: a horse conflict, so ask for information ---------- */
var REVIEW_NOTE = 'Shadowfax and Nightfall will be in Phnom Penh from 18 Oct (job CBRT-2026-041). Should we collect them in Phnom Penh, move the date, or choose other horses?';
function scrReview() {
  var checks = checksPanel([
    ['ok', 'Route served', 'Served', 'Vietnam → Cambodia → Thailand via Mộc Bài – Bavet and Poipet – Aranyaprathet. Regulation catalogs VN v5, KH v7 and TH v4 will be pinned.'],
    ['ok', 'Lead time', 'Met', 'Submitted 34 days before departure; 21 required for a cross-border move.'],
    ['ok', 'Blackout dates', 'Clear', 'No blackout on this route between 27 Oct and 2 Nov, the ±3-day window.'],
    ['pending', 'Capacity', 'Pending', 'The fleet calendar shows 2 shared-load trailers with a climate stall on Ho Chi Minh City → Bangkok in the window.', 'Asked Khôi, fleet & route coordinator, to confirm at 09:32 · waiting'],
    ['bad', 'Horses', 'Conflict', 'Shadowfax and Nightfall are on job CBRT-2026-041 and arrive in Phnom Penh on 18 Oct. They are also on quotation Q-2026-0188, in pre-export isolation in Phnom Penh from 6 Nov.']
  ]);
  var sent = requestSummary(REQ_0193, { title: 'What the customer sent · v1', extra: [['Estimate they saw', '$11,300 – $16,100', true]] });
  var hist = historyPanel([['28 Sep · 09:32', 'Asked Khôi to confirm shared-load capacity for 27 Oct – 2 Nov.', 'Yến, logistics manager'], ['28 Sep · 09:31', 'Horse conflict found: Shadowfax and Nightfall are booked on CBRT-2026-041.', 'System'], ['26 Sep · 09:14', 'Submitted with 2 horses; lead time checked, 34 of 21 days.', 'Saigon Turf Club']], null);
  var left = column([checks, sent, hist]);

  var dec = panel('Decision', { gap: 16 });
  var dh = VV({ name: 'Head', gap: 4 });
  addAll(dh, [Tx('Your decision', 'Heading/H4'), Tx('Ask the customer before quoting.', 'Body/S', 'text/secondary', { fill: true })]);
  add(dec, fillW(dh));
  var ask = VV({ name: 'Ask for information', gap: 12, pad: 16, radius: 8, fill: 'surface/raised', stroke: 'border/strong' });
  addAll(ask, [Tx('Ask for information', 'Label/M'), fillW(noteField('Note to Saigon Turf Club', REVIEW_NOTE, 'Required. The customer sees it exactly as written; the request goes back to them with your note.')), btn('Primary', 'MD', 'Send to customer', { fill: true, trail: 'arrow-right' })]);
  add(dec, fillW(ask));
  add(dec, divider());
  var other = VV({ name: 'Other outcomes', gap: 10 });
  addAll(other, [Tx('Other outcomes', 'Label/S', 'text/secondary'), btn('Secondary', 'MD', 'Start quotation', { fill: true }), Tx('Waits on the Horses check.', 'Body/S', 'text/tertiary', { fill: true }), btn('Ghost', 'MD', 'Reject with a reason', { fill: true })]);
  add(dec, fillW(other));
  var right = column([dec]);
  return reviewScreen('Logistics manager · Request review', 'REQ-2026-0193', reviewHead('Ho Chi Minh City → Bangkok', 'REQ-2026-0193', 'Saigon Turf Club · 2 horses · road, shared load · departs 30 Oct 2026 ±3 d', 'Due today', '28 Sep'), left, right);
}

/* ---------- REQ-2026-0190: inside the lead time, so an express override ---------- */
function scrReviewOverride() {
  var checks = checksPanel([
    ['ok', 'Route served', 'Served', 'Vietnam → Laos via Cầu Treo – Nam Phao. Regulation catalogs VN v5 and LA v3 will be pinned.'],
    ['bad', 'Lead time', 'Too short', 'Submitted 25 days before departure; 30 required for Vietnam → Laos. Without an override, the earliest departure is 25 Oct 2026.', 'The customer asked for an express override: “Race entry at Vientiane closes 22 Oct.”'],
    ['ok', 'Blackout dates', 'Clear', 'No blackout on this route on 20 Oct.'],
    ['ok', 'Capacity', 'Confirmed', 'One private trailer free 19–21 Oct.', 'Confirmed by Khôi, fleet & route coordinator, 26 Sep 16:10'],
    ['ok', 'Horses', 'Free', 'Lotus Crown has no other bookings and is already in quarantine at Sóc Sơn until 15 Oct.']
  ]);
  var sent = sentPanel('What the customer sent · v1', [['Horses', 'Lotus Crown'], ['Service', 'Road, private trailer'], ['Pickup', 'Sóc Sơn quarantine station, Hanoi'], ['Crossing', 'Cầu Treo – Nam Phao'], ['Departure', '20 Oct 2026, fixed', true], ['Estimate they saw', '$3,900 – $5,600', true]]);
  var rates = callout('Info', '2 rates are missing on Hanoi → Vientiane', 'Rate catalog v12 has no road rate or border fee for this corridor yet. Lan, transport specialist, adds them before the quotation can be issued. This does not block the review.');
  var hist = historyPanel([['26 Sep · 16:10', 'Capacity confirmed: one private trailer, 19–21 Oct.', 'Khôi, fleet & route coordinator'], ['25 Sep · 14:40', 'Submitted inside the lead time, with an express-override request.', 'Hanoi Riding Club']], null);
  var left = column([checks, rates, sent, hist]);

  var dec = panel('Decision', { gap: 16 });
  var dh = VV({ name: 'Head', gap: 4 });
  addAll(dh, [Tx('Your decision', 'Heading/H4'), Tx('Only the lead time fails. An express override lets the request continue; it is recorded on the request with your reason.', 'Body/S', 'text/secondary', { fill: true })]);
  add(dec, fillW(dh));
  var ov = VV({ name: 'Express override', gap: 12, pad: 16, radius: 8, fill: 'surface/raised', stroke: 'border/strong' });
  addAll(ov, [Tx('Grant express override', 'Label/M'), fillW(noteField('Reason for the override', 'Why this move can go at 25 days’ notice…', 'Required, and kept on the request. Grant stays unavailable until you write one.', true)), btn('Secondary', 'MD', 'Grant override', { fill: true, state: 'Disabled' })]);
  add(dec, fillW(ov));
  add(dec, divider());
  var other = VV({ name: 'Other outcomes', gap: 10 });
  addAll(other, [Tx('Other outcomes', 'Label/S', 'text/secondary'), btn('Secondary', 'MD', 'Refuse override and reject', { fill: true }), Tx('Rejects with your reason; the customer can copy the request into a new draft dated 25 Oct or later.', 'Body/S', 'text/tertiary', { fill: true })]);
  add(dec, fillW(other));
  return reviewScreen('Logistics manager · Request review · Override', 'REQ-2026-0190', reviewHead('Hanoi → Vientiane', 'REQ-2026-0190', 'Hanoi Riding Club · 1 horse · road, private trailer · departs 20 Oct 2026', 'Due today', '28 Sep'), left, column([dec]));
}

/* ---------- the customer's side: the request came back with a question ---------- */
function scrTrackInfo() {
  /* the question has three answers, so the customer picks one here; each opens the matching edit, prefilled */
  var answer = VV({ name: 'Your answer', gap: 12, pad: [0, 20, 20, 72] });
  var go = H({ name: 'Actions', gap: 16, cross: 'CENTER' });
  addAll(go, [btn('Primary', 'MD', 'Continue with this answer', { trail: 'arrow-right' }), Tx('Opens your request with the pickup set to Phnom Penh Equestrian Centre. Check it, then send it back as version 2.', 'Body/S', 'text/tertiary', { fill: true })]);
  addAll(answer, [Tx('Your answer', 'Label/S', 'text/secondary'), fillW(svcOptions([
    ['Selected', 'Collect them in Phnom Penh', 'Both arrive at Phnom Penh Equestrian Centre on 18 Oct.', 'Pickup moves; the estimate updates', null],
    ['Default', 'Move the date', 'Pick a later departure. Yến checks it against their other bookings.', 'Lead time checked again', null],
    ['Default', 'Choose other horses', 'Swap in horses from your list that are free on 30 Oct.', 'The estimate updates', null]], true)), fillW(go)]);
  var items = [owedItem('Soon', 'Answer Yến’s question', 'REQ-2026-0193 · version 1', REVIEW_NOTE + ' Reply by 9 Oct to keep the 30 Oct departure; after that the 21-day lead time moves it.', 'Reply in 11 days', '9 Oct 2026', 'Withdraw request', null, { secondary: true }), fillW(answer)];
  var lead = owedPanel('1 item', 'Yến, logistics manager, reviewed your request this morning and needs one answer before she can quote.', items, { chipTone: 'Warn', chipLabel: 'Waiting for you' }, null);
  var stagesP = stagePanel([
    ['Current', 'Returned to you on 28 Sep with one question from Yến. Your answer is above.', '', ''],
    ['Upcoming', 'Itemised and valid for 7 days. You accept and your 30% deposit is acknowledged.', '', ''],
    ['Upcoming', 'Price and horse list lock; the job gets its CBRT code.', '', ''],
    ['Upcoming', 'Your document checklist opens after approval.', '', ''],
    ['Upcoming', 'Two border crossings must clear before departure.', '', ''],
    ['Upcoming', 'Departs 30 Oct 2026, flexible by 3 days.', '', ''],
    ['Upcoming', 'Departure 30 Oct; you confirm handover on arrival.', 'In 32 days', '30 Oct']
  ]);
  var ver = panel('Versions', { gap: 10 });
  var v1 = H({ name: 'v1', gap: 10, cross: 'CENTER' });
  addAll(v1, [Tx('v1', 'Mono/Data'), Tx('Submitted 26 Sep 09:14 · returned 28 Sep 09:41', 'Body/S', 'text/secondary', { fill: true }), chip('Info', 'Current', { noDot: true })]);
  addAll(ver, [Tx('Versions', 'Heading/H4'), fillW(v1), Tx('Your changes become v2. You and Yến both keep v1, so nothing you sent is lost.', 'Body/S', 'text/tertiary', { fill: true })]);
  var est = panel('Estimate', { gap: 10 });
  addAll(est, [Tx('Your estimate at submission', 'Heading/H4'), Tx('$11,300 – $16,100', 'Display/M'), Tx('Still an indicative range. It updates if you change the horses, route or date.', 'Body/S', 'text/tertiary', { fill: true })]);
  var hist = historyPanel([['28 Sep · 09:41', 'Returned with a question: where to collect Shadowfax and Nightfall.', 'Yến, logistics manager'], ['26 Sep · 09:14', 'Request submitted with 2 horses and a climate-controlled stall.', 'You'], ['26 Sep · 09:14', 'Lead time checked: 34 days before departure, 21 required.', 'System']], null);
  return trackScreen('Tracking · Info required', trackHead('Ho Chi Minh City → Bangkok', ['REQ-2026-0193', '2 horses · road, shared load · departs 30 Oct 2026'], [stageChip('Request')], true), [lead, split(stagesP, column([ver, est])), hist], '28 Sep 2026, 10:05');
}

/* =====================================================================
   Quotation builder (EPIC-F1B). The same ledger the customer reads, built
   from the pinned rate catalog. Quantities are derived, percentages name
   their base, overrides carry a reason, and the total is never typed.
   ===================================================================== */
function builderHead(title, code, meta, back, chips) { return pageHeader({ shell: 'staff', back: back, title: title, code: code, summary: meta, right: chips }); }
/* the override opens in place under its line; focus/selection accent only */
function overrideEditor(catalog, value, reason) {
  var e = VV({ name: 'Override editor', gap: 14, pad: [16, 20, 16, 20], fill: 'surface/raised', stroke: 'border/strong' });
  var top = H({ name: 'Values', gap: 24, cross: 'MAX' });
  var cat = VV({ name: 'Catalog value', gap: 6 });
  addAll(cat, [Tx('Catalog value · v12', 'Label/S', 'text/secondary'), Tx(catalog, 'Mono/Data L', 'text/tertiary', { strike: true })]);
  addAll(top, [cat, input('Text', 'Focus', 'New amount', value, null)]);
  var acts = H({ name: 'Actions', gap: 8 });
  addAll(acts, [btn('Secondary', 'SM', 'Save override'), btn('Ghost', 'SM', 'Remove override')]);
  addAll(e, [Tx('Override this line', 'Label/M'), top, fillW(noteField('Reason, shown to the customer', reason, 'Required. The catalog value is kept beside the override on the quotation.')), acts]);
  return e;
}
function issuePanel(o) {
  var p = panel('Issue', { gap: 12 });
  add(p, Tx(o.title, 'Heading/H4'));
  add(p, dlRow('Total', o.total));
  if (o.deposit) add(p, dlRow('Deposit on acceptance', o.deposit));
  var v = H({ name: 'Validity', gap: 16, main: 'SPACE_BETWEEN', cross: 'CENTER' });
  var vd = VV({ name: 'Until', gap: 2, cross: 'MAX' });
  addAll(vd, [Tx(o.validFor, 'Label/S', 'text/primary', { align: 'RIGHT' }), Tx(o.validUntil, 'Mono/Caption', 'text/tertiary', { align: 'RIGHT' })]);
  addAll(v, [Tx('Validity', 'Body/S', 'text/secondary'), vd]);
  add(p, fillW(v));
  add(p, dlRow('Currency', 'USD · FX pinned at issue', { valueStyle: 'Label/S' }));
  (o.facts || []).forEach(function (f) { add(p, dlRow(f[0], f[1], { valueStyle: 'Label/S' })); });
  add(p, divider());
  var ready = H({ name: 'Readiness', gap: 10, cross: 'CENTER' });
  addAll(ready, [chip(o.ready ? 'Ok' : 'Neutral', o.ready ? 'Ready' : 'Waiting on rates', { noDot: !o.ready }), Tx(o.readyText, 'Body/S', 'text/secondary', { fill: true })]);
  add(p, fillW(ready));
  /* a blocked issue is not gold: an unavailable action is drawn as Secondary, with its reason beside it */
  add(p, btn(o.ready ? 'Primary' : 'Secondary', 'MD', o.issue, { fill: true, state: o.ready ? 'Default' : 'Disabled' }));
  if (o.ready) add(p, btn('Secondary', 'MD', 'Preview as the customer sees it', { fill: true }));
  else if (o.blockedWhy) add(p, Tx(o.blockedWhy, 'Body/S', 'text/tertiary', { fill: true }));
  return p;
}
function builderScreen(name, crumbs, head, left, right, today) {
  var body = H({ name: 'Body', gap: 24 });
  right.resize(SIDE.narrow, right.height); right.layoutSizingHorizontal = 'FIXED';
  addAll(body, [fillW(left), right]);
  return adminScreen(name, 'Requests', crumbs, STAFF.yen, [head, body], today);
}

/* ---------- Q-2026-0188 v2: ready to issue ---------- */
function quoteV1() {
  return QUOTE.map(function (g) { return [g[0], g[1], g[2], g[3].map(function (l) { var c = l.slice(); if (/^Air stall position/.test(c[0])) c[3] = 17400; return c; })]; });
}
function scrBuilder() {
  var T = quoteTotals(), T1 = quoteTotals(quoteV1());
  var overrides = 0, estimated = 0;
  QUOTE.forEach(function (g) { g[3].forEach(function (l) { if (l[4] === 'Overridden') overrides++; if (l[4] === 'Estimated') estimated++; }); });
  var table = quoteTable(QUOTE, T, function (l) { return l[4] === 'Overridden' ? overrideEditor(money(l[2] * l[3]), money(l[5]), l[6].replace(/^Override: (.)/, function (m, c) { return c.toUpperCase(); })) : null; });
  var left = column([table, quoteTotalsPanel(T)]);
  var issue = issuePanel({ title: 'Issue version 2', total: money(T.total), deposit: '30% · ' + money(T.deposit), validFor: 'In 7 days', validUntil: '30 Sep 2026', ready: true,
    readyText: 'All ' + T.lines + ' lines priced · ' + overrides + ' override · ' + estimated + ' estimated', issue: 'Issue quotation v2' });
  var ch = panel('Changed since v1', { gap: 10 });
  addAll(ch, [Tx('Changed since v1', 'Heading/H4'), dlRow('Departure', '12 Nov → 20 Nov'), dlRow('Rate catalog', 'v11 → v12'), dlRow('Air stall position', '$17,400.00 → $16,800.00'), dlRow('Total', money(T1.total) + ' → ' + money(T.total)),
    Tx('Re-issuing pins the current rate catalog. Every other line is unchanged.', 'Body/S', 'text/tertiary', { fill: true })]);
  var ver = panel('Versions', { gap: 10 });
  var v2 = H({ name: 'v2', gap: 10, cross: 'CENTER' });
  addAll(v2, [Tx('v2', 'Mono/Data'), Tx('Draft · 23 Sep 2026', 'Body/S', 'text/secondary', { fill: true }), chip('Neutral', 'Draft', { noDot: true })]);
  var v1 = H({ name: 'v1', gap: 10, cross: 'CENTER' });
  addAll(v1, [Tx('v1', 'Mono/Data', 'text/tertiary'), Tx('Issued 15 Sep · superseded when the departure moved', 'Body/S', 'text/tertiary', { fill: true })]);
  addAll(ver, [Tx('Versions', 'Heading/H4'), fillW(v2), fillW(v1)]);
  return builderScreen('Logistics manager · Quotation builder', ['Requests', 'REQ-2026-0179', 'Quotation'],
    builderHead('Phnom Penh → Hong Kong (Sha Tin)', 'Q-2026-0188', 'v2 draft · Saigon Turf Club · 2 horses · air, business class · departs 20 Nov 2026', 'REQ-2026-0179', [stageChip('Quotation'), chip('Neutral', 'Rates v12 pinned', { noDot: true })]),
    left, column([issue, ch, ver]), 'Wed 23 Sep 2026');
}

/* ---------- REQ-2026-0190 v1: two rates missing, so issuing is blocked ---------- */
var QUOTE_HAN = [
  ['A', 'Ground transport · origin', false, [
    ['Loading and handling at Sóc Sơn', 'per horse', 1, 120, 'Fixed']]],
  ['B', 'Pre-export', false, [
    ['Pre-export isolation · Lotus Crown (gelding)', 'per day · 5 days, 15–20 Oct', 5, 70, 'Fixed'],
    ['Veterinary inspection and bloods', 'per horse', 1, 310, 'Fixed']]],
  ['C', 'Road freight', false, [
    ['Road transfer Hanoi → Vientiane, private trailer', 'per km · about 700 km', 700, null, 'Fixed']]],
  ['D', 'Escort', false, [
    ['Groom, road escort', 'one per three horses · 1 ÷ 3, rounded up = 1', 1, 480, 'Fixed']]],
  ['E', 'Documentation', false, [
    ['Export health certificate', 'per horse', 1, 180, 'Fixed'],
    ['Customs and border documentation · Cầu Treo – Nam Phao', 'per crossing · 1', 1, null, 'Fixed'],
    ['Laos import permit handling', 'per shipment', 1, 260, 'Fixed']]]
];
function scrBuilderBlocked() {
  var T = quoteTotals(QUOTE_HAN);
  var table = quoteTable(QUOTE_HAN, T);
  var tot = panel('Totals', { gap: 10 });
  addAll(tot, [Tx('Totals', 'Heading/H4'), dlRow('Priced lines', money(T.subtotal)), dlRow('Total', '—')]);
  var left = column([callout('Bad', T.missing + ' rates are missing on Hanoi → Vientiane', 'Rate catalog v12 has no private-trailer road rate for this corridor and no border fee for Cầu Treo – Nam Phao. Reported to Lan, transport specialist, 29 Sep 09:05 · waiting.'), table, tot]);
  var issue = issuePanel({ title: 'Issue version 1', total: '—', validFor: 'In 7 days from issue', validUntil: 'not issued', ready: false,
    readyText: (T.lines - T.missing) + ' of ' + T.lines + ' lines priced', issue: 'Issue quotation', 
    facts: [['Lead-time override', 'Granted 28 Sep by Yến']] });
  return builderScreen('Logistics manager · Quotation builder · Blocked', ['Requests', 'REQ-2026-0190', 'Quotation'],
    builderHead('Hanoi → Vientiane', 'REQ-2026-0190', 'quotation v1 draft · Hanoi Riding Club · 1 horse · road, private trailer · departs 20 Oct 2026', 'REQ-2026-0190', [stageChip('Request'), chip('Neutral', 'Rates v12 pinned', { noDot: true })]),
    left, column([issue]), 'Tue 29 Sep 2026');
}

/* ---------- MCP entries ---------- */
/* the customer frame goes right after "In review"; later frames in the row move right to make room */
async function insertAfterCall(builder, afterName) {
  var page = await rehydrate(PAGE_NAMES[3]);
  var s = builder();
  await flush();
  page.children.filter(function (n) { return n.name === s.name && n !== s; }).forEach(function (n) { n.remove(); });
  var after = page.children.filter(function (n) { return n.name === afterName; })[0];
  var x = after.x + after.width + 120, shift = s.width + 120;
  page.children.forEach(function (n) { if (n !== s && n.type === 'FRAME' && Math.abs(n.y - after.y) < 1 && n.x >= x - 1) n.x += shift; });
  s.x = x; s.y = after.y;
  return report({ screens: [s.name + ' ' + s.id + ' ' + Math.round(s.width) + '×' + Math.round(s.height)] });
}
async function eReviewScreens() { return staffScreensCall([scrReview, scrReviewOverride]); }
async function eBuilderScreens() { return staffScreensCall([scrBuilder, scrBuilderBlocked]); }
async function eReviewCustomer() { return insertChainCall([scrTrackInfo], 'Tracking · In review'); }
/* =====================================================================
   Document upload and versions (Flow 2, customer). One page per required
   document: the rule in words, the file and its dates, and the automatic
   check's answer directly under the fields, before any person looks at
   it. The check reads the travel dates, not today: GREEN goes to review,
   AMBER is kept but won't clear, RED is refused and nothing is saved.
   Every version stays listed, and so does every refused attempt.
   ===================================================================== */
var EIA_RULE = 'Sampled within 60 days of departure. For your departure on 18 Oct, the test must be sampled on 19 Aug or later.';

/* the three answers the check can give today; the ranges move with today's date */
function rulePanel(today, outcomes) {
  var p = panel('The rule', { gap: 14 });
  var h = VV({ name: 'Head', gap: 6 });
  addAll(h, [Tx('What this test must show', 'Heading/H4'), Tx(EIA_RULE, 'Body/M', 'text/primary', { fill: true })]);
  add(p, fillW(h));
  var list = VV({ name: 'Outcomes', gap: 0 });
  outcomes.forEach(function (o) {
    var r = H({ name: o[1], gap: 16, pad: [10, 0, 10, 0], cross: 'CENTER' });
    borderSide(r, 'border/default', 'top');
    var st = H({ name: 'Status col', w: 172 });
    add(st, chip(o[0], o[1]));
    addAll(r, [st, Tx(o[2], 'Body/S', 'text/secondary', { fill: true })]);
    add(list, fillW(r));
  });
  add(p, fillW(list));
  add(p, Tx('Checked against 18 Oct as of ' + today + ' · Cambodia regulation catalog v7, pinned to job CBRT-2026-041', 'Body/S', 'text/tertiary', { fill: true }));
  return p;
}
function fileRow(name, size, action) {
  var r = H({ name: 'File', gap: 12, pad: [12, 16, 12, 12], radius: 8, cross: 'CENTER', fill: 'bg/sunken', stroke: 'border/default' });
  var ic = H({ name: 'Icon wrap', w: 36, h: 36, radius: 8, fill: 'surface/muted', main: 'CENTER', cross: 'CENTER' });
  add(ic, Ic('file', 18, 'text/secondary'));
  var t = VV({ name: 'Text', gap: 2 });
  addAll(t, [Tx(name, 'Mono/Data', 'text/primary'), Tx(size, 'Mono/Caption', 'text/tertiary')]);
  addAll(r, [ic, fillW(t), btn('Ghost', 'SM', action)]);
  return r;
}
/* fields: 4 × [type, state, label, value, helper] laid out two by two */
function uploadPanel(file, fields, result, actions) {
  var p = panel('Your file', { gap: 16 });
  add(p, Tx('Your file', 'Heading/H4'));
  add(p, fillW(file));
  [fields.slice(0, 2), fields.slice(2, 4)].forEach(function (pair, i) {
    var row = H({ name: 'Fields ' + (i + 1), gap: 16, cross: 'MIN' });
    pair.forEach(function (f) { add(row, fillW(input(f[0], f[1], f[2], f[3], f[4]))); });
    add(p, fillW(row));
  });
  add(p, result);
  if (actions) add(p, fillW(actions));
  return p;
}
/* versions: [code, when, detail, tone, word, dim] */
function versionsPanel(rows, note) {
  var p = panel('Versions', { gap: 0, pad: [20, 24, 16, 24] });
  add(p, VV({ name: 'Title', pad: [0, 0, 12, 0] }, [Tx('Versions', 'Heading/H4')]));
  rows.forEach(function (v) {
    var r = H({ name: v[0], gap: 12, pad: [12, 0, 12, 0], cross: 'MIN' });
    borderSide(r, 'border/default', 'top');
    var t = VV({ name: 'Text', gap: 3 });
    var top = H({ name: 'Head', gap: 8, cross: 'CENTER' });
    addAll(top, [Tx(v[0], 'Mono/Data', v[5] ? 'text/tertiary' : 'text/primary'), Tx(v[1], 'Mono/Caption', 'text/tertiary')]);
    addAll(t, [top, Tx(v[2], 'Body/S', v[5] ? 'text/tertiary' : 'text/secondary', { fill: true })]);
    addAll(r, [fillW(t), chip(v[3], v[4], { noDot: v[3] === 'Neutral' })]);
    add(p, fillW(r));
  });
  add(p, VV({ name: 'Note', pad: [8, 0, 0, 0] }, [Tx(note, 'Body/S', 'text/tertiary', { w: 352 })]));
  return p;
}
/* where the document stands now: tone + word, what happens next, the deadline twice */
function docStatusPanel(tone, word, line, facts, due) {
  var p = panel('Status', { gap: 12 });
  var h = VV({ name: 'Head', gap: 10 });
  addAll(h, [Tx('Where this test stands', 'Heading/H4'), chip(tone, word)]);
  addAll(p, [fillW(h), Tx(line, 'Body/S', 'text/secondary', { fill: true })]);
  if (due) {
    var d = H({ name: 'Due', gap: 16, main: 'SPACE_BETWEEN', cross: 'CENTER' });
    var dd = VV({ name: 'Date', gap: 2, cross: 'MAX' });
    addAll(dd, [Tx(due[1], 'Label/S', due[3] || 'text/primary', { align: 'RIGHT' }), Tx(due[2], 'Mono/Caption', 'text/tertiary', { align: 'RIGHT' })]);
    addAll(d, [Tx(due[0], 'Body/S', 'text/secondary'), dd]);
    add(p, fillW(d));
  }
  facts.forEach(function (f) { add(p, dlRow(f[0], f[1], { valueStyle: f[2] ? 'Mono/Data' : 'Label/S' })); });
  return p;
}
function docHead() {
  return trackHead('Nightfall · EIA (Coggins) test', ['REQ-2026-0162', 'job CBRT-2026-041 · Ho Chi Minh City → Phnom Penh · departs 18 Oct 2026'], [stageChip('Documents')], 'Your documents');
}
var LAN_CHECKS = [['Lan', 'transport specialist', 'Reviews the test after the automatic check, usually within 1 business day. Only a test she approves counts toward clearance.']];

/* ---------- GREEN: the new test passes and goes to Lan (Fri 2 Oct) ---------- */
function scrDocUpload() {
  var rule = rulePanel('2 Oct', [
    ['Ok', 'Passes', 'Sampled 19 Aug or later. Goes to Lan for review.'],
    ['Warn', 'Expires in transit', 'Sampled 3–18 Aug. Still valid today but too old at departure, so it is kept and a replacement is needed by 4 Oct.'],
    ['Bad', 'Refused', 'Sampled 2 Aug or earlier. Already more than 60 days old, so it is refused and not saved.']
  ]);
  var res = callout('Ok', 'Passes: sampled 1 Oct, 17 days before departure', 'The limit is 60 days, so this test covers 18 Oct with 43 days to spare. Sent to Lan, transport specialist, for review; her decision appears here.');
  var up = uploadPanel(fileRow('EIA_Nightfall_2026-10-01.pdf', 'PDF · 412 KB · uploaded 2 Oct 2026, 10:12', 'Replace file'), [
    ['Date', 'Default', 'Sample date', '1 Oct 2026', 'As printed on the certificate. The rule counts from this date.'],
    ['Select', 'Default', 'Issuing laboratory', 'NAVETCO Laboratory, Ho Chi Minh City', 'An approved laboratory for Cambodia.'],
    ['Select', 'Default', 'Result', 'Negative', null],
    ['Date', 'Default', 'Valid until', '30 Nov 2026', 'Not printed on this test, so worked out as the sample date + 60 days.']
  ], res, null);
  var status = docStatusPanel('Info', 'In review', 'Nothing more is needed from you for this test. If Lan approves it, Nightfall’s EIA test is cleared.', [['With', 'Lan, transport specialist'], ['Uploaded', '2 Oct 2026, 10:12', true]], ['Your deadline', 'Met 2 days early', 'was due 4 Oct', 'status/ok/fg']);
  var ver = versionsPanel([
    ['v2', '2 Oct 2026', 'Sampled 1 Oct · NAVETCO · 17 days old at departure.', 'Info', 'In review'],
    ['Attempt', '27 Sep 2026', 'Sampled 20 Jul · 90 days old at departure. Refused at upload; the file was not saved.', 'Bad', 'Refused', true],
    ['v1', '4 Aug 2026', 'Sampled 2 Aug · 77 days old at departure. Kept for the record; replaced by v2.', 'Neutral', 'Replaced', true]
  ], 'Every version is kept, and Lan sees the same list. Refused attempts are listed but their files are never stored.');
  var hist = historyPanel([
    ['2 Oct · 10:12', 'EIA test sampled 1 Oct uploaded as v2. Automatic check: passes, 17 of 60 days.', 'You, then the system'],
    ['27 Sep · 16:40', 'Upload refused: the test was sampled 20 Jul, 90 days before departure.', 'System'],
    ['4 Aug · 09:03', 'v1 uploaded. Automatic check: valid then, but 77 days old at departure.', 'You, then the system']
  ], null);
  return trackScreen('Tracking · Document upload', docHead(), [split(column([rule, up]), column([status, ver, peoplePanel(LAN_CHECKS, 'Who checks it')]), SIDE.narrow), hist], '2 Oct 2026, 10:15');
}

/* ---------- RED: the wrong test is refused on the spot (Sun 27 Sep) ---------- */
function scrDocRefused() {
  var rule = rulePanel('27 Sep', [
    ['Ok', 'Passes', 'Sampled 19 Aug or later. Goes to Lan for review.'],
    ['Warn', 'Expires in transit', 'Sampled 29 Jul – 18 Aug. Still valid today but too old at departure, so it is kept and a replacement is needed by 4 Oct.'],
    ['Bad', 'Refused', 'Sampled 28 Jul or earlier. Already more than 60 days old, so it is refused and not saved.']
  ]);
  var res = callout('Bad', 'Refused: this test is too old', 'Sampled 20 Jul, which is 90 days before your 18 Oct departure and already 69 days old today; the limit is 60 days. A test sampled on 19 Aug or later passes. Nothing was saved.');
  var acts = H({ name: 'Actions', gap: 16, main: 'SPACE_BETWEEN', cross: 'CENTER' });
  var due = VV({ name: 'Due', gap: 2 });
  addAll(due, [Tx('Due in 7 days', 'Label/S', 'text/primary'), Tx('4 Oct 2026', 'Mono/Caption', 'text/tertiary')]);
  addAll(acts, [due, btn('Primary', 'MD', 'Choose another file', { lead: 'upload' })]);
  var up = uploadPanel(fileRow('EIA_Nightfall_2026-07-20.pdf', 'PDF · 388 KB · checked 27 Sep 2026, 16:40 · not saved', 'Remove'), [
    ['Date', 'Error', 'Sample date', '20 Jul 2026', null],
    ['Select', 'Default', 'Issuing laboratory', 'NAVETCO Laboratory, Ho Chi Minh City', 'An approved laboratory for Cambodia.'],
    ['Select', 'Default', 'Result', 'Negative', null],
    ['Date', 'Default', 'Valid until', '18 Sep 2026', 'Not printed on this test, so worked out as the sample date + 60 days.']
  ], res, acts);
  var status = docStatusPanel('Warn', 'Expires in transit', 'Your current test (v1) is valid today but will be 77 days old at departure, so it won’t clear. Upload a test sampled on 19 Aug or later.', [['Current version', 'v1 · 4 Aug 2026', true], ['Checked by', 'Lan, transport specialist']], ['Replacement', 'Due in 7 days', '4 Oct 2026']);
  var ver = versionsPanel([
    ['Attempt', '27 Sep 2026', 'Sampled 20 Jul. Not saved.', 'Bad', 'Refused'],
    ['v1', '4 Aug 2026', 'Sampled 2 Aug · 77 days old at departure. Kept, but it won’t clear.', 'Warn', 'Expires in transit']
  ], 'Every version is kept, and Lan sees the same list. Refused attempts are listed but their files are never stored.');
  return trackScreen('Tracking · Document upload · Refused', docHead(), [split(column([rule, up]), column([status, ver, peoplePanel(LAN_CHECKS, 'Who checks it')]), SIDE.narrow)], '27 Sep 2026, 16:40');
}

/* ---------- the customer's full list: 23 documents, who holds each ---------- */
/* rows: [document, rule, tone, word, holder, due, date, dueTone, result] */
var ALL_DOCS = [
  ['Shadowfax', 'Gelding · Andalusian', [
    ['Equine passport', RULE.passport, 'Ok', 'Cleared', 'Cleared by Lan', 'Done', '2 Sep'],
    ['Influenza vaccination', RULE.vacc, 'Ok', 'Cleared', 'Cleared by Lan', 'Done', '2 Sep'],
    ['EIA (Coggins) test', RULE.eia, 'Ok', 'Cleared', 'Cleared by Lan', 'Done', '21 Sep'],
    ['Export health certificate', RULE.health, 'Neutral', 'Not issued yet', 'the vet authority', 'In 12 days', '8–14 Oct'],
    ['Proof of ownership', RULE.own, 'Ok', 'Cleared', 'Cleared by Lan', 'Done', '2 Sep']]],
  ['Nightfall', 'Mare · Thoroughbred', [
    ['Equine passport', RULE.passport, 'Ok', 'Cleared', 'Cleared by Lan', 'Done', '2 Sep'],
    ['Influenza vaccination', RULE.vacc, 'Ok', 'Cleared', 'Cleared by Lan', 'Done', '2 Sep'],
    ['EIA (Coggins) test', RULE.eia, 'Warn', 'Expires in transit', 'You', 'Due in 8 days', '4 Oct', null, '77 days old at departure. Upload a test sampled on 19 Aug or later.'],
    ['Export health certificate', RULE.health, 'Neutral', 'Not issued yet', 'the vet authority', 'In 12 days', '8–14 Oct'],
    ['Proof of ownership', RULE.own, 'Ok', 'Cleared', 'Cleared by Lan', 'Done', '2 Sep']]],
  ['Copper King', 'Stallion · Quarter Horse', [
    ['Equine passport', RULE.passport, 'Ok', 'Cleared', 'Cleared by Lan', 'Done', '3 Sep'],
    ['Influenza vaccination', RULE.vacc, 'Ok', 'Cleared', 'Cleared by Lan', 'Done', '3 Sep'],
    ['EIA (Coggins) test', RULE.eia, 'Ok', 'Cleared', 'Cleared by Lan', 'Done', '11 Sep'],
    ['Export health certificate', RULE.health, 'Neutral', 'Not issued yet', 'the vet authority', 'In 12 days', '8–14 Oct'],
    ['Proof of ownership', RULE.own, 'Ok', 'Cleared', 'Cleared by Lan', 'Done', '3 Sep']]],
  ['Silver Bell', 'Mare · Lipizzan', [
    ['Equine passport', RULE.passport, 'Ok', 'Cleared', 'Cleared by Lan', 'Done', '4 Sep'],
    ['Influenza vaccination', RULE.vacc, 'Bad', 'Fails rule', 'You', 'Due in 15 days', '11 Oct', null, 'The booster lapsed on 16 Sep. Give a new one at least 7 days before departure.'],
    ['EIA (Coggins) test', RULE.eia, 'Ok', 'Cleared', 'Cleared by Lan', 'Done', '19 Sep'],
    ['Export health certificate', RULE.health, 'Neutral', 'Not issued yet', 'the vet authority', 'In 12 days', '8–14 Oct'],
    ['Proof of ownership', RULE.own, 'Bad', 'Rejected', 'You', 'Overdue by 1 day', 'was due 25 Sep', 'status/bad/fg', 'Rejected 24 Sep by Lan: the bill of sale is unsigned.']]],
  ['Shipment', 'Documents for the whole job', [
    ['Cambodia import permit', 'Valid through arrival + 2 days', 'Info', 'With the authority', 'Cambodia’s GDAHP', 'Expected in 15 days', '11 Oct', null, 'Filed 15 Sep by Lan · ref KH-IP-2026-3381.'],
    ['Transit insurance', 'Must cover the journey + 2 days', 'Warn', 'Expires in transit', 'You', 'Due in 4 days', '30 Sep', 'status/warn/fg', 'Ends 15 Oct, before 20 Oct. Upload the extended policy.'],
    ['Customs value declaration · Mộc Bài – Bavet', 'One per border crossing', 'Ok', 'Cleared', 'Cleared by Lan', 'Done', '20 Sep']]]
];
/* one document row for both sides: the rule result as a chip, who holds it, the deadline twice.
   The customer reads "With you"; staff read "With the customer". */
function allDocRow(d, viewer) {
  var r = H({ name: d[0], gap: 16, pad: [12, 20, 12, 20], cross: 'CENTER' });
  borderSide(r, 'border/default', 'bottom');
  var st = H({ name: 'Status col', w: 170 });
  add(st, chip(d[2], d[3], { noDot: d[2] === 'Neutral' }));
  var info = VV({ name: 'Info', gap: 3 });
  addAll(info, [Tx(d[0], 'Label/M', 'text/primary', { fill: true }), Tx(d[1], 'Body/S', 'text/tertiary', { fill: true })]);
  if (d[8]) add(info, Tx(d[8], 'Body/S', d[2] === 'Bad' ? 'status/bad/fg' : d[2] === 'Warn' ? 'status/warn/fg' : 'text/secondary', { fill: true }));
  var who = VV({ name: 'Holder', gap: 2, w: 190 });
  var mine = d[4] === 'You' && viewer !== 'staff';
  addAll(who, [Tx(d[4] === 'You' ? (viewer === 'staff' ? 'With the customer' : 'With you') : d[4].indexOf('Cleared') === 0 ? d[4] : 'With ' + d[4], 'Label/S', mine ? 'text/primary' : 'text/secondary')]);
  var due = VV({ name: 'Due', gap: 2, w: 150, cross: 'MAX' });
  addAll(due, [Tx(d[5], 'Label/S', d[7] || (d[5] === 'Done' ? 'status/ok/fg' : 'text/primary'), { align: 'RIGHT' }), Tx(d[6], 'Mono/Caption', 'text/tertiary', { align: 'RIGHT' })]);
  var open = H({ name: 'Open', w: 24, main: 'MAX', cross: 'CENTER' });
  add(open, Ic('arrow-right', 16, 'text/tertiary'));
  addAll(r, [st, fillW(info), who, due, open]);
  return r;
}
function docTableSummary(viewer) {
  var sum = panel('Summary', { gap: 12 });
  var sh = H({ name: 'Head', gap: 24, main: 'SPACE_BETWEEN', cross: 'MAX' });
  var st = VV({ name: 'Text', gap: 4 });
  addAll(st, [Tx('All 23 documents', 'Heading/H3'), Tx(viewer === 'staff' ? 'One row per horse and document, plus the shipment’s own papers, in the words the customer sees. Only cleared documents open the departure gate.' : 'One row per horse and document, plus the shipment’s own papers. Each is checked against your travel dates, and only cleared documents open the departure gate.', 'Body/S', 'text/secondary', { fill: true })]);
  addAll(sh, [fillW(st), Tx('14 cleared · 4 with ' + (viewer === 'staff' ? 'the customer' : 'you') + ' · 5 with the authorities', 'Label/S', 'text/secondary', { align: 'RIGHT' })]);
  addAll(sum, [fillW(sh), progress('Ok', 60)]);
  return sum;
}
function docTableTabs(viewer) {
  var tabs = H({ name: 'Tabs', gap: 28 });
  borderSide(tabs, 'border/default', 'bottom');
  [['All · 23', 'Active'], [(viewer === 'staff' ? 'With the customer' : 'With you') + ' · 4', 'Default'], ['With the authorities · 5', 'Default'], ['Cleared · 14', 'Default']].forEach(function (t) { var i = inst(C.tab, { State: t[1] }); setP(i, { Label: t[0] }); i.name = 'Tab · ' + t[0]; add(tabs, i); });
  return tabs;
}
function docTable(viewer) {
  var list = panel('Documents', { gap: 0, pad: 0, clip: true });
  ALL_DOCS.forEach(function (g) {
    var cleared = g[2].filter(function (d) { return d[2] === 'Ok'; }).length;
    var gh = H({ name: g[0], gap: 12, pad: [14, 20, 14, 20], cross: 'CENTER', fill: 'bg/sunken' });
    borderSide(gh, 'border/default', 'bottom');
    addAll(gh, [Tx(g[0], 'Heading/H4'), Tx(g[1], 'Body/S', 'text/tertiary', { fill: true }), Tx(cleared + ' of ' + g[2].length + ' cleared', 'Mono/Caption', 'text/secondary')]);
    add(list, fillW(gh));
    g[2].forEach(function (d) { add(list, fillW(allDocRow(d, viewer))); });
  });
  return list;
}
function scrAllDocs() {
  var sum = docTableSummary('owner'), tabs = docTableTabs('owner'), list = docTable('owner');
  var note = Tx('Export health certificates are issued by the Dept. of Animal Health (VN) 8–14 Oct, inside the 10 days before departure; Lan requests them for you. Open any row to see its versions.', 'Body/S', 'text/tertiary', { w: 760 });
  return trackScreen('Tracking · All documents', trackHead('Ho Chi Minh City → Phnom Penh', ['REQ-2026-0162', 'job CBRT-2026-041 · 4 horses · departs 18 Oct 2026, 06:00'], [stageChip('Documents'), chip('Bad', 'Departure locked')], 'Back to the request'), [sum, tabs, list, note], '26 Sep 2026, 11:20');
}

/* ---------- MCP entry ---------- */
/* the three frames follow "Documents needed" in date order; a rebuilt frame keeps its slot */
async function insertChainCall(builders, afterName) {
  var page = await rehydrate(PAGE_NAMES[3]);
  var made = [];
  for (var i = 0; i < builders.length; i++) {
    var s = builders[i]();
    await flush();
    var old = page.children.filter(function (n) { return n.name === s.name && n !== s; });
    if (old.length) { s.x = old[0].x; s.y = old[0].y; old.forEach(function (n) { n.remove(); }); }
    else {
      var after = page.children.filter(function (n) { return n.name === afterName; })[0];
      var x = after.x + after.width + 120, shift = s.width + 120;
      page.children.forEach(function (n) { if (n !== s && n.type === 'FRAME' && Math.abs(n.y - after.y) < 1 && n.x >= x - 1) n.x += shift; });
      s.x = x; s.y = after.y;
    }
    afterName = s.name;
    made.push(s.name + ' ' + s.id + ' ' + Math.round(s.width) + '×' + Math.round(s.height));
  }
  return report({ screens: made });
}
async function eDocScreens() { return insertChainCall([scrAllDocs, scrDocRefused, scrDocUpload], 'Tracking · Documents needed'); }

/* =====================================================================
   Document review (Flow 2, staff). Lan reads the paper beside what the
   customer typed and ticks what only a person can confirm. Approve needs
   every check ticked; Reject needs a reason the customer sees verbatim.
   The file preview is a picture of paper, so it always renders light.
   ===================================================================== */
/* fields: [label, value]; o: { head, sub, ref, title, result, signs: [[who, name, signed]] } */
function paperDoc(o) {
  var p = VV({ name: 'Paper', gap: 18, pad: [36, 40, 36, 40], radius: 4, fill: 'surface/card', stroke: 'border/strong' });
  if (COLL.light) p.setExplicitVariableModeForCollection(COLL.color, COLL.light);
  var top = H({ name: 'Letterhead', gap: 16, main: 'SPACE_BETWEEN', cross: 'MIN' });
  var lh = VV({ name: 'Issuer', gap: 2 });
  addAll(lh, [Tx(o.head, 'Heading/H3', 'text/primary'), Tx(o.sub, 'Body/S', 'text/secondary', { fill: true })]);
  addAll(top, [fillW(lh), Tx(o.ref, 'Mono/Caption', 'text/secondary', { align: 'RIGHT' })]);
  addAll(p, [fillW(top), divider(), Tx(o.title, 'Label/M', 'text/primary')]);
  var grid = VV({ name: 'Fields', gap: 0 });
  o.fields.forEach(function (f) {
    var r = H({ name: f[0], gap: 16, pad: [7, 0, 7, 0], cross: 'CENTER' });
    borderSide(r, 'border/default', 'bottom');
    addAll(r, [Tx(f[0], 'Body/S', 'text/secondary', { w: 170 }), Tx(f[1], 'Mono/Data', 'text/primary', { fill: true })]);
    add(grid, fillW(r));
  });
  add(p, fillW(grid));
  if (o.result) {
    var res = H({ name: 'Result', gap: 16, pad: [12, 16, 12, 16], radius: 4, stroke: 'text/primary', sw: 1.5, cross: 'CENTER' });
    addAll(res, [Tx('Result', 'Body/S', 'text/secondary'), Tx(o.result, 'Heading/H4', 'text/primary')]);
    add(p, res);
  }
  var signs = H({ name: 'Signatures', gap: 24, pad: [8, 0, 0, 0] });
  o.signs.forEach(function (sg) {
    var box = VV({ name: 'Sign · ' + sg[0], gap: 6, pad: [10, 12, 10, 12], radius: 4, stroke: sg[2] ? 'border/default' : 'status/bad/fg', sw: sg[2] ? 1 : 1.5, dash: sg[2] ? null : [4, 3] });
    var line = H({ name: 'Line', h: 40, cross: 'MAX' });
    if (sg[2]) {
      var sig = Tx(sg[2], 'Heading/H3', 'text/primary', { noStyle: true });
      if (FONT['display/Italic']) sig.fontName = FONT['display/Italic'];
      add(line, sig);
    } else add(line, chip('Bad', 'Not signed'));
    addAll(box, [fillW(line), divider(), Tx(sg[0], 'Body/S', 'text/secondary'), Tx(sg[1], 'Label/S', 'text/primary')]);
    add(signs, fillW(box));
  });
  add(p, fillW(signs));
  return p;
}
function fileViewer(name, paper) {
  var v = panel('File', { gap: 0, pad: 0, clip: true });
  var bar = H({ name: 'Toolbar', gap: 12, pad: [12, 16, 12, 20], cross: 'CENTER' });
  borderSide(bar, 'border/default', 'bottom');
  addAll(bar, [Ic('file', 16, 'text/secondary'), Tx(name, 'Mono/Data', 'text/primary', { fill: true }), Tx('Page 1 of 1', 'Mono/Caption', 'text/tertiary'), btn('Ghost', 'SM', 'Open original')]);
  var well = VV({ name: 'Well', pad: [32, 40, 40, 40], fill: 'bg/sunken' });
  add(well, fillW(paper));
  addAll(v, [fillW(bar), fillW(well)]);
  return v;
}
/* checks: [state 'on' | 'off' | 'bad', text, sub] */
function checksList(rows, done) {
  var p = panel('Your checks', { gap: 0, pad: [20, 24, 12, 24] });
  var h = H({ name: 'Head', main: 'SPACE_BETWEEN', cross: 'CENTER', pad: [0, 0, 12, 0] });
  addAll(h, [Tx('Your checks', 'Heading/H4'), Tx(done, 'Label/S', rows.some(function (r) { return r[0] !== 'on'; }) ? 'status/bad/fg' : 'status/ok/fg')]);
  add(p, fillW(h));
  rows.forEach(function (r) {
    var row = H({ name: r[1], gap: 12, pad: [10, 0, 10, 0], cross: 'MIN' });
    borderSide(row, 'border/default', 'top');
    var cb = inst(C.checkbox, { Checked: r[0] === 'on' ? 'True' : 'False' });
    setP(cb, { 'Show label': false });
    if (r[0] === 'bad') cb.findOne(function (n) { return n.name === 'Box'; }).strokes = [P('status/bad/fg')];
    var t = VV({ name: 'Text', gap: 2 });
    add(t, Tx(r[1], 'Body/S', 'text/primary', { fill: true }));
    if (r[2]) add(t, Tx(r[2], 'Body/S', r[0] === 'bad' ? 'status/bad/fg' : 'text/tertiary', { fill: true }));
    addAll(row, [VV({ name: 'Box col', pad: [1, 0, 0, 0] }, [cb]), fillW(t)]);
    add(p, fillW(row));
  });
  return p;
}
function autoCheck(tone, word, text) {
  var p = panel('Automatic check', { gap: 10 });
  var h = H({ name: 'Head', gap: 12, main: 'SPACE_BETWEEN', cross: 'CENTER' });
  addAll(h, [Tx('Automatic check', 'Heading/H4'), chip(tone, word)]);
  addAll(p, [fillW(h), Tx(text, 'Body/S', 'text/secondary', { fill: true })]);
  return p;
}
function docReviewScreen(name, crumb, title, meta, due, dueDate, dueTone, left, right, hist, today) {
  var d = VV({ name: 'Review due', gap: 2, cross: 'MAX' });
  addAll(d, [Tx(due, 'Label/S', dueTone, { align: 'RIGHT' }), Tx(dueDate, 'Mono/Caption', 'text/tertiary', { align: 'RIGHT' })]);
  var head = builderHead(title, 'CBRT-2026-041', meta, 'Documents', [stageChip('Documents'), chip('Info', 'In review'), d]);
  head.findOne(function (n) { return n.name === 'Status'; }).itemSpacing = 12;
  var body = H({ name: 'Body', gap: 24 });
  right.resize(SIDE.narrow, right.height); right.layoutSizingHorizontal = 'FIXED';
  addAll(body, [fillW(left), right]);
  return adminScreen(name, 'Documents', ['Documents', crumb], STAFF.lan, [head, body].concat(hist ? [hist] : []), today);
}

/* ---------- approve: Nightfall's EIA test v2 (Fri 2 Oct) ---------- */
function scrDocReview() {
  var paper = paperDoc({ head: 'NAVETCO Laboratory', sub: 'National Centre for Veterinary Diagnostics · Ho Chi Minh City branch', ref: 'Accreditation VILAS 214\nCertificate EIA-2610-0873',
    title: 'Equine Infectious Anaemia · AGID (Coggins) test',
    fields: [['Horse', 'Nightfall'], ['Sex · breed', 'Mare · Thoroughbred'], ['Microchip', '250 259 600 223 311'], ['Owner', 'Saigon Turf Club'], ['Date sampled', '01/10/2026'], ['Date tested', '02/10/2026'], ['Method', 'Agar gel immunodiffusion']],
    result: 'NEGATIVE', signs: [['Sampling veterinarian', 'Dr Trần Văn Phúc', 'T. V. Phúc'], ['Laboratory head · stamp', 'Dr Lê Thị Mai', 'L. T. Mai']] });
  var left = fileViewer('EIA_Nightfall_2026-10-01.pdf', paper);
  var checks = checksList([
    ['on', 'The sample date on the paper matches the entered date', '01/10/2026 on the certificate; 1 Oct 2026 entered.'],
    ['on', 'The laboratory is on Cambodia’s approved list', 'NAVETCO, accreditation VILAS 214.'],
    ['on', 'The result is negative'],
    ['on', 'The microchip matches Nightfall’s passport', '…223 311 on both; passport v1, cleared 2 Sep.'],
    ['on', 'Signed and stamped by the veterinarian']
  ], 'All 5 ticked');
  var dec = panel('Decision', { gap: 12 });
  addAll(dec, [Tx('Your decision', 'Heading/H4'), Tx('Approving clears Nightfall’s EIA test: 15 of 23 documents cleared. The departure gate still waits for 8.', 'Body/S', 'text/secondary', { fill: true }),
    btn('Primary', 'MD', 'Approve', { fill: true, lead: 'check' }), btn('Ghost', 'MD', 'Reject with a reason', { fill: true })]);
  var ver = versionsPanel([
    ['v2', '2 Oct 2026', 'Sampled 1 Oct · NAVETCO · 17 days old at departure. This version.', 'Info', 'In review'],
    ['Attempt', '27 Sep 2026', 'Sampled 20 Jul · 90 days old at departure. Refused at upload; not saved.', 'Bad', 'Refused', true],
    ['v1', '4 Aug 2026', 'Sampled 2 Aug · 77 days old at departure. Replaced by v2.', 'Neutral', 'Replaced', true]
  ], 'The customer sees the same list. Approving or rejecting is added to both histories.');
  var right = column([autoCheck('Ok', 'Passes', 'Sampled 1 Oct, 17 days before the 18 Oct departure; the limit is 60 (Cambodia regulation catalog v7, pinned to this job).'), checks, dec, ver]);
  var hist = historyPanel([['2 Oct · 10:12', 'v2 uploaded by Saigon Turf Club. Automatic check: passes, 17 of 60 days.', 'System'], ['2 Oct · 10:12', 'Assigned to Lan for review; due by end of Mon 5 Oct.', 'System'], ['27 Sep · 16:40', 'Upload refused at the automatic check: sampled 20 Jul.', 'System']], null);
  return docReviewScreen('Transport specialist · Document review', 'Nightfall · EIA test', 'Nightfall · EIA (Coggins) test', 'REQ-2026-0162 · Saigon Turf Club · departs 18 Oct 2026', 'Due in 1 business day', '5 Oct', 'text/primary', left, right, hist, 'Fri 2 Oct 2026');
}

/* ---------- reject: Silver Bell's unsigned bill of sale (Thu 24 Sep) ---------- */
function scrDocReject() {
  var paper = paperDoc({ head: 'Bill of sale', sub: 'Sale of a registered horse · Đà Lạt, 20 Aug 2026', ref: 'Ref HGS-2026-017',
    title: 'The seller transfers full ownership of the horse below to the buyer.',
    fields: [['Seller', 'Hoàng Gia Stud, Đà Lạt'], ['Buyer', 'Saigon Turf Club, Ho Chi Minh City'], ['Horse', 'Silver Bell'], ['Sex · breed', 'Mare · Lipizzan'], ['Microchip', '203 098 100 554 120'], ['Price', '₫ 1,850,000,000'], ['Handover', '22 Aug 2026']],
    signs: [['Seller', 'Hoàng Gia Stud', null], ['Buyer', 'Saigon Turf Club', 'N. Q. Huy']] });
  var left = fileViewer('Silver-Bell_bill-of-sale.pdf', paper);
  var checks = checksList([
    ['on', 'The horse and microchip match Silver Bell’s passport', '…554 120 on both.'],
    ['on', 'The buyer is Saigon Turf Club'],
    ['bad', 'Signed by both parties', 'The seller’s signature is missing (bottom left).']
  ], '1 of 3 not ticked');
  var comp = VV({ name: 'Reject with a reason', gap: 12, pad: 16, radius: 8, fill: 'surface/raised', stroke: 'border/strong' });
  var due = H({ name: 'New version due', gap: 16, main: 'SPACE_BETWEEN', cross: 'CENTER' });
  var dd = VV({ name: 'Date', gap: 2, cross: 'MAX' });
  addAll(dd, [Tx('Due tomorrow', 'Label/S', 'status/warn/fg', { align: 'RIGHT' }), Tx('25 Sep 2026', 'Mono/Caption', 'text/tertiary', { align: 'RIGHT' })]);
  addAll(due, [Tx('New version due', 'Body/S', 'text/secondary'), dd]);
  addAll(comp, [Tx('Reject with a reason', 'Label/M'),
    fillW(noteField('Reason, shown to Saigon Turf Club', 'The bill of sale is not signed by the seller (bottom left). Upload a copy signed by both Hoàng Gia Stud and Saigon Turf Club.', 'Required. The customer sees it exactly as written; the item returns to Required and this version is kept.')),
    fillW(due), btn('Primary', 'MD', 'Reject and notify customer', { fill: true, trail: 'arrow-right' })]);
  var dec = panel('Decision', { gap: 12 });
  addAll(dec, [Tx('Your decision', 'Heading/H4'), fillW(comp), divider(), btn('Secondary', 'MD', 'Approve', { fill: true, state: 'Disabled' }), Tx('Approve needs every check ticked. 1 isn’t: signed by both parties.', 'Body/S', 'text/tertiary', { fill: true })]);
  var ver = versionsPanel([['v1', '24 Sep 2026', 'Bill of sale dated 20 Aug 2026. This version; kept after a rejection.', 'Info', 'In review']], 'The customer sees the same list. A rejected version stays in the history.');
  var right = column([autoCheck('Ok', 'Present', 'Proof of ownership has a presence-only rule, so the system checks that a file is there. It can’t check a signature.'), checks, dec, ver]);
  return docReviewScreen('Transport specialist · Document review · Reject', 'Silver Bell · Proof of ownership', 'Silver Bell · Proof of ownership', 'REQ-2026-0162 · Saigon Turf Club · departs 18 Oct 2026', 'Due today', '24 Sep', 'status/warn/fg', left, right, null, 'Thu 24 Sep 2026');
}
async function eDocReview() { return staffScreensCall([scrDocReview, scrDocReject]); }
/* =====================================================================
   Authorities tab (Flow 2, staff). One dossier card per authority on the
   route: state in words, what it holds, its reference and the expected
   response stated twice. A card can be filed only once its own documents
   are cleared; a late response is highlighted and says what it puts at
   risk. Quarantine is recorded against the destination's minimum.
   ===================================================================== */
/* CBRT-2026-041: customs was filed on 26 Sep; clearance completes on 14 Oct, when the certificates are back */
var CLEARANCE_041 = '14 Oct';
/* the Dept. of Animal Health dossier holds each horse's customer documents; the count derives from the checklist */
function dahDocs() {
  var n = 0;
  ALL_DOCS.forEach(function (g) { if (g[0] !== 'Shipment') g[2].forEach(function (d) { if (d[0] !== 'Export health certificate') n++; }); });
  return n + ' customer documents: passports, vaccinations, EIA tests and ownership';
}
/* d: { name, what, tone, word, due, date, dueTone, facts: [[label, value, mono]], body: [nodes], bad } */
function dossierCard(d) {
  var c = panel('Dossier · ' + d.name, { gap: 0, pad: 0, clip: true, stroke: d.bad ? 'status/bad/border' : null });
  if (d.bad) c.strokeWeight = 1.5;
  var head = H({ name: 'Head', gap: 16, pad: [18, 24, 18, 24], cross: 'CENTER' });
  var t = VV({ name: 'Authority', gap: 2 });
  addAll(t, [Tx(d.name, 'Heading/H4'), Tx(d.what, 'Body/S', 'text/tertiary', { fill: true })]);
  var st = H({ name: 'Status col', w: 190, main: 'MAX' });
  add(st, chip(d.tone, d.word, { noDot: d.tone === 'Neutral' }));
  var due = VV({ name: 'Due', gap: 2, w: 150, cross: 'MAX' });
  addAll(due, [Tx(d.due, 'Label/S', d.dueTone || 'text/primary', { align: 'RIGHT' }), Tx(d.date, 'Mono/Caption', 'text/tertiary', { align: 'RIGHT' })]);
  addAll(head, [fillW(t), st, due]);
  add(c, fillW(head));
  if (d.facts) {
    var f = H({ name: 'Facts', gap: 40, pad: [14, 24, 14, 24], fill: 'bg/sunken' });
    borderSide(f, 'border/default', 'top');
    d.facts.forEach(function (x) {
      var cell = VV({ name: x[0], gap: 3 });
      addAll(cell, [Tx(x[0], 'Body/S', 'text/tertiary'), Tx(x[1], x[2] ? 'Mono/Data' : 'Label/S', 'text/primary')]);
      add(f, x[3] ? fillW(cell) : cell);
    });
    add(c, fillW(f));
  }
  if (d.body && d.body.length) {
    var b = VV({ name: 'Body', gap: 16, pad: [18, 24, 20, 24] });
    borderSide(b, 'border/default', 'top');
    d.body.forEach(function (n) { add(b, fillW(n)); });
    add(c, fillW(b));
  }
  return c;
}
/* rows: [when, text, who] */
function logList(title, rows) {
  var v = VV({ name: title, gap: 0 });
  add(v, VV({ name: 'Title', pad: [0, 0, 8, 0] }, [Tx(title, 'Label/S', 'text/secondary')]));
  rows.forEach(function (r) {
    var row = H({ name: r[1], gap: 16, pad: [8, 0, 8, 0], cross: 'MIN' });
    borderSide(row, 'border/default', 'top');
    addAll(row, [Tx(r[0], 'Mono/Caption', 'text/tertiary', { w: 150 }), Tx(r[1], 'Body/S', r[3] || 'text/primary', { fill: true }), Tx(r[2], 'Body/S', 'text/tertiary', { w: 200, align: 'RIGHT' })]);
    add(v, fillW(row));
  });
  return v;
}
function checkRow(text, sub, prose) {
  var r = H({ name: text, gap: 12, cross: 'MIN' });
  var cb = inst(C.checkbox, { Checked: 'True' });
  setP(cb, { 'Show label': false });
  var t = VV({ name: 'Text', gap: 2 });
  addAll(t, [Tx(text, 'Body/S', 'text/primary', { fill: true }), Tx(sub, prose ? 'Body/S' : 'Mono/Caption', prose ? 'text/secondary' : 'text/tertiary', { fill: true })]);
  addAll(r, [VV({ name: 'Box col', pad: [1, 0, 0, 0] }, [cb]), fillW(t)]);
  return r;
}
function submissionForm() {
  var e = VV({ name: 'Record submission', gap: 16, pad: [18, 20, 18, 20], radius: 8, fill: 'surface/raised', stroke: 'border/strong' });
  add(e, Tx('Record the submission', 'Label/M'));
  [[['Select', 'Default', 'Authority', 'Mộc Bài border customs (VN)', 'From the regulation catalog for this crossing.'], ['Date', 'Default', 'Submitted on', '26 Sep 2026', null]],
   [['Text', 'Focus', 'Reference', 'HQ-MB-2026-18842', 'As issued by the authority’s portal or receipt.'], ['Date', 'Default', 'Expected response', '30 Sep 2026', '3 business days, from the catalog. Change it if the office quoted another date.']]].forEach(function (pair, i) {
    var row = H({ name: 'Fields ' + (i + 1), gap: 16, cross: 'MIN' });
    pair.forEach(function (f) { add(row, fillW(input(f[0], f[1], f[2], f[3], f[4]))); });
    add(e, fillW(row));
  });
  var docs = VV({ name: 'Documents included', gap: 10 });
  addAll(docs, [Tx('Documents included', 'Label/S', 'text/secondary'),
    fillW(checkRow('Customs value declaration · Mộc Bài – Bavet', 'v1 · cleared 20 Sep 2026')),
    fillW(checkRow('Equine passports · Shadowfax, Nightfall, Copper King, Silver Bell', '4 × v1 · cleared 2–4 Sep 2026'))]);
  add(e, fillW(docs));
  var acts = H({ name: 'Actions', gap: 12, cross: 'CENTER' });
  addAll(acts, [btn('Primary', 'MD', 'Record submission'), btn('Ghost', 'MD', 'Cancel'), Tx('The card then reads “With the authority” and the expected date is tracked.', 'Body/S', 'text/tertiary', { fill: true })]);
  add(e, fillW(acts));
  return e;
}
/* rows: [label, value, mono] */
function quarantinePanel(tone, word, rows, extra) {
  var p = panel('Pre-export quarantine', { gap: 14 });
  var h = H({ name: 'Head', gap: 16, main: 'SPACE_BETWEEN', cross: 'CENTER' });
  var t = VV({ name: 'Text', gap: 2 });
  addAll(t, [Tx('Pre-export quarantine', 'Heading/H4'), Tx('Củ Chi pre-export quarantine station · inspected by the station veterinarian', 'Body/S', 'text/tertiary')]);
  addAll(h, [t, chip(tone, word)]);
  add(p, fillW(h));
  var grid = H({ name: 'Facts', gap: 40 });
  rows.forEach(function (x) {
    var cell = VV({ name: x[0], gap: 3 });
    addAll(cell, [Tx(x[0], 'Body/S', 'text/tertiary'), Tx(x[1], x[2] ? 'Mono/Data' : 'Label/S', 'text/primary')]);
    add(grid, cell);
  });
  add(p, fillW(grid));
  (extra || []).forEach(function (n) { add(p, fillW(n)); });
  add(p, Tx('Cambodia requires at least 7 days. A shorter period can’t be saved.', 'Body/S', 'text/tertiary', { fill: true }));
  return p;
}

/* ---------- Sat 26 Sep: one filed, one ready to file, one waiting ---------- */
function scrAuthorities() {
  var customs = dossierCard({ name: 'Mộc Bài border customs (VN)', what: 'Export declaration and Cambodia entry at Mộc Bài – Bavet', tone: 'Ok', word: 'Ready to file', due: 'File by', date: '14 Oct',
    body: [submissionForm()] });
  var gdahp = dossierCard({ name: 'Cambodia GDAHP', what: 'General Directorate of Animal Health and Production · import permit', tone: 'Info', word: 'With the authority', due: 'In 15 days', date: '11 Oct',
    facts: [['Reference', 'KH-IP-2026-3381', true], ['Filed', '15 Sep 2026', true], ['Expected response', '11 Oct, as quoted at filing'], ['Contains', 'Import application · 4 equine passports', false, true]] });
  var waiting = logList('Waiting on', [
    ['Customer · overdue', 'Silver Bell · proof of ownership: a signed bill of sale, was due 25 Sep.', 'Saigon Turf Club', 'status/bad/fg'],
    ['Customer · 30 Sep', 'Transit insurance extended to 20 Oct.', 'Saigon Turf Club'],
    ['Customer · 4 Oct', 'Nightfall · EIA (Coggins) test sampled 19 Aug or later.', 'Saigon Turf Club'],
    ['Customer · 11 Oct', 'Silver Bell · influenza booster record.', 'Saigon Turf Club'],
    ['10 Oct', 'Pre-export quarantine starts; the certificates are issued inside it.', 'Củ Chi station']]);
  var dah = dossierCard({ name: 'Vietnam Dept. of Animal Health', what: 'Export health certificates · 4 horses', tone: 'Neutral', word: 'Not ready', due: 'Planned filing', date: '8 Oct',
    facts: [['Certificates expected', '8–14 Oct 2026'], ['Rule', 'Issued within 10 days of departure'], ['Contains', dahDocs(), false, true]], body: [waiting] });
  var q = quarantinePanel('Ok', 'Meets the minimum', [['Booked', '10–17 Oct 2026', true], ['Length', '7 days', true], ['Cambodia’s minimum', '7 days', true], ['Inspection', 'Recorded 17 Oct by the station vet']]);
  var hist = historyPanel([
    ['26 Sep · 09:02', 'Customs dossier ready: the customs value declaration and 4 passports are cleared.', 'System'],
    ['18 Sep · 14:30', 'Quarantine booked at Củ Chi, 10–17 Oct (7 days; Cambodia requires 7).', 'Lan, transport specialist'],
    ['15 Sep · 10:40', 'Import permit application filed with GDAHP, ref KH-IP-2026-3381.', 'Lan, transport specialist']], 'Show all 9 events');
  var hint = Tx('Cards that need you come first: overdue, ready to file, with an authority, not ready, approved.', 'Body/S', 'text/tertiary', { w: 760 });
  return jobScreen('Transport specialist · Authorities', 'Authorities', STAFF.lan, [customs, gdahp, dah, q, hist, hint]);
}

/* ---------- Mon 12 Oct: the import permit is a day late ---------- */
function scrAuthoritiesOverdue() {
  var acts = H({ name: 'Actions', gap: 12, cross: 'CENTER' });
  addAll(acts, [btn('Primary', 'MD', 'Log a follow-up', { lead: 'pencil' }), btn('Secondary', 'MD', 'Record the decision')]);
  var gdahp = dossierCard({ bad: true, name: 'Cambodia GDAHP', what: 'General Directorate of Animal Health and Production · import permit', tone: 'Bad', word: 'Overdue', due: 'Overdue by 1 day', date: 'was due 11 Oct', dueTone: 'status/bad/fg',
    facts: [['Reference', 'KH-IP-2026-3381', true], ['Filed', '15 Sep 2026', true], ['Expected response', '11 Oct, as quoted at filing'], ['Contains', 'Import application · 4 equine passports', false, true]],
    body: [callout('Bad', 'The 18 Oct departure holds only if the permit is back by 16 Oct', 'Clearance is planned for ' + CLEARANCE_041 + ' and quarantine ends 17 Oct. After 16 Oct there isn’t time to add the permit to the entry dossier before the 06:00 pickup.'),
      logList('Follow-ups', [['12 Oct · 09:10', 'Phoned GDAHP Phnom Penh: the permit is in final signature, promised for 13 Oct.', 'Lan, transport specialist'], ['12 Oct · 00:05', 'Response overdue; Yến alerted.', 'System']]), acts] });
  var dah = dossierCard({ name: 'Vietnam Dept. of Animal Health', what: 'Export health certificates · 4 horses', tone: 'Info', word: 'With the authority', due: 'In 2 days', date: '14 Oct',
    facts: [['Reference', 'DAH-XK-2026-0917', true], ['Filed', '9 Oct 2026', true], ['Expected response', '14 Oct'], ['Contains', dahDocs(), false, true]] });
  var customs = dossierCard({ name: 'Mộc Bài border customs (VN)', what: 'Export declaration and Cambodia entry at Mộc Bài – Bavet', tone: 'Ok', word: 'Approved', due: 'Done', date: '30 Sep', dueTone: 'status/ok/fg',
    facts: [['Reference', 'HQ-MB-2026-18842', true], ['Filed', '26 Sep 2026', true], ['Clearance number', 'TK-2026-300915', true], ['Contains', 'Customs value declaration · 4 passports', false, true]] });
  var q = quarantinePanel('Info', 'In progress · day 3 of 7', [['Booked', '10–17 Oct 2026', true], ['Length', '7 days', true], ['Cambodia’s minimum', '7 days', true], ['Inspection', 'Due 17 Oct from the station vet']],
    [progress('Neutral', 40)]);
  var hist = historyPanel([
    ['12 Oct · 09:10', 'Follow-up with GDAHP logged: promised for 13 Oct.', 'Lan, transport specialist'],
    ['12 Oct · 00:05', 'GDAHP response overdue; Yến, logistics manager, alerted.', 'System'],
    ['10 Oct · 07:30', 'Quarantine started at Củ Chi with 4 horses.', 'Lan, transport specialist'],
    ['9 Oct · 15:20', 'Export health certificate dossier filed with the Dept. of Animal Health, ref DAH-XK-2026-0917.', 'Lan, transport specialist']], 'Show all 17 events');
  return jobScreen('Transport specialist · Authorities · Overdue', 'Authorities', STAFF.lan, [gdahp, dah, customs, q, hist],
    { today: 'Mon 12 Oct 2026', stage: 'Clearance', gate: '3 things must clear first: the Cambodia import permit (overdue), 4 export health certificates (with the Dept. of Animal Health, expected ' + CLEARANCE_041 + ') and quarantine (ends 17 Oct).' });
}
async function eAuthorities() { return insertChainCall([scrAuthorities, scrAuthoritiesOverdue], 'Transport specialist · Clearance checklist'); }
/* =====================================================================
   Trip: the escort's cab surface (Flow 4, on the road). Not the office
   job page with bigger buttons: a tablet in a sunlit cab, used with
   gloves between tasks. So: the Light theme (read in glare), one line of
   context at the top, the task first, 48 px toggles, times at 28 px, and
   the one gold action docked at the bottom edge. These records are the
   only source of the customer's route positions and arrival condition.
   ===================================================================== */
var TRIP_LOAD = [['Shadowfax', 'Stall 1 · standard'], ['Copper King', 'Stall 2 · box'], ['Nightfall', 'Stall 4 · climate'], ['Silver Bell', 'Stall 6 · standard']];
/* the canonical trip log for CBRT-2026-041 on 18 Oct: every other count derives from it */
var TRIP_LOG = [
  ['06:02', 'Loaded without incident. Copper King in the box stall, Nightfall in the climate stall.', 'Minh, driver'],
  ['06:05', 'Departed Phú Thọ training centre.', 'Minh, driver'],
  ['07:58', 'Arrived at Mộc Bài – Bavet; queue of 3 trailers.', 'Minh, driver'],
  ['08:34', 'Cleared Vietnam export and Cambodia entry at Mộc Bài – Bavet.', 'Minh, driver'],
  ['08:40', 'Condition checked after the border: all four settled and drinking.', 'Hoa, groom'],
  ['09:36', 'Arrived at the Svay Rieng welfare stop.', 'Minh, driver'],
  ['09:40', 'Condition logged: Nightfall on watch, the others sound.', 'Hoa, groom'],
  ['10:21', 'Left the Svay Rieng welfare stop.', 'Minh, driver'],
  ['12:41', 'Delivered at Phnom Penh Equestrian Centre.', 'Minh, driver'],
  ['12:48', 'Handed over to Sophea, receiving groom; arrival condition logged for 4 horses.', 'Hoa, groom']
];
function tripLogUntil(t) { return TRIP_LOG.filter(function (r) { return r[0] <= t; }); }
function tripLogSummary(t) { var l = tripLogUntil(t); return l.length + ' records, ' + l[0][0] + ' – ' + l[l.length - 1][0]; }
/* clock arithmetic for the demo times, so every delay and countdown derives from its fixture */
function toMin(t) { var p = t.split(':'); return +p[0] * 60 + +p[1]; }
function fromMin(m) { var h = Math.floor(m / 60), n = m % 60; return (h < 10 ? '0' : '') + h + ':' + (n < 10 ? '0' : '') + n; }
function durText(m) { var h = Math.floor(m / 60), n = m % 60; return h ? h + ' h' + (n ? ' ' + n + ' min' : '') : n + ' min'; }
/* CBRT-2026-040, 29 Sep: the escort's record of the hold is quoted verbatim wherever it appears */
var INC40 = { loaded: '05:30', held: '08:12', planned: '13:30', restEvery: 6,
  record: 'Mộc Bài is closed to vehicles over 10 t until 16:00 for a bridge inspection. We are parked in the Bavet exit lane. Mekong Star is settled.', by: 'Tùng, driver' };
function unloadBy() { return fromMin(toMin(INC40.loaded) + INC40.restEvery * 60); }
function onTrailer(now) { return durText(toMin(now) - toMin(INC40.loaded)); }
function arrivesLate(t) { return 'About ' + t + ' · ' + durText(toMin(t) - toMin(INC40.planned)) + ' late'; }
var ARRIVAL = [
  ['Shadowfax', 'Stall 1 · standard', 'Sound', null, null, 'Ate on arrival.'],
  ['Nightfall', 'Stall 4 · climate', 'Sound', null, null, 'Slight sweat at unloading, settled within 10 min.'],
  ['Copper King', 'Stall 2 · box', 'Sound', null, null, 'Walked off calmly.'],
  ['Silver Bell', 'Stall 6 · standard', 'Sound', null, null, 'Drinking well.']
];

function tallBtn(variant, label, o) { var b = btn(variant, 'MD', label, o); b.resize(b.width, 56); return fillW(b); }
/* one line of context: job, route, stage, the state that matters now, sync, time, who */
function cabBar(o) {
  var bar = H({ name: 'Cab bar', gap: 20, pad: [14, 32, 14, 32], cross: 'CENTER', fill: 'surface/card' });
  borderSide(bar, 'border/default', 'bottom');
  var job = H({ name: 'Job', gap: 12, cross: 'CENTER' });
  addAll(job, [Tx(o.code, 'Mono/Data', 'text/secondary'), Tx(o.route, 'Heading/H4'), stageChip('Trip'), chip(o.pillTone, o.pill)]);
  var sync = H({ name: 'Sync', gap: 8, cross: 'CENTER' });
  addAll(sync, [Ic(o.synced ? 'check' : 'clock', 18, o.synced ? 'status/ok/fg' : 'status/warn/fg'), Tx(o.sync, 'Label/S', o.synced ? 'text/secondary' : 'status/warn/fg')]);
  var who = H({ name: 'Who', gap: 10, cross: 'CENTER' });
  var av = H({ name: 'Avatar', w: 36, h: 36, radius: 999, fill: 'surface/muted', main: 'CENTER', cross: 'CENTER' });
  add(av, Tx(o.user[2], 'Label/S', 'text/secondary'));
  var wt = VV({ name: 'Text', gap: 0 });
  addAll(wt, [Tx(o.user[0], 'Label/S'), Tx(o.user[1], 'Body/S', 'text/tertiary')]);
  addAll(who, [av, wt]);
  addAll(bar, [fillW(job), sync, Tx(o.now, 'Mono/Data L', 'text/primary'), who]);
  return bar;
}
/* the route as big cells: stop, kind, and its time at 28 px */
function cabStrip(stops) {
  var row = H({ name: 'Route', gap: 12 });
  stops.forEach(function (s) {
    /* Current is info; Held is the current stop when the load is stopped, in the bad tone of the Held chip */
    var held = s[0] === 'Held', cur = s[0] === 'Current' || held, done = s[0] === 'Done', tn = held ? 'status/bad/' : 'status/info/';
    var c = VV({ name: s[1], gap: 4, pad: [14, 16, 14, 16], radius: 12, fill: cur ? tn + 'bg' : 'surface/card', stroke: cur ? tn + 'border' : 'border/default', sw: cur ? 1.5 : 1 });
    var h = H({ name: 'Head', gap: 8, cross: 'CENTER' });
    addAll(h, [dot(10, done ? 'status/ok/fg' : cur ? tn + 'fg' : 'border/strong', 'Point'), Tx(s[1], 'Label/M', 'text/primary')]);
    addAll(c, [h, Tx(s[2], 'Body/S', 'text/secondary'), Tx(s[3], 'Mono/Data L', done ? 'text/secondary' : 'text/primary'), Tx(s[4], 'Body/S', cur ? tn + 'fg' : 'text/tertiary')]);
    add(row, fillW(c));
  });
  return row;
}
var CAB_STOPS = [['Ho Chi Minh City', 'Pickup'], ['Mộc Bài – Bavet', 'Border'], ['Svay Rieng', 'Welfare stop'], ['Phnom Penh', 'Delivery']];
function stripAt(states, times, notes) { return cabStrip(CAB_STOPS.map(function (s, i) { return [states[i], s[0], s[1], times[i], notes[i]]; })); }
/* the dock: what will be saved, and the one gold action under the thumb */
function cabDock(summary, sub, action, secondary) {
  var d = H({ name: 'Dock', gap: 20, pad: [16, 32, 20, 32], cross: 'CENTER', fill: 'surface/card' });
  borderSide(d, 'border/strong', 'top');
  var t = VV({ name: 'Summary', gap: 2 });
  addAll(t, [Tx(summary, 'Label/M'), Tx(sub, 'Body/S', 'text/secondary', { fill: true })]);
  add(d, fillW(t));
  if (secondary) { var s = btn('Secondary', 'MD', secondary); s.resize(s.width, 64); add(d, s); }
  if (action) { var b = btn('Primary', 'MD', action, { lead: 'check' }); b.resize(440, 64); add(d, b); }
  return d;
}
function cabScreen(name, bar, strip, task, right, dock) {
  var s = VV({ name: name, w: SCREEN_W, fill: 'bg/canvas' });
  if (COLL.light) s.setExplicitVariableModeForCollection(COLL.color, COLL.light);
  var body = H({ name: 'Body', gap: 24 });
  right.resize(SIDE.narrow, right.height); right.layoutSizingHorizontal = 'FIXED';
  addAll(body, [fillW(task), right]);
  var main = VV({ name: 'Main', gap: 20, pad: [20, 32, 28, 32] });
  addAll(main, [fillW(strip), fillW(body)]);
  addAll(s, [fillW(bar), fillW(main), fillW(dock)]);
  return s;
}
/* a 48 px toggle. Ticked is a strong neutral box, the same as the Checkbox everywhere:
   green is kept for facts that are done, gold for the one action */
var CODES = /^[A-Z]{2,}-[A-Z0-9-]+( · [A-Z]{2,}-[A-Z0-9-]+)*$/;
function toggle48(label, on, sub) {
  var t = H({ name: 'Toggle · ' + label, gap: 12, pad: [0, 16, 0, 12], h: 48, radius: 8, cross: 'CENTER', fill: 'bg/input', stroke: 'border/strong' });
  var box = H({ name: 'Box', w: 24, h: 24, radius: 6, main: 'CENTER', cross: 'CENTER', fill: on ? 'text/primary' : null, stroke: on ? null : 'border/strong', sw: 1.5 });
  if (on) add(box, Ic('check', 16, 'bg/canvas'));
  addAll(t, [box, Tx(label, 'Label/M', 'text/primary')]);
  if (sub) add(t, fillW(Tx(sub, CODES.test(sub) ? 'Mono/Caption' : 'Body/S', 'text/secondary', { align: 'RIGHT' })));
  return t;
}
function nextStop(title, sub, due, date) {
  var p = panel('Next stop', { gap: 6 });
  addAll(p, [Tx(title, 'Heading/H3'), Tx(sub, 'Body/S', 'text/secondary', { fill: true })]);
  var d = H({ name: 'Due', gap: 12, cross: 'MAX' });
  addAll(d, [Tx(date, 'Mono/Data L', 'text/primary'), Tx(due, 'Label/M', 'status/info/fg')]);
  add(p, d);
  return p;
}
function loadPanel() {
  var p = panel('On board', { gap: 0, pad: [20, 24, 12, 24] });
  add(p, VV({ name: 'Title', pad: [0, 0, 10, 0] }, [Tx('On board', 'Heading/H4')]));
  TRIP_LOAD.forEach(function (h) {
    var r = H({ name: h[0], gap: 12, pad: [10, 0, 10, 0], cross: 'CENTER', main: 'SPACE_BETWEEN' });
    borderSide(r, 'border/default', 'top');
    addAll(r, [Tx(h[0], 'Label/M'), Tx(h[1], 'Body/S', 'text/secondary')]);
    add(p, fillW(r));
  });
  var crew = H({ name: 'Crew', gap: 12, pad: [10, 0, 10, 0], cross: 'CENTER', main: 'SPACE_BETWEEN' });
  borderSide(crew, 'border/default', 'top');
  addAll(crew, [Tx('Crew', 'Label/M'), Tx('Minh, driver · Hoa and Tuấn, grooms', 'Body/S', 'text/secondary')]);
  add(p, fillW(crew));
  return p;
}
function customerSees(text) {
  var p = panel('What the customer sees', { gap: 6 });
  addAll(p, [Tx('What the customer sees', 'Heading/H4'), Tx(text, 'Body/S', 'text/secondary', { fill: true })]);
  return p;
}
/* Sound / Watch / Concern at touch size; the chosen one takes its status tone */
function conditionControl(pick) {
  var tones = { Sound: 'Ok', Watch: 'Warn', Concern: 'Bad' };
  var s = H({ name: 'Condition', gap: 0, radius: 8, stroke: 'border/strong', clip: true });
  ['Sound', 'Watch', 'Concern'].forEach(function (w, i) {
    var on = w === pick, tn = TONE[tones[w]];
    var c = H({ name: w, w: 112, h: 52, main: 'CENTER', cross: 'CENTER', fill: on ? tn.bg : null });
    if (on) { c.strokes = [P(tn.border)]; c.strokeWeight = 1.5; c.strokeAlign = 'INSIDE'; }
    else if (i) { c.strokes = [P('border/strong')]; c.strokeAlign = 'INSIDE'; c.strokeTopWeight = 0; c.strokeBottomWeight = 0; c.strokeRightWeight = 0; c.strokeLeftWeight = 1; }
    add(c, Tx(w, 'Label/M', on ? tn.fg : 'text/secondary'));
    add(s, c);
  });
  return s;
}
function tick(label, on) {
  var cb = inst(C.checkbox, { Checked: on ? 'True' : 'False' });
  setP(cb, { Label: label });
  cb.name = 'Tick · ' + label;
  return cb;
}
function lineField(value, empty) {
  var f = H({ name: 'Note', pad: [14, 14, 14, 14], cross: 'CENTER', radius: 8, fill: 'bg/input', stroke: 'border/strong' });
  add(f, Tx(value, 'Body/M', empty ? 'text/tertiary' : 'text/primary', { fill: true }));
  return f;
}
/* one horse at a stop: name and stall, the condition word, 48 px toggles and a note */
function conditionRow(c) {
  var r = VV({ name: c[0], gap: 12, pad: [16, 24, 16, 24], fill: c[2] !== 'Sound' ? 'surface/raised' : null });
  borderSide(r, 'border/default', 'top');
  var top = H({ name: 'Top', gap: 20, cross: 'CENTER' });
  var n = VV({ name: 'Horse', gap: 2 });
  addAll(n, [Tx(c[0], 'Heading/H4'), Tx(c[1], 'Body/S', 'text/secondary')]);
  addAll(top, [fillW(n), conditionControl(c[2])]);
  var bottom = H({ name: 'Bottom', gap: 12, cross: 'CENTER' });
  if (c[3] != null) addAll(bottom, [toggle48('Drinking', c[3]), toggle48('Eating', c[4])]);
  add(bottom, fillW(lineField(c[5] || 'Add a note (optional)', !c[5])));
  addAll(r, [fillW(top), fillW(bottom)]);
  return r;
}
function taskHead(title, sub) {
  var h = VV({ name: 'Head', gap: 6, pad: [22, 24, 18, 24] });
  addAll(h, [Tx(title, 'Display/M'), Tx(sub, 'Body/M', 'text/secondary', { fill: true })]);
  return h;
}
function bar041(o) { o.code = 'CBRT-2026-041'; o.route = 'Ho Chi Minh City → Phnom Penh'; return cabBar(o); }

/* ---------- 08:34 at Mộc Bài – Bavet: record the crossing ---------- */
function scrTripCheckpoint() {
  var task = panel('Record this checkpoint', { gap: 0, pad: 0, clip: true });
  add(task, fillW(taskHead('Mộc Bài – Bavet', 'Border crossing: Vietnam exit and Cambodia entry. Arrived 07:58.')));
  var body = VV({ name: 'Fields', gap: 20, pad: [4, 24, 24, 24] });
  var out = VV({ name: 'Outcome', gap: 10 });
  addAll(out, [Tx('Outcome', 'Label/M', 'text/secondary'), fillW(svcOptions([
    ['Selected', 'Cleared', 'Both border posts stamped the papers and the trip goes on.', 'The customer sees “Cleared 08:34”', 'check'],
    ['Default', 'Held', 'The load is stopped at the border and can’t go on yet.', 'Alerts Yến, logistics manager, when you save', 'alert']], true))]);
  var docs = VV({ name: 'Documents shown', gap: 8 });
  addAll(docs, [Tx('Documents shown at the border', 'Label/M', 'text/secondary'),
    fillW(toggle48('Cambodia import permit', true, 'KH-IP-2026-3381')),
    fillW(toggle48('Export health certificates · 4 horses', true, 'DAH-XK-2026-0917')),
    fillW(toggle48('Customs clearance', true, 'TK-2026-300915'))]);
  var note = VV({ name: 'Note block', gap: 8 });
  addAll(note, [Tx('Note (optional)', 'Label/M', 'text/secondary'), fillW(lineField('Stamped at the Bavet desk; the load was not opened.'))]);
  addAll(body, [fillW(out), fillW(docs), fillW(note)]);
  add(task, fillW(body));
  var right = column([nextStop('Svay Rieng welfare stop', 'Water, rest and a condition check · 45 min.', 'in 56 min', '09:30'), loadPanel(),
    customerSees('The last checkpoint you recorded, with its time. Between checkpoints they see that one, never an estimate.')]);
  return cabScreen('Escort · Checkpoint', bar041({ pill: 'Clear to depart', pillTone: 'Ok', synced: true, sync: 'All records sent', now: '08:34', user: STAFF.minh }),
    stripAt(['Done', 'Current', 'Upcoming', 'Upcoming'], ['06:05', '07:58', '09:30', '12:30'], ['Departed', 'Arrived · recording now', 'Planned', 'Planned']),
    task, right, cabDock('Cleared at 08:34 · 3 documents shown', 'Saved on this tablet first and sent as soon as there is signal. You can amend it for 15 minutes.', 'Record: cleared at 08:34', 'Change time'));
}

/* ---------- 09:40 at Svay Rieng: each horse's condition ---------- */
var TRIP_CONDITION = [
  ['Shadowfax', 'Stall 1 · standard', 'Sound', true, true, 'Calm; ate hay straight away.'],
  ['Nightfall', 'Stall 4 · climate', 'Watch', true, false, 'Light sweat on the neck again; drank about 8 L; settled within 10 minutes.'],
  ['Copper King', 'Stall 2 · box', 'Sound', true, true, ''],
  ['Silver Bell', 'Stall 6 · standard', 'Sound', true, true, '']
];
function scrTripWelfare() {
  var task = panel('Condition of each horse', { gap: 0, pad: 0, clip: true });
  add(task, fillW(taskHead('Condition of each horse', 'Check each horse in its stall before you leave. Concern on any horse opens an incident and alerts Yến.')));
  var quick = H({ name: 'Shortcut', gap: 16, pad: [0, 24, 18, 24], cross: 'CENTER' });
  var q = btn('Secondary', 'MD', 'All sound · drinking · eating', { lead: 'check' }); q.resize(q.width, 52);
  addAll(quick, [q, Tx('Applied at 09:38. Then change only the horse that differs: Nightfall.', 'Body/S', 'text/secondary', { fill: true })]);
  add(task, fillW(quick));
  TRIP_CONDITION.forEach(function (c) { add(task, fillW(conditionRow(c))); });
  var prev = panel('Previous log', { gap: 6 });
  addAll(prev, [Tx('Last check · 08:40 at the border', 'Heading/H4'), Tx('All four horses settled and drinking after the border check. Nightfall sweated during loading and is calm now.', 'Body/S', 'text/secondary', { fill: true }), Tx('Hoa, groom', 'Body/S', 'text/tertiary')]);
  var right = column([nextStop('Phnom Penh Equestrian Centre', 'Delivery and handover to Sophea, receiving groom.', 'in 2 h 50 min', '12:30'), prev,
    customerSees('Each horse’s word and your note, under “Latest condition log”. They read the word you chose.')]);
  return cabScreen('Escort · Welfare stop', bar041({ pill: 'Clear to depart', pillTone: 'Ok', synced: true, sync: 'All records sent', now: '09:40', user: STAFF.hoa }),
    stripAt(['Done', 'Done', 'Current', 'Upcoming'], ['06:05', '08:34', '09:36', '12:30'], ['Departed', 'Cleared', 'Arrived · 6 min late', 'Planned']),
    task, right, cabDock('Leave in 41 min · by 10:21', '1 horse on watch, 3 sound. Saved on this tablet first; amend within 15 minutes.', 'Save condition log'));
}

/* ---------- 12:48 at Phnom Penh: hand over the horses ---------- */
function signatureBox(name, when) {
  var b = VV({ name: 'Signature', gap: 8, pad: [12, 16, 12, 16], radius: 8, fill: 'bg/input', stroke: 'border/strong' });
  var line = H({ name: 'Line', h: 64, cross: 'MAX' });
  var sig = Tx(name, 'Display/M', 'text/primary', { noStyle: true });
  if (FONT['display/Italic']) sig.fontName = FONT['display/Italic'];
  add(line, sig);
  var foot = H({ name: 'Foot', main: 'SPACE_BETWEEN', cross: 'CENTER' });
  var clr = btn('Secondary', 'MD', 'Clear signature'); clr.resize(clr.width, 48);
  addAll(foot, [Tx(when, 'Body/S', 'text/secondary'), clr]);
  addAll(b, [fillW(line), divider(), fillW(foot)]);
  return b;
}
function scrTripDelivery() {
  var task = panel('Hand over the horses', { gap: 0, pad: 0, clip: true });
  add(task, fillW(taskHead('Hand over the horses', 'Record each horse as it comes off the trailer, then have the receiving groom sign. Arrived 12:41 at Phnom Penh Equestrian Centre.')));
  ARRIVAL.forEach(function (c) { add(task, fillW(conditionRow(c))); });
  var hand = VV({ name: 'Handed over', gap: 8, pad: [18, 24, 18, 24] });
  borderSide(hand, 'border/default', 'top');
  addAll(hand, [Tx('Handed over', 'Label/M', 'text/secondary'),
    fillW(toggle48('4 horses', true, 'Shadowfax · Nightfall · Copper King · Silver Bell')),
    fillW(toggle48('4 equine passports', true)),
    fillW(toggle48('Import permit and 4 health certificates', true, 'KH-IP-2026-3381 · DAH-XK-2026-0917')),
    fillW(toggle48('Trip log', true, tripLogSummary('12:41') + '. This handover is record ' + TRIP_LOG.length + '.'))]);
  add(task, fillW(hand));
  var rec = VV({ name: 'Received by', gap: 12, pad: [18, 24, 24, 24] });
  borderSide(rec, 'border/default', 'top');
  var who = H({ name: 'Who', gap: 16, cross: 'MIN' });
  addAll(who, [fillW(input('Select', 'Default', 'Received by', 'Sophea · receiving groom', 'Named by the centre on the delivery order.')), fillW(signatureBox('Sophea', 'Signed on this tablet · 12:47'))]);
  add(rec, fillW(who));
  add(task, fillW(rec));
  var next = panel('What happens next', { gap: 8 });
  var d = H({ name: 'Due', gap: 12, cross: 'MAX' });
  addAll(d, [Tx('20 Oct', 'Mono/Data L', 'text/primary'), Tx('in 2 days', 'Label/M', 'status/info/fg')]);
  addAll(next, [Tx('The customer confirms', 'Heading/H4'), Tx('Saigon Turf Club confirms the handover and each horse’s condition, or reports a problem.', 'Body/S', 'text/secondary', { fill: true }), d,
    Tx('If they don’t reply by 20 Oct, the handover is taken as accepted on this record and Yến is told.', 'Body/S', 'text/secondary', { fill: true })]);
  var right = column([next, customerSees('Your condition words and notes under “Arrival condition”, with Sophea’s name and the time she signed.')]);
  return cabScreen('Escort · Delivery', bar041({ pill: 'Arrived 12:41', pillTone: 'Ok', synced: false, sync: '1 record waiting to send', now: '12:48', user: STAFF.hoa }),
    stripAt(['Done', 'Done', 'Done', 'Current'], ['06:05', '08:34', '09:36', '12:41'], ['Departed', 'Cleared', '45 min stop', 'Arrived · 11 min late']),
    task, right, cabDock('4 horses sound · signed by Sophea', 'Saved on this tablet first and sent as soon as there is signal.', 'Record handover at 12:48'));
}

/* ---------- CBRT-2026-040, 29 Sep 08:55: held, and what the escort does while waiting ---------- */
function scrTripHeld() {
  var task = panel('Held', { gap: 0, pad: 0, clip: true });
  add(task, fillW(taskHead('Held at Bavet – Mộc Bài', 'Mộc Bài is closed to heavy vehicles until 16:00. You recorded the hold at ' + INC40.held + '.')));
  var body = VV({ name: 'Fields', gap: 18, pad: [4, 24, 24, 24] });
  add(body, callout('Info', 'Yến was alerted at ' + INC40.held + ' and is deciding', 'She’ll choose between waiting, re-routing via Xa Mát or returning, and call you. Stay in the exit lane. Unload only if Mekong Star needs it.'));
  var clock = H({ name: 'Clock', gap: 24, pad: [16, 20, 16, 20], radius: 12, fill: 'status/warn/bg', stroke: 'status/warn/border', cross: 'CENTER' });
  var ct = VV({ name: 'Text', gap: 2 });
  addAll(ct, [Tx('On the trailer since ' + INC40.loaded, 'Label/M'), Tx('Unload to rest by ' + unloadBy() + ': at least every ' + INC40.restEvery + ' hours.', 'Body/S', 'text/secondary', { fill: true })]);
  addAll(clock, [Tx(onTrailer('08:55'), 'Mono/Data L', 'status/warn/fg'), fillW(ct)]);
  add(body, fillW(clock));
  var acts = H({ name: 'While you wait', gap: 12 });
  var a1 = btn('Secondary', 'MD', 'Log water or a check', { lead: 'plus' }); a1.resize(a1.width, 56);
  var a2 = btn('Secondary', 'MD', 'Call Yến', { lead: 'phone' }); a2.resize(a2.width, 56);
  addAll(acts, [a1, a2]);
  add(body, acts);
  add(task, fillW(body));
  var rec = panel('What you recorded', { gap: 6 });
  addAll(rec, [Tx('What you recorded', 'Heading/H4'), Tx('“' + INC40.record + '”', 'Body/S', 'text/primary', { fill: true }), stamp(INC40.held, INC40.by + ' · sent')]);
  var right = column([rec, customerSees('“Held at Bavet – Mộc Bài since ' + INC40.held + '”, and Yến’s message once she decides. Never a guessed arrival time.')]);
  return cabScreen('Escort · Held', cabBar({ code: 'CBRT-2026-040', route: 'Phnom Penh → Ho Chi Minh City', pill: 'Held at the border', pillTone: 'Bad', synced: true, sync: 'All records sent', now: '08:55', user: ['Nguyễn Văn Tùng', 'Driver', 'NT'] }),
    cabStrip([['Done', 'Phnom Penh', 'Pickup', INC40.loaded, 'Departed'], ['Held', 'Bavet – Mộc Bài', 'Border', INC40.held, 'Held since'], ['Upcoming', 'Tây Ninh', 'Welfare stop', '—', 'Waits on the decision'], ['Upcoming', 'Ho Chi Minh City', 'Delivery', '—', 'Waits on the decision']]),
    task, right, cabDock('Waiting for Yến’s decision', 'Nothing to record until she decides; any water or checks you log go on the trip record.', null));
}
async function eTripA() { return insertChainCall([scrTripCheckpoint, scrTripWelfare], 'Fleet & route coordinator · Route plan'); }
async function eTripB() { return insertChainCall([scrTripDelivery, scrTripHeld], 'Escort · Welfare stop'); }
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
  addAll(t, [Tx('Closed. Nothing more is needed.', 'Heading/H3'), Tx('You confirmed the handover on 19 Oct at 09:14. This page stays as the record of the move.', 'Body/M', 'text/secondary', { fill: true })]);
  addAll(p, [ic, fillW(t), btn('Secondary', 'MD', 'Download the record (PDF)', { lead: 'file' })]);
  return p;
}
function scrTrackClosed() {
  var sum = panel('Summary', { gap: 0, pad: 0, clip: true });
  var f = H({ name: 'Facts', gap: 48, pad: [18, 24, 18, 24] });
  [['Delivered', '18 Oct · 12:41', true], ['Against plan', '11 min late'], ['Distance', '240 km', true], ['Border', 'Cleared, no hold'], ['Incidents', 'None'], ['Documents', '23 kept', true]].forEach(function (x) {
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
  return trackScreen('Tracking · Closed', trackHead('Ho Chi Minh City → Phnom Penh', ['REQ-2026-0162', 'job CBRT-2026-041 · 4 horses · delivered 18 Oct 2026, 12:41'], [stageChip('Handover'), chip('Ok', 'Closed')], true),
    [closedLead(), sum, split(column([arr, docs, stagesP]), route, SIDE.wide), hist], '19 Oct 2026, 09:20');
}
async function eHandover() { return insertChainCall([scrTrackClosed], 'Tracking · Delivered'); }
/* =====================================================================
   Incidents (Flow 5). Every incident has one owner, Yến. The page puts
   the facts, the options with their cost (time, documents, the horse)
   and a recorded decision in one place, and tells the people affected.
   Nothing on these pages judges fault.
   ===================================================================== */
function incidentScreen(name, head, left, right, today, crumbs) {
  var body = H({ name: 'Body', gap: 24 });
  right.resize(SIDE.narrow, right.height); right.layoutSizingHorizontal = 'FIXED';
  addAll(body, [fillW(left), right]);
  return adminScreen(name, 'Incidents', crumbs, STAFF.yen, [head, body], today);
}
function dueStack(a, b, tone) {
  var d = VV({ name: 'Due', gap: 2, cross: 'MAX' });
  addAll(d, [Tx(a, 'Label/S', tone || 'text/primary', { align: 'RIGHT' }), Tx(b, 'Mono/Caption', 'text/tertiary', { align: 'RIGHT' })]);
  return d;
}
/* when and who: the time is data (Mono), the person is a name (Outfit) */
function stamp(time, who) {
  var r = H({ name: 'Stamp', gap: 8, cross: 'CENTER' });
  addAll(r, [Tx(time, 'Mono/Caption', 'text/tertiary'), Tx(who, 'Body/S', 'text/tertiary')]);
  return r;
}
/* rows: [time, text, who] for the narrow right column */
function miniTimeline(rows) {
  var p = panel('Timeline', { gap: 0, pad: [20, 24, 12, 24] });
  add(p, VV({ name: 'Title', pad: [0, 0, 10, 0] }, [Tx('Timeline', 'Heading/H4')]));
  rows.forEach(function (r) {
    var row = VV({ name: r[1], gap: 2, pad: [9, 0, 9, 0] });
    borderSide(row, 'border/default', 'top');
    var top = H({ name: 'Head', gap: 8, cross: 'CENTER' });
    addAll(top, [Tx(r[0], 'Mono/Caption', 'text/tertiary'), Tx(r[2], 'Body/S', 'text/tertiary')]);
    addAll(row, [top, Tx(r[1], 'Body/S', 'text/primary', { fill: true })]);
    add(p, fillW(row));
  });
  return p;
}
/* a fact that is true (done) or that will happen (pending); never a control */
function factLine(text, sub, done) {
  var r = H({ name: text, gap: 12, cross: 'MIN' });
  var ic = H({ name: 'Mark', w: 24, h: 24, radius: 999, fill: done ? 'status/ok/bg' : 'surface/muted', main: 'CENTER', cross: 'CENTER' });
  add(ic, Ic(done ? 'check' : 'arrow-right', 14, done ? 'status/ok/fg' : 'text/secondary'));
  var t = VV({ name: 'Text', gap: 2 });
  add(t, Tx(text, 'Body/S', 'text/primary', { fill: true }));
  if (sub) add(t, Tx(sub, 'Body/S', 'text/secondary', { fill: true }));
  addAll(r, [ic, fillW(t)]);
  return r;
}
function radioMark(sel) {
  var r = H({ name: 'Radio', w: 20, h: 20, radius: 999, main: 'CENTER', cross: 'CENTER', fill: 'bg/input', stroke: sel ? 'text/primary' : 'border/strong', sw: sel ? 1.5 : 1 });
  if (sel) add(r, dot(10, 'text/primary', 'Dot'));
  return r;
}
/* the canonical times for the CBRT-2026-036 report: the reply is due 2 hours after it arrives */
var INC36 = { reported: '17:30', opened: '17:31', notified: '18:02', vet: '18:04', due: '19:30', now: '18:05', left: '1 h 25 min', draft: '17:26' };
/* an option with its consequences side by side: facts [label, value, tone] */
function optionRow(sel, title, desc, facts) {
  var r = VV({ name: 'Option · ' + title, gap: 12, pad: [16, 20, 16, 20], radius: 12, fill: sel ? 'surface/raised' : 'surface/card', stroke: sel ? 'text/secondary' : 'border/default', sw: sel ? 1.5 : 1 });
  var h = H({ name: 'Head', gap: 12, cross: 'MIN' });
  var t = VV({ name: 'Text', gap: 2 });
  addAll(t, [Tx(title, 'Heading/H4'), Tx(desc, 'Body/S', 'text/secondary', { fill: true })]);
  addAll(h, [VV({ name: 'Box col', pad: [3, 0, 0, 0] }, [radioMark(sel)]), fillW(t)]);
  var f = H({ name: 'Facts', gap: 24, pad: [0, 0, 0, 30] });
  facts.forEach(function (x) {
    var c = VV({ name: x[0], gap: 2 });
    addAll(c, [Tx(x[0], 'Body/S', 'text/tertiary'), Tx(x[1], 'Label/S', x[2] || 'text/primary', { fill: true })]);
    add(f, fillW(c));
  });
  addAll(r, [fillW(h), fillW(f)]);
  return r;
}

/* ---------- CBRT-2026-040, Tue 29 Sep 09:10: held at the border ---------- */
var NOW40 = '09:10';
function scrIncidentHeld() {
  var head = builderHead('Held at Bavet – Mộc Bài', 'CBRT-2026-040', 'Phnom Penh → Ho Chi Minh City · Mekong Star · shared load · departed 05:30', 'Incidents',
    [stageChip('Trip'), chip('Bad', 'Held'), dueStack('Held for ' + durText(toMin(NOW40) - toMin(INC40.held)), 'since ' + INC40.held, 'status/bad/fg')]);
  head.findOne(function (n) { return n.name === 'Status'; }).itemSpacing = 12;
  var rec = panel('What the escort recorded', { gap: 12 });
  var rh = H({ name: 'Head', gap: 12, main: 'SPACE_BETWEEN', cross: 'CENTER' });
  addAll(rh, [Tx('What the escort recorded', 'Heading/H4'), stamp(INC40.held, INC40.by)]);
  addAll(rec, [fillW(rh), Tx('“' + INC40.record + '”', 'Body/M', 'text/primary', { fill: true }),
    dlRow('Checkpoint', 'Bavet (Cambodia exit) → Mộc Bài (Vietnam entry)', { valueStyle: 'Label/S' }), dlRow('Horse', 'Mekong Star · Sound, on the trailer', { valueStyle: 'Label/S' })]);
  var opts = VV({ name: 'Options', gap: 12 });
  addAll(opts, [Tx('What happens now', 'Heading/H4'),
    fillW(optionRow(false, 'Wait for Mộc Bài to reopen', 'The inspection ends at 16:00; the trailer waits in the exit lane.', [['Arrives', arrivesLate('19:30')], ['Documents', 'Unchanged'], ['Horse', 'Unloaded at the Bavet holding yard by ' + unloadBy() + '; yard fee applies', 'status/warn/fg']])),
    fillW(optionRow(true, 'Re-route via Xa Mát – Trapeang Phlong', '+95 km through Kampong Cham to the Xa Mát crossing, then on to Ho Chi Minh City.', [['Arrives', arrivesLate('15:40')], ['Documents', '1 new: a customs value declaration for Xa Mát', 'status/warn/fg'], ['Horse', 'Rests unloaded at the Xa Mát yard at 11:10, inside 6 h']])),
    fillW(optionRow(false, 'Return to Phnom Penh', 'Back to the owner’s stable; the move needs a new date.', [['Arrives', 'Back by 11:00'], ['Documents', 'All re-checked against the new date', 'status/warn/fg'], ['Horse', 'Inside 6 h']]))]);
  var comp = VV({ name: 'Decision', gap: 14, pad: [18, 20, 18, 20], radius: 12, fill: 'surface/raised', stroke: 'border/strong' });
  addAll(comp, [Tx('Re-route via Xa Mát – Trapeang Phlong', 'Label/M'),
    Tx('When you decide', 'Label/S', 'text/secondary'),
    fillW(factLine('Lan files the customs value declaration for Xa Mát', 'Electronic filing takes about an hour; it’s needed by 10:50.', false)),
    fillW(factLine('Tùng gets the new route and the Xa Mát rest stop', 'On his cab tablet, as soon as you decide.', false)),
    fillW(factLine('Sokha Stables is told, with your message', 'It also appears on their request page.', false)),
    fillW(noteField('Message to Sokha Stables', 'Mộc Bài is closed until 16:00 for a bridge inspection. We are re-routing Mekong Star through Xa Mát, with a rest stop at 11:10. New arrival about 15:40 at your yard.', 'Required. Sent as written.')),
    btn('Primary', 'MD', 'Re-route via Xa Mát', { fill: true, trail: 'arrow-right' })]);
  var left = column([rec, opts, comp]);
  var clock = panel('Time on the trailer', { gap: 10 });
  addAll(clock, [Tx('Time on the trailer', 'Heading/H4'), Tx(onTrailer(NOW40), 'Mono/Data L', 'status/warn/fg'), dlRow('Loaded', INC40.loaded),
    (function () { var r = H({ name: 'Unload by', main: 'SPACE_BETWEEN', cross: 'CENTER' }); addAll(r, [Tx('Unload by', 'Body/S', 'text/secondary'), dueStack('In ' + durText(toMin(unloadBy()) - toMin(NOW40)), unloadBy(), 'status/warn/fg')]); return fillW(r); })(),
    Tx('A horse is unloaded to rest at least every ' + INC40.restEvery + ' hours.', 'Body/S', 'text/tertiary', { fill: true })]);
  var people = peoplePanel([['Tùng', 'driver', 'At the Bavet exit lane with Mekong Star.'], ['Lan', 'transport specialist', 'Files documents for any new crossing.'], ['Sokha', 'owner, Sokha Stables', 'Told of your decision with your message.']], 'Who is involved');
  var tl = miniTimeline([['08:40', 'Mekong Star watered; settled.', 'Tùng'], [INC40.held, 'Incident opened for you at once; Lan copied.', 'System'], [INC40.held, 'Held at Bavet: Mộc Bài closed until 16:00.', 'Tùng']]);
  return incidentScreen('Logistics manager · Incident · Held', head, left, column([clock, people, tl]), 'Tue 29 Sep 2026', ['Incidents', 'CBRT-2026-040']);
}

/* ---------- CBRT-2026-036: the customer reports a problem (Thu 24 Sep) ---------- */
var REPORT_TEXT = 'A cut about 6 cm on the left hind cannon, still bleeding a little when she came off the trailer. She is walking sound.';
function photoThumbs(names, addBox) {
  var r = H({ name: 'Photos', gap: 12 });
  names.forEach(function (n) {
    var v = VV({ name: n, gap: 6 });
    var box = H({ name: 'Thumb', w: 120, h: 90, radius: 8, fill: 'surface/muted', main: 'CENTER', cross: 'CENTER' });
    add(box, Ic('eye', 20, 'text/tertiary'));
    addAll(v, [box, Tx(n, 'Mono/Caption', 'text/tertiary')]);
    add(r, v);
  });
  if (addBox) {
    var a = VV({ name: 'Add', gap: 6, w: 120, h: 90, radius: 8, stroke: 'border/strong', dash: [4, 3], main: 'CENTER', cross: 'CENTER' });
    addAll(a, [Ic('plus', 18, 'text/secondary'), Tx('Add photo', 'Label/S', 'text/secondary')]);
    add(r, a);
  }
  return r;
}
function escortRecord(title) {
  var p = panel('Escort record', { gap: 10 });
  var h = VV({ name: 'Head', gap: 8 });
  addAll(h, [Tx(title, 'Heading/H4'), chip('Ok', 'Sound')]);
  addAll(p, [fillW(h), Tx('“Walked off well; drinking.”', 'Body/S', 'text/primary', { fill: true }), Tx('Logged at 16:10 by Hạnh, groom, on arrival.', 'Body/S', 'text/tertiary', { fill: true }), divider(),
    dlRow('Loaded, Bangkok', '05:10 · calm', { valueStyle: 'Label/S' }), dlRow('Siem Reap stop', '10:20 · sound', { valueStyle: 'Label/S' }), dlRow('Delivered', '16:05', { valueStyle: 'Mono/Data' })]);
  return p;
}
function scrTrackReport() {
  var form = panel('Report a problem', { gap: 18 });
  var fh = VV({ name: 'Head', gap: 4 });
  addAll(fh, [Tx('Report a problem', 'Heading/H3'), Tx('Tell Yến what you found. If another horse is affected, add it to the same case after sending.', 'Body/S', 'text/secondary', { fill: true })]);
  add(form, fillW(fh));
  var which = VV({ name: 'Which horse', gap: 10 });
  addAll(which, [Tx('Which horse', 'Label/S', 'text/secondary'), fillW(svcOptions([
    ['Selected', 'Golden Lotus', 'Mare · Thoroughbred', 'Stall 3', null],
    ['Default', 'Rising Tide', 'Gelding · Thoroughbred', 'Stall 1', null],
    ['Default', 'Siam Arrow', 'Stallion · Arabian', 'Stall 2', null]], true))]);
  add(form, fillW(which));
  var kind = VV({ name: 'Kind', gap: 10 });
  addAll(kind, [Tx('What kind of problem', 'Label/S', 'text/secondary'), fillW(svcOptions([
    ['Selected', 'Injury', 'A cut, swelling or lameness.', 'A vet within 4 hours', null],
    ['Default', 'Illness', 'Off feed, colic signs, fever.', 'A vet within 4 hours', null],
    ['Default', 'Something else', 'Missing kit, papers, anything else.', 'A reply within 2 hours', null]], true))]);
  add(form, fillW(kind));
  add(form, fillW(noteField('What you found', REPORT_TEXT, 'Where on the horse, how it looks, and how the horse is now.')));
  var ph = VV({ name: 'Photos block', gap: 10 });
  addAll(ph, [Tx('Photos', 'Label/S', 'text/secondary'), photoThumbs(['IMG_2291.jpg', 'IMG_2292.jpg'], true)]);
  add(form, fillW(ph));
  add(form, btn('Primary', 'MD', 'Send to Yến', { trail: 'arrow-right' }));
  var urgent = panel('If it can’t wait', { gap: 10, stroke: 'status/bad/border' });
  addAll(urgent, [Tx('If it can’t wait', 'Heading/H4'), Tx('Heavy bleeding, colic or a horse that won’t bear weight: call now, then send this.', 'Body/S', 'text/secondary', { fill: true }), btn('Secondary', 'MD', 'Call the duty line', { lead: 'phone', fill: true })]);
  var next = panel('What happens next', { gap: 10 });
  var r = H({ name: 'Reply', main: 'SPACE_BETWEEN', cross: 'CENTER' });
  addAll(r, [Tx('Yến replies', 'Body/S', 'text/secondary'), dueStack('Within 2 hours', 'of sending')]);
  addAll(next, [Tx('What happens next', 'Heading/H4'), Tx('Yến, logistics manager, reads your report with the escort’s arrival record and replies with a next step.', 'Body/S', 'text/secondary', { fill: true }), fillW(r),
    Tx('Sending pauses the 26 Sep handover deadline until the case is settled.', 'Body/S', 'text/secondary', { fill: true })]);
  var s = trackScreen('Tracking · Report a problem', trackHead('Bangkok → Ho Chi Minh City', ['REQ-2026-0151', 'job CBRT-2026-036 · 3 horses · delivered 24 Sep 2026, 16:05'], [stageChip('Handover'), chip('Warn', 'Handover not confirmed')], 'Back to the request'),
    [split(form, column([urgent, next]), SIDE.narrow)], '24 Sep 2026, ' + INC36.draft);
  var nm = s.findOne(function (n) { return n.type === 'TEXT' && n.name === 'Account name'; });
  var ini = s.findOne(function (n) { return n.type === 'TEXT' && n.name === 'Initials'; });
  if (nm) nm.characters = 'Chao Phraya Racing Stables';
  if (ini) ini.characters = 'CP';
  return s;
}

/* ---------- the same case on Yến's side (18:05) ---------- */
function scrIncidentReport() {
  var head = builderHead('Golden Lotus · cut on arrival', 'CBRT-2026-036', 'REQ-2026-0151 · Chao Phraya Racing Stables · Bangkok → Ho Chi Minh City', 'Incidents',
    [stageChip('Handover'), chip('Bad', 'Open'), dueStack('Reply in ' + INC36.left, 'by ' + INC36.due, 'status/warn/fg')]);
  head.findOne(function (n) { return n.name === 'Status'; }).itemSpacing = 12;
  var rep = panel('Customer report', { gap: 10 });
  var h = VV({ name: 'Head', gap: 8 });
  addAll(h, [Tx('What the customer reported', 'Heading/H4'), chip('Bad', 'Injury')]);
  addAll(rep, [fillW(h), Tx('“' + REPORT_TEXT + '”', 'Body/S', 'text/primary', { fill: true }), photoThumbs(['IMG_2291.jpg', 'IMG_2292.jpg'], false), stamp(INC36.reported, 'Niran, stable manager')]);
  var two = H({ name: 'Records', gap: 24 });
  addAll(two, [fillW(rep), fillW(escortRecord('What the escort recorded'))]);
  var diff = callout('Warn', 'The records differ', 'Logged sound at 16:10 by Hạnh; reported cut at ' + INC36.reported + '. The groom’s statement and the vet’s visit establish what happened; this page doesn’t decide fault.');
  var comp = VV({ name: 'Reply', gap: 14, pad: [18, 20, 18, 20], radius: 12, fill: 'surface/raised', stroke: 'border/strong' });
  addAll(comp, [Tx('Next steps and reply', 'Label/M'),
    Tx('Done', 'Label/S', 'text/secondary'),
    fillW(factLine('Vet visit booked for 25 Sep at 09:00', 'Dr Phạm Quốc Bảo, at the club’s barn. The cost is held until the case closes.', true)),
    fillW(factLine('Insurer notified under the transit policy', 'PVI Insurance, at ' + INC36.notified + '.', true)),
    fillW(factLine('Statement requested from Hạnh, groom', 'Due 25 Sep at 12:00.', true)),
    fillW(noteField('Reply to Chao Phraya Racing Stables', 'Thank you for the photos. A vet will see Golden Lotus at your barn tomorrow at 09:00, and we have notified our insurer. Hạnh, who logged her on arrival, is writing a statement by noon. Your handover stays open until this is settled.', 'Required. Sent as written; it also appears on the request page.')),
    btn('Primary', 'MD', 'Send reply', { fill: true, trail: 'arrow-right' })]);
  var left = column([two, diff, comp]);
  var ho = panel('Handover', { gap: 10 });
  var hh = H({ name: 'Head', gap: 12, main: 'SPACE_BETWEEN', cross: 'CENTER' });
  addAll(hh, [Tx('Handover', 'Heading/H4'), chip('Warn', 'Paused')]);
  addAll(ho, [fillW(hh), Tx('The 26 Sep default is paused while this case is open. The other two horses were logged sound and aren’t in question.', 'Body/S', 'text/secondary', { fill: true })]);
  var people = peoplePanel([['Niran', 'stable manager, Chao Phraya Racing Stables', 'Reported the cut; receives your reply.'], ['Hạnh', 'groom', 'Logged Golden Lotus on arrival; statement due 25 Sep 12:00.'], ['Dr Bảo', 'veterinarian', 'Visits 25 Sep 09:00.']], 'Who is involved');
  var tl = miniTimeline([[INC36.vet, 'Vet booked for 25 Sep at 09:00.', 'Yến'], [INC36.notified, 'Insurer notified: PVI Insurance.', 'Yến'], [INC36.opened, 'Incident opened; handover deadline paused.', 'System'], [INC36.reported, 'Problem reported for Golden Lotus with 2 photos.', 'Niran'], ['16:10', 'Arrival logged: all three sound.', 'Hạnh']]);
  return incidentScreen('Logistics manager · Incident · Customer report', head, left, column([ho, people, tl]), 'Thu 24 Sep 2026', ['Incidents', 'CBRT-2026-036']);
}
async function eIncidents() {
  var a = await staffScreensCall([scrIncidentHeld, scrIncidentReport]);
  var b = await insertChainCall([scrTrackReport], 'Tracking · Closed');
  return report({ screens: a.screens.concat(b.screens) });
}
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
/* =====================================================================
   Horse profile (customer). The source every other screen reads: stall
   plans, quotations and document checks. The page shows what the horse
   needs, what she owes, the documents that stay with her, her trips, and
   what an edit would touch before it is saved.
   ===================================================================== */
var NF = HORSES[1];
/* the horse's coat band stands in for the title; the nameplate carries her name */
function horseHead(right) {
  var band = H({ name: 'Coat', h: 132, pad: [0, 24, 22, 24], radius: 12, cross: 'MAX', fill: 'coat/' + NF.coat.toLowerCase(), clip: true });
  var plate = inst(C.nameplate);
  setP(plate, { Name: NF.name, Subtitle: NF.sub });
  add(band, plate);
  return pageHeader({ back: 'My horses', banner: band, code: NF.chip, summary: 'Thoroughbred · mare · 4 y · black', metaChips: NF.tags.map(function (t) { return chip(t[0], t[1]); }), right: [right] });
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
    var st = H({ name: 'Status col', w: 170 });
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
    addAll(top, [Tx(t[0], 'Mono/Data', 'text/primary'), stageChip(t[3])]);
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
  var s = screen('My horses · Nightfall', 'My horses', [horseHead(btn('Secondary', 'MD', 'Edit profile', { lead: 'pencil' })), split(left, column([tripsPanel(), valuePanel()]), SIDE.narrow)], { gap: 28, asOf: '26 Sep 2026, 11:20' });
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
    var st = H({ name: 'Status col', w: 110 });
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
/* =====================================================================
   Customer contact: a note attached to a request, never a free chat. The
   customer picks what it's about; the page names who answers and by when.
   Every note and reply stays on the request's history for both sides,
   and a reply can carry an action (moving a deadline, with its reason).
   ===================================================================== */
var ASK_NOTE = 'PVI can only issue the extension to 20 Oct on 1 Oct, a day after it’s due. Is that a problem?';
function whoAnswers() {
  var p = panel('Who answers what', { gap: 10, pad: [20, 24, 12, 24] });
  add(p, VV({ name: 'Title', pad: [0, 0, 10, 0] }, [Tx('Who answers what', 'Heading/H4')]));
  [['Documents', 'Lan, transport specialist'], ['Dates, price or changes', 'Yến, logistics manager'], ['The trip', 'Khôi before departure; the escort on the day']].forEach(function (r) {
    add(p, fillW(dlRow(r[0], r[1], { valueStyle: 'Label/S' })));
  });
  add(p, VV({ name: 'Foot', pad: [10, 0, 4, 0] }, [Tx('Replies within 1 business day. Urgent on the day of travel? Call the number on your trip page.', 'Body/S', 'text/tertiary', { w: 352 })]));
  return p;
}
function earlierNotes() {
  var p = panel('Earlier notes', { gap: 12 });
  add(p, Tx('Earlier notes on this request', 'Heading/H4'));
  var q = VV({ name: 'Note', gap: 4, pad: [12, 0, 0, 0] });
  borderSide(q, 'border/default', 'top');
  addAll(q, [stamp('21 Sep · 14:02', 'You · The trip'), Tx('Can the grooms bring each horse’s own hay on board?', 'Body/S', 'text/primary', { fill: true })]);
  var a = VV({ name: 'Reply', gap: 4, pad: [10, 0, 0, 14] });
  borderSide(a, 'border/strong', 'top');
  a.strokeTopWeight = 0; a.strokeLeftWeight = 1;
  addAll(a, [stamp('21 Sep · 16:40', 'Khôi, fleet & route coordinator'), Tx('Yes, up to 2 nets per horse. They ride in the trailer’s front locker.', 'Body/S', 'text/secondary', { fill: true })]);
  addAll(p, [fillW(q), fillW(a)]);
  return p;
}
function scrTrackAsk() {
  var form = panel('Ask about this request', { gap: 18 });
  var fh = VV({ name: 'Head', gap: 4 });
  addAll(fh, [Tx('Ask about this request', 'Heading/H3'), Tx('Your note goes to the person who handles that part of your move and stays on this request’s history.', 'Body/S', 'text/secondary', { fill: true })]);
  add(form, fillW(fh));
  var about = VV({ name: 'About', gap: 10 });
  addAll(about, [Tx('What is it about?', 'Label/S', 'text/secondary'), fillW(svcOptions([
    ['Selected', 'Documents', 'Uploads, checks and deadlines.', 'Answered by Lan', null],
    ['Default', 'Dates, price or changes', 'Quotations, dates, adding or removing horses.', 'Answered by Yến', null],
    ['Default', 'The trip', 'Loading, the route and the day itself.', 'Answered by Khôi', null]], true))]);
  add(form, fillW(about));
  add(form, input('Select', 'Default', 'Which item', 'Transit insurance · due 30 Sep 2026', null));
  add(form, fillW(noteField('Your note', ASK_NOTE, 'Be specific, and attach what you have.')));
  add(form, fillW(fileRow('PVI_extension_email.pdf', 'PDF · 84 KB · attached', 'Remove')));
  var route = H({ name: 'Routing', gap: 16, pad: [14, 16, 14, 16], radius: 8, fill: 'bg/sunken', main: 'SPACE_BETWEEN', cross: 'CENTER' });
  addAll(route, [Tx('Goes to Lan, transport specialist. Yến can read it too.', 'Body/S', 'text/secondary', { fill: true }), dueStack('Within 1 business day', 'by Mon 28 Sep')]);
  add(form, fillW(route));
  add(form, btn('Primary', 'MD', 'Send to Lan', { trail: 'arrow-right' }));
  return trackScreen('Tracking · Ask a question', trackHead('Ho Chi Minh City → Phnom Penh', ['REQ-2026-0162', 'job CBRT-2026-041 · 4 horses · departs 18 Oct 2026, 06:00'], [stageChip('Documents')], 'Back to the request'),
    [split(form, column([earlierNotes(), whoAnswers()]), SIDE.narrow)], '26 Sep 2026, 11:30');
}

/* ---------- Lan's side: the notes routed to her ---------- */
/* rows: [customer, ref, subject, received, due, date, tone, selected] */
var LAN_NOTES = [
  ['Saigon Turf Club', 'CBRT-2026-041', 'Transit insurance: the extension is issued a day late', 'Sat 26 Sep · 11:31', 'Reply today', 'by 28 Sep', 'status/warn/fg', true],
  ['Lao Turf Club', 'CBRT-2026-044', 'Can the first lab do the second EIA test?', 'Sun 27 Sep · 18:20', 'Reply today', 'by 28 Sep', 'status/warn/fg'],
  ['Chao Phraya Racing Stables', 'CBRT-2026-036', 'A copy of the health certificates for our records', 'Mon 28 Sep · 08:10', 'In 1 day', 'by 29 Sep'],
  ['Hanoi Riding Club', 'REQ-2026-0190', 'Does Laos need its own EIA test?', 'Mon 28 Sep · 08:52', 'In 1 day', 'by 29 Sep']
];
function scrStaffNotes() {
  var list = panel('Notes', { gap: 0, pad: 0, clip: true });
  var lh = H({ name: 'Head', pad: [16, 20, 14, 20], main: 'SPACE_BETWEEN', cross: 'CENTER' });
  addAll(lh, [Tx('Open · 4', 'Heading/H4'), Tx('Oldest first', 'Label/S', 'text/tertiary')]);
  add(list, fillW(lh));
  LAN_NOTES.forEach(function (n) {
    var r = VV({ name: n[1], gap: 6, pad: [14, 20, 14, 20], fill: n[7] ? 'surface/raised' : null });
    borderSide(r, 'border/default', 'top');
    var top = H({ name: 'Top', gap: 8, main: 'SPACE_BETWEEN', cross: 'CENTER' });
    addAll(top, [Tx(n[0], 'Label/S'), dueStack(n[4], n[5], n[6])]);
    addAll(r, [fillW(top), Tx(n[2], 'Body/S', 'text/secondary', { fill: true }), Tx(n[1] + ' · ' + n[3], 'Mono/Caption', 'text/tertiary')]);
    add(list, fillW(r));
  });
  var d = panel('Note', { gap: 16 });
  var dh = H({ name: 'Head', gap: 12, main: 'SPACE_BETWEEN', cross: 'MIN' });
  var dt = VV({ name: 'Text', gap: 2 });
  addAll(dt, [Tx('Saigon Turf Club · CBRT-2026-041', 'Heading/H4'), stamp('Sat 26 Sep · 11:31', 'from the request page')]);
  addAll(dh, [dt, chip('Info', 'Documents')]);
  addAll(d, [fillW(dh), Tx('“' + ASK_NOTE + '”', 'Body/M', 'text/primary', { fill: true }), fillW(fileRow('PVI_extension_email.pdf', 'PDF · 84 KB', 'Open'))]);
  var item = H({ name: 'Item', gap: 14, pad: [12, 16, 12, 16], radius: 8, fill: 'bg/sunken', cross: 'CENTER' });
  var it = VV({ name: 'Text', gap: 2 });
  addAll(it, [Tx('Transit insurance · due 30 Sep 2026', 'Label/S'), Tx('Ends 15 Oct, before 20 Oct (arrival + 2 days). Clearance is planned for ' + CLEARANCE_041 + '.', 'Body/S', 'text/secondary', { fill: true })]);
  addAll(item, [chip('Warn', 'Expires in transit'), fillW(it)]);
  add(d, fillW(item));
  var comp = VV({ name: 'Reply', gap: 14, pad: [18, 20, 18, 20], radius: 12, fill: 'surface/raised', stroke: 'border/strong' });
  addAll(comp, [Tx('Reply', 'Label/M'),
    fillW(noteField('Reply to Saigon Turf Club', '1 Oct is fine. I’ve moved the due date to 2 Oct; upload the extension when PVI sends it. That is still well before clearance on ' + CLEARANCE_041 + '.', 'Sent as written; it also appears on the request page.')),
    fillW(checkRow('Move the due date to 2 Oct 2026', 'Reason shown to the customer: the insurer issues on 1 Oct; clearance is ' + CLEARANCE_041 + ', so there is room.', true)),
    btn('Primary', 'MD', 'Send reply', { fill: true, trail: 'arrow-right' }),
    Tx('Yến, logistics manager, can read every note and reply.', 'Body/S', 'text/tertiary', { fill: true })]);
  add(d, fillW(comp));
  var body = H({ name: 'Body', gap: 24 });
  list.resize(SIDE.narrow, list.height); list.layoutSizingHorizontal = 'FIXED';
  addAll(body, [list, fillW(d)]);
  return adminScreen('Transport specialist · Customer notes', 'Customer notes', ['Customer notes'], STAFF.lan, [headAdmin('Customer notes', 'Notes customers left on their requests, routed to you by topic. Reply within 1 business day.', chip('Warn', '2 due today')), body], 'Mon 28 Sep 2026');
}
async function eContact() {
  var a = await insertChainCall([scrTrackAsk], 'Tracking · All documents');
  var b = await staffScreensCall([scrStaffNotes]);
  return report({ screens: a.screens.concat(b.screens) });
}
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
  setP(s.children[s.children.length - 1], { 'As of': '27 Sep 2026' });
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
/* =====================================================================
   Access: sign in, create a club account, accept a staff invite, reset
   a password. One door for customers and staff; the account decides
   where it lands. No nav, no marketing: the brand, the form, and a
   sunken panel that explains this particular case in words.
   ===================================================================== */
var AUTH_H = 900;              // the desktop viewport the access pages are drawn at
var AUTH_FORM = 440;           // form column width
var PW = '••••••••••••••';     // a 14-character password, drawn masked
var PW_RULE = 'At least 12 characters.';
var INVITE = { name: 'Bùi Anh Thư', email: 'thu.bui@equifreight.vn', role: 'Transport specialist', by: 'Vũ Hải Yến, logistics manager', sent: '25 Sep 2026, 10:14', until: '2 Oct 2026' };
var CUSTOMER_EMAIL = 'bookings@saigonturf.vn';

function authBar() {
  var bar = H({ name: 'Top bar', main: 'SPACE_BETWEEN', cross: 'CENTER', pad: [0, 40, 0, 40], h: 64 });
  borderSide(bar, 'border/default', 'bottom');
  addAll(bar, [brand(), btn('Ghost', 'SM', 'Help', { lead: 'info' })]);
  return bar;
}
/* title and a one-paragraph summary, left-aligned over the form */
function authHead(title, summary) {
  var h = VV({ name: 'Head', gap: 12 });
  addAll(h, [Tx(title, 'Display/L', 'text/primary', { name: 'Title' }), Tx(summary, 'Body/M', 'text/secondary', { name: 'Summary', w: AUTH_FORM })]);
  return h;
}
function authForm(head, blocks) {
  var f = VV({ name: 'Form', gap: 32, w: AUTH_FORM });
  var fields = VV({ name: 'Fields', gap: 20 });
  blocks.forEach(function (b) { if (b) add(fields, fillW(b)); });
  addAll(f, [fillW(head), fillW(fields)]);
  return f;
}
/* a text row with a link-like Ghost action: "New to EquiFreight? Create an account" */
function authAlt(text, action, icon) {
  var r = H({ name: 'Alternative', gap: 4, cross: 'CENTER' });
  addAll(r, [Tx(text, 'Body/S', 'text/secondary'), btn('Ghost', 'SM', action, icon ? { trail: icon } : {})]);
  return r;
}
function authCheck(label, on) { var cb = inst(C.checkbox, { Checked: on ? 'True' : 'False' }); setP(cb, { Label: label }); cb.name = 'Check · ' + label; return cb; }
/* the page: two columns (form, then a sunken explanation) or one centred column */
function authScreen(name, form, aside, o) {
  o = o || {};
  var s = VV({ name: name, w: SCREEN_W, fill: 'bg/canvas' });
  add(s, fillW(authBar()));
  var body;
  if (aside) {
    body = H({ name: 'Body' });
    var left = VV({ name: 'Form column', w: 720, pad: [96, 120, 64, 160] });
    add(left, form);
    var right = VV({ name: 'Aside', gap: 28, pad: [96, 120, 64, 96], fill: 'bg/sunken' });
    right.strokes = [P('border/default')]; right.strokeAlign = 'INSIDE';
    right.strokeTopWeight = 0; right.strokeBottomWeight = 0; right.strokeRightWeight = 0; right.strokeLeftWeight = 1;
    aside.forEach(function (a) { add(right, a); });
    addAll(body, [left, fillW(right)]);
    right.layoutSizingVertical = 'FILL';
  } else {
    body = VV({ name: 'Body', cross: 'CENTER', pad: [120, 0, 64, 0] });
    add(body, form);
  }
  add(s, fillW(body));
  add(s, fillW(footer('Compact', o.asOf)));
  if (!o.tall) { s.resize(SCREEN_W, AUTH_H); s.layoutSizingVertical = 'FIXED'; body.layoutSizingVertical = 'FILL'; }
  return s;
}
/* the sunken side: a heading, then rows separated by hairlines (never cards) */
function asideList(title, rows, o) {
  o = o || {};
  var v = VV({ name: title, gap: 0, w: 480 });
  add(v, VV({ name: 'Title', gap: 6, pad: [0, 0, 16, 0] }, [Tx(title, 'Heading/H3')].concat(o.sub ? [Tx(o.sub, 'Body/S', 'text/secondary', { w: 480 })] : [])));
  rows.forEach(function (r, i) {
    var row = H({ name: r[0], gap: 14, pad: [14, 0, 14, 0], cross: 'MIN' });
    borderSide(row, 'border/default', 'top');
    if (o.numbered) {
      var cur = o.current === i, done = o.current > i;
      var n = H({ name: 'N', w: 28, h: 28, radius: 999, stroke: cur ? 'text/primary' : 'border/strong', fill: done ? 'status/ok/bg' : null, main: 'CENTER', cross: 'CENTER' });
      add(n, done ? Ic('check', 14, 'status/ok/fg') : Tx(String(i + 1), 'Mono/Caption', cur ? 'text/primary' : 'text/tertiary'));
      add(row, n);
    } else if (r[2]) add(row, Ic(r[2], 20, 'text/tertiary'));
    var t = VV({ name: 'Text', gap: 2 });
    addAll(t, [Tx(r[0], 'Label/M'), Tx(r[1], 'Body/S', 'text/secondary', { fill: true })]);
    add(row, fillW(t));
    add(v, fillW(row));
  });
  return v;
}
var ACCOUNT_KEEPS = [
  ['What you owe, and by when', 'Every upload and answer we need from you, sorted by deadline, each with its due date.', 'clock'],
  ['Documents checked against your travel dates', 'Each test and certificate is checked against the day the horse travels, not the day you upload it.', 'file'],
  ['Quotations you can read line by line', 'Every line says how it was worked out. You accept or decline in one place.', 'tag'],
  ['Your horses, entered once', 'Passport details, size and handling needs are reused on every move.', 'check']
];
function signInAside() { return [asideList('One account for every move', ACCOUNT_KEEPS)]; }

/* ---------- Sign in ---------- */
function signInForm(o) {
  o = o || {};
  var blocks = [];
  if (o.locked) blocks.push(callout('Bad', 'Signing in is locked for 15 minutes', 'After 5 failed attempts we pause sign-in for this email. You can still reset your password now; a reset unlocks the account.'));
  blocks.push(input('Text', o.locked ? 'Disabled' : 'Default', 'Email', CUSTOMER_EMAIL, null));
  blocks.push(input('Password', o.locked ? 'Disabled' : o.error ? 'Error' : 'Focus', 'Password', o.error ? '•••••••••' : PW, o.error ? 'Email or password doesn’t match. 3 attempts left before a 15-minute lock.' : null));
  var opts = H({ name: 'Options', main: 'SPACE_BETWEEN', cross: 'CENTER' });
  add(opts, authCheck('Keep me signed in on this device', false));
  if (!o.locked) add(opts, btn('Ghost', 'SM', 'Forgot password?')); // when locked, reset is the gold action below
  blocks.push(opts);
  if (o.locked) {
    var row = H({ name: 'Locked until', gap: 16, main: 'SPACE_BETWEEN', cross: 'CENTER', pad: [12, 16, 12, 16], radius: 8, fill: 'bg/sunken' });
    var d = VV({ name: 'Due', gap: 2, cross: 'MAX' });
    addAll(d, [Tx('Unlocks in 12 min', 'Label/S', 'status/bad/fg', { align: 'RIGHT' }), Tx('14:32', 'Mono/Caption', 'text/tertiary', { align: 'RIGHT' })]);
    addAll(row, [Tx('Sign in again', 'Body/S', 'text/secondary'), d]);
    blocks.push(row);
    blocks.push(btn('Primary', 'MD', 'Reset password', { fill: true }));
    blocks.push(btn('Secondary', 'MD', 'Sign in', { fill: true, state: 'Disabled' }));
  } else blocks.push(btn('Primary', 'MD', 'Sign in', { fill: true }));
  blocks.push(divider());
  blocks.push(authAlt('New to EquiFreight?', 'Create a club account', 'arrow-right'));
  blocks.push(Tx('Staff sign in here too, with the email your invite was sent to. Your role decides where you land.', 'Body/S', 'text/tertiary', { fill: true }));
  return authForm(authHead('Sign in', 'One sign-in for racing clubs and EquiFreight staff.'), blocks);
}
function scrSignIn() { return authScreen('Access · Sign in', signInForm(), signInAside()); }
function scrSignInError() { return authScreen('Access · Sign in · Wrong password', signInForm({ error: true }), signInAside()); }
function scrSignInLocked() { return authScreen('Access · Sign in · Locked', signInForm({ locked: true }), signInAside(), { asOf: '26 Sep 2026, 14:20', tall: true }); } // the lock notice and its two actions need more than 900

/* ---------- Create a club account ---------- */
var NEXT_STEPS = [
  ['Confirm your email', 'Open the link we send. It works for 24 hours.'],
  ['Add your horses', 'Name, microchip, size and temperament. About 3 minutes each.'],
  ['Request transport', 'You see an indicative range straight away, then an itemised quotation within 1 business day. Nothing to pay until you accept one.']
];
function formGroup(title, fields) {
  var g = VV({ name: title, gap: 14, pad: [18, 0, 0, 0] });
  borderSide(g, 'border/default', 'top');
  add(g, Tx(title, 'Heading/H4'));
  fields.forEach(function (f) { add(g, fillW(f)); });
  return g;
}
function pair(a, b) { var r = H({ name: 'Fields', gap: 16, cross: 'MIN' }); addAll(r, [fillW(a), fillW(b)]); return r; }
function scrSignUp() {
  var club = formGroup('Your club', [pair(input('Text', 'Default', 'Club or owner name', 'Đà Lạt Highland Stables', null), input('Select', 'Default', 'Country', 'Vietnam', null))]);
  var contact = formGroup('You', [input('Text', 'Default', 'Your name', 'Phạm Minh Đức', null), pair(input('Text', 'Default', 'Email', 'duc@dalathighland.vn', null), input('Text', 'Default', 'Phone', '+84 90 812 3456', null))]);
  var pw = formGroup('Password', [input('Password', 'Focus', 'Password', PW, PW_RULE + ' Yours has 14.')]);
  var terms = H({ name: 'Terms', gap: 4, cross: 'CENTER' });
  addAll(terms, [authCheck('I agree to the terms of service', false), btn('Ghost', 'SM', 'Read the terms')]);
  var form = authForm(authHead('Create a club account', 'For racing clubs and horse owners. Staff accounts come by invite from your logistics manager.'),
    [club, contact, pw, terms, btn('Primary', 'MD', 'Create account', { fill: true }), divider(), authAlt('Already have an account?', 'Sign in')]);
  var s = authScreen('Access · Create account', form, [asideList('What happens next', NEXT_STEPS, { numbered: true, current: 0 })], { tall: true });
  return s;
}
function scrSignUpSent() {
  var acts = H({ name: 'Actions', gap: 12, cross: 'CENTER' });
  addAll(acts, [btn('Secondary', 'MD', 'Send the link again'), btn('Ghost', 'MD', 'Use a different email')]);
  var form = authForm(authHead('Check your email', 'We sent a confirmation link to duc@dalathighland.vn. Open it on any device to finish setting up Đà Lạt Highland Stables.'),
    [dlRowAuth('Link works until', '27 Sep 2026, 11:05'), acts, Tx('Nothing arrived after 5 minutes? Check spam, or send the link again.', 'Body/S', 'text/tertiary', { fill: true })]);
  return authScreen('Access · Create account · Check your email', form, [asideList('What happens next', NEXT_STEPS, { numbered: true, current: 0 })], { asOf: '26 Sep 2026, 11:05' });
}
function dlRowAuth(label, value) {
  var r = H({ name: label, gap: 16, main: 'SPACE_BETWEEN', cross: 'CENTER', pad: [12, 16, 12, 16], radius: 8, fill: 'bg/sunken' });
  addAll(r, [Tx(label, 'Body/S', 'text/secondary'), Tx(value, 'Mono/Data', 'text/primary')]);
  return r;
}

/* ---------- Staff invite ---------- */
/* the role on offer, in the words Users & roles uses, plus the sidebar it will see */
function inviteAside(expired) {
  var v = VV({ name: 'Role', gap: 20, w: 480 });
  var tag = chip('Neutral', INVITE.role, { noDot: true }); tag.name = 'Role tag';
  var head = VV({ name: 'Title', gap: 10 });
  addAll(head, [tag, Tx('What a transport specialist does here', 'Heading/H3'), Tx('The same rights listed in Users & roles. They take effect when you set your password.', 'Body/S', 'text/secondary', { w: 480 })]);
  add(v, fillW(head));
  var caps = VV({ name: 'Can', gap: 0 });
  CAPS.filter(function (c) { return c[1][2]; }).forEach(function (c) {
    var r = H({ name: c[0], gap: 12, pad: [11, 0, 11, 0], cross: 'CENTER' });
    borderSide(r, 'border/default', 'top');
    addAll(r, [Ic('check', 16, 'status/ok/fg'), Tx(c[0], 'Body/S', 'text/primary', { fill: true })]);
    add(caps, fillW(r));
  });
  add(v, fillW(caps));
  var nav = VV({ name: 'Your sidebar', gap: 6 });
  addAll(nav, [Tx('Your sidebar', 'Label/S', 'text/secondary'), Tx(ROLE_NAV[INVITE.role].items.join(' · '), 'Body/S', 'text/primary', { w: 480 })]);
  add(v, fillW(nav));
  var by = VV({ name: 'Invited by', gap: 4, pad: [16, 0, 0, 0] });
  borderSide(by, 'border/default', 'top');
  addAll(by, [stamp(INVITE.sent, 'Invited by ' + INVITE.by), Tx(expired ? 'Expired ' + INVITE.until + '.' : 'Wrong role? Ask Yến to change it before you set a password.', 'Body/S', 'text/tertiary', { w: 480 })]);
  add(v, fillW(by));
  return [v];
}
function scrInvite() {
  var form = authForm(authHead('Set up your staff account', 'Vũ Hải Yến, logistics manager, invited you to EquiFreight as a transport specialist.'), [
    input('Text', 'Default', 'Your name', INVITE.name, null),
    input('Text', 'Disabled', 'Email', INVITE.email, 'Set by your invite. You sign in with it.'),
    input('Password', 'Focus', 'Password', PW, PW_RULE),
    dlRowAuth('Invite works until', INVITE.until),
    btn('Primary', 'MD', 'Set password and sign in', { fill: true })]);
  return authScreen('Access · Staff invite', form, inviteAside(false), { asOf: '27 Sep 2026' });
}
function scrInviteExpired() {
  var form = authForm(authHead('This invite has expired', 'Invites work for 7 days. This one was sent on 25 Sep and ended on 2 Oct.'), [
    callout('Warn', 'Ask Vũ Hải Yến for a new invite', 'She can resend it from Users & roles. Your email stays ' + INVITE.email + ', and nothing was set up yet, so nothing is lost.'),
    btn('Primary', 'MD', 'Ask Yến to resend', { fill: true }),
    authAlt('Already set a password?', 'Sign in')]);
  return authScreen('Access · Staff invite · Expired', form, inviteAside(true), { asOf: '3 Oct 2026' });
}

/* ---------- Reset a password (one centred column) ---------- */
function scrResetRequest() {
  return authScreen('Access · Reset password', authForm(authHead('Reset your password', 'Enter the email you sign in with. We’ll send a link that works for 1 hour.'), [
    input('Text', 'Focus', 'Email', CUSTOMER_EMAIL, null),
    btn('Primary', 'MD', 'Send reset link', { fill: true }),
    btn('Ghost', 'MD', 'Back to sign in', { lead: 'arrow-left' })]), null);
}
function scrResetSent() {
  var acts = H({ name: 'Actions', gap: 12, cross: 'CENTER' });
  addAll(acts, [btn('Secondary', 'MD', 'Send the link again'), btn('Ghost', 'MD', 'Back to sign in')]);
  return authScreen('Access · Reset password · Link sent', authForm(authHead('Check your email', 'If an account uses ' + CUSTOMER_EMAIL + ', a reset link is on its way.'), [
    dlRowAuth('Link works until', '26 Sep 2026, 10:12'), acts]), null, { asOf: '26 Sep 2026, 09:12' });
}
function scrResetNew() {
  return authScreen('Access · Reset password · New password', authForm(authHead('Choose a new password', 'For ' + CUSTOMER_EMAIL + '.'), [
    input('Password', 'Error', 'New password', '•••••••••', PW_RULE + ' Yours has 9.'),
    authCheck('Sign out of other devices', true),
    btn('Primary', 'MD', 'Save password and sign in', { fill: true })]), null, { asOf: '26 Sep 2026, 09:20' });
}
function scrResetExpired() {
  return authScreen('Access · Reset password · Link expired', authForm(authHead('This reset link has expired', 'Links work for 1 hour. This one was sent at 09:12 and ended at 10:12. Your password hasn’t changed.'), [
    btn('Primary', 'MD', 'Send a new link', { fill: true }),
    btn('Ghost', 'MD', 'Back to sign in', { lead: 'arrow-left' })]), null, { asOf: '26 Sep 2026, 10:40' });
}
var ACCESS_SCREENS = [scrSignIn, scrSignInError, scrSignInLocked, scrSignUp, scrSignUpSent, scrInvite, scrInviteExpired, scrResetRequest, scrResetSent, scrResetNew, scrResetExpired];
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
/* ---------------------------------------------------------------------
   Main
   --------------------------------------------------------------------- */
async function main() {
  figma.notify('Building EquiFreight design system…', { timeout: 4000 });
  await cleanup();
  await loadFonts();
  buildVariables();
  buildStyles();

  var old = figma.root.children.filter(function (p) { return PAGE_NAMES.indexOf(p.name) >= 0; });
  var pages = PAGE_NAMES.map(function (n) { var p = figma.createPage(); p.name = n; return p; });
  var cover = pages[0], foundations = pages[1], components = pages[2], screens = pages[3];
  await figma.setCurrentPageAsync(components);
  pages.forEach(function (p) { p.backgrounds = [{ type: 'SOLID', color: { r: 0.035, g: 0.055, b: 0.08 } }]; });
  for (var i = 0; i < old.length; i++) { try { old[i].remove(); } catch (e) { console.warn('Could not remove old page ' + old[i].name); } }

  var board = H({ name: 'Components', gap: 40, wrap: true, rowGap: 40, pad: 80, w: DOC_W * 2 + 40 + 160, fill: 'bg/canvas' });
  buildComponents(board);
  addChartVariables();
  addAdminIcons(board.findOne(function (n) { return n.name === 'Icon grid'; }));
  buildAdminComponents(board);
  buildTableComponents(board);
  buildTrackingComponents(board);
  var toastRow = docBlock(board, 'In use', 'Toasts confirm what just happened in words that match the button that caused it.');
  var tr = H({ name: 'Toasts', gap: 16 });
  var t1 = inst(C.toast, { Tone: 'Ok' }); setP(t1, { Message: 'Load plan confirmed for CBRT-2026-041' });
  var t2 = inst(C.toast, { Tone: 'Bad' }); setP(t2, { Message: 'Departure refused: 9 items outstanding' });
  addAll(tr, [t1, t2]);
  add(toastRow, tr);
  await flush();

  await figma.setCurrentPageAsync(foundations);
  buildFoundations(foundations);
  await flush();

  await figma.setCurrentPageAsync(screens);
  var row1 = [await scrHome(), scrHorses(), scrHorseProfile(), scrHorseEdit(), scrRequest1(), scrRequest2(), scrRequest3(), scrRequest4(), scrFirstRequests(), scrAddHorse()];
  var row2 = [scrQuote(), scrLoadPlan(), scrClearance(), scrAuthorities(), scrAuthoritiesOverdue(), scrRoute(), scrTripCheckpoint(), scrTripWelfare(), scrTripDelivery(), scrTripHeld()];
  await flush();
  var lbl1 = Tx('Owner portal · Dark', 'Display/M');
  var lbl2 = Tx('Operations · Dark', 'Display/M');
  var lbl3 = Tx('Light mode & mobile', 'Display/M');
  [lbl1, lbl2, lbl3].forEach(function (l) { screens.appendChild(l); });
  lbl1.x = 0; lbl1.y = -120;
  place(row1, 0, 0, 120);
  var y2 = Math.max.apply(null, row1.map(function (n) { return n.height; })) + 360;
  lbl2.x = 0; lbl2.y = y2 - 120;
  place(row2, 0, y2, 120);
  var y3 = y2 + Math.max.apply(null, row2.map(function (n) { return n.height; })) + 360;
  lbl3.x = 0; lbl3.y = y3 - 120;
  var light = [row1[0].clone(), row2[2].clone(), row2[0].clone()];
  light.forEach(function (n) { n.name = n.name + ' · Light'; n.setExplicitVariableModeForCollection(COLL.color, COLL.light); screens.appendChild(n); });
  var mob = scrHorsesMobile();
  var mobL = mob.clone();
  mobL.name = 'My horses · Mobile · Light';
  mobL.setExplicitVariableModeForCollection(COLL.color, COLL.light);
  screens.appendChild(mobL);
  place(light.concat([mob, mobL]), 0, y3, 120);
  await flush();

  var admin = [scrRegulations(), scrRates(), scrDashboard(), scrUsers(), scrJobs(), scrJobsSorted(), scrReview(), scrReviewOverride(), scrBuilder(), scrBuilderBlocked(), scrDocReview(), scrDocReject(), scrIncidentHeld(), scrIncidentReport(), scrStaffNotes()];
  await flush();
  var lblA = Tx('Staff workspace · Dark', 'Display/M');
  screens.appendChild(lblA);
  var yA = y3 + Math.max.apply(null, light.map(function (n) { return n.height; })) + 360;
  lblA.x = 0; lblA.y = yA - 120;
  place(admin, 0, yA, 120);
  await flush();

  var track = [scrMyRequests(), scrTrackReview(), scrTrackInfo(), scrTrackDocs(), scrAllDocs(), scrTrackAsk(), scrDocRefused(), scrDocUpload(), scrTrackTransit(), scrTrackDelivered(), scrTrackClosed(), scrTrackReport()];
  await flush();
  var lblT = Tx('Owner · Request tracking', 'Display/M');
  screens.appendChild(lblT);
  var yT = yA + Math.max.apply(null, admin.map(function (n) { return n.height; })) + 360;
  lblT.x = 0; lblT.y = yT - 120;
  place(track, 0, yT, 120);
  await flush();

  var access = ACCESS_SCREENS.map(function (f) { return f(); }), audit = AUDIT_SCREENS.map(function (f) { return f(); });
  await flush();
  var lblX = Tx('Access · Dark', 'Display/M');
  screens.appendChild(lblX);
  var yX = yT + Math.max.apply(null, track.map(function (n) { return n.height; })) + 360;
  lblX.x = 0; lblX.y = yX - 120;
  place(access, 0, yX, 120);
  var yU = yX + AUTH_H + 360;
  var lblU = Tx('Audit log · Dark', 'Display/M');
  screens.appendChild(lblU);
  lblU.x = 0; lblU.y = yU - 120;
  place(audit, 0, yU, 120);
  await flush();

  await figma.setCurrentPageAsync(cover);
  buildCover(cover);
  await flush();
  figma.viewport.scrollAndZoomIntoView(cover.children);

  var msg = 'EquiFreight: ' + COLORS.length + ' colour variables × 2 modes, ' + STATS.components + ' components, ' + STATS.variants + ' variants, 66 screens.';
  if (FALLBACKS.length) msg += ' Font fallbacks: ' + FALLBACKS.join('; ');
  figma.closePlugin(msg);
}

main().catch(function (e) {
  console.error(e);
  figma.closePlugin('EquiFreight generator failed: ' + (e && e.message ? e.message : e));
});
