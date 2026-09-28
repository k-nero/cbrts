// Strict-ish mock of the Figma Plugin API — enough surface to run code.js end to end
// and fail loudly on the mistakes real Figma rejects (sizing rules, unloaded fonts,
// bad property keys, missing variants, bad variable bindings).
'use strict';

let idc = 0;
const nid = () => `${++idc}:0`;
const CONTAINERS = new Set(['FRAME', 'COMPONENT', 'COMPONENT_SET', 'INSTANCE', 'PAGE', 'GROUP']);
const BINDABLE = new Set(['itemSpacing', 'counterAxisSpacing', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius', 'width', 'height', 'strokeWeight', 'opacity']);
const loaded = new Set();
const fontKey = (f) => `${f.family}::${f.style}`;
const styles = new Map();
const variables = new Map();
const collections = [];
const warnings = [];
const counts = {};

function fail(msg) { throw new Error('[mock] ' + msg); }
function checkPaints(n, v) {
  if (!Array.isArray(v)) fail(`${n.name}: paints must be an array`);
  for (const p of v) if (p.type === 'SOLID' && p.color && 'a' in p.color) fail(`${n.name}: SOLID paint color must not include a`);
}
function count(t) { counts[t] = (counts[t] || 0) + 1; }

class Node {
  constructor(type) {
    this.id = nid(); this.type = type; this.name = type; this.parent = null;
    if (CONTAINERS.has(type)) this.children = [];
    this.visible = true; this.fills = []; this.strokes = []; this.x = 0; this.y = 0;
    this.width = 100; this.height = 100; this._layoutMode = 'NONE'; this._refs = null; this.opacity = 1;
    this.effects = []; this.boundVariables = {}; count(type);
  }
  get layoutMode() { return this._layoutMode; }
  set layoutMode(v) { if (!['NONE', 'HORIZONTAL', 'VERTICAL'].includes(v)) fail('bad layoutMode ' + v); this._layoutMode = v; }
  set layoutWrap(v) { if (v === 'WRAP' && this._layoutMode !== 'HORIZONTAL') fail(`${this.name}: layoutWrap WRAP needs HORIZONTAL`); this._wrap = v; }
  get layoutWrap() { return this._wrap || 'NO_WRAP'; }
  _checkSizing(v, axis) {
    if (!['FIXED', 'HUG', 'FILL'].includes(v)) fail('bad sizing ' + v);
    if (v === 'FILL' && !(this.parent && this.parent.layoutMode && this.parent.layoutMode !== 'NONE'))
      fail(`${this.name}: FILL ${axis} needs an auto-layout parent (parent=${this.parent ? this.parent.name + '/' + this.parent.layoutMode : 'none'})`);
    if (v === 'HUG' && this._layoutMode === 'NONE' && this.type !== 'TEXT' && this.type !== 'INSTANCE')
      fail(`${this.name}: HUG ${axis} needs auto layout or text`);
  }
  set layoutSizingHorizontal(v) { this._checkSizing(v, 'horizontal'); this._lsh = v; }
  get layoutSizingHorizontal() { return this._lsh || 'FIXED'; }
  set layoutSizingVertical(v) { this._checkSizing(v, 'vertical'); this._lsv = v; }
  get layoutSizingVertical() { return this._lsv || 'FIXED'; }
  set layoutPositioning(v) { if (v === 'ABSOLUTE' && !(this.parent && this.parent.layoutMode !== 'NONE')) fail('ABSOLUTE needs AL parent'); this._lp = v; }
  get layoutPositioning() { return this._lp || 'AUTO'; }
  set cornerRadius(v) { if (typeof v !== 'number') fail('cornerRadius number'); this._cr = v; }
  get cornerRadius() { return this._cr || 0; }

  inInstance() { let p = this.parent; while (p) { if (p.type === 'INSTANCE') return true; p = p.parent; } return false; }
  appendChild(c) {
    if (!this.children) fail(`${this.type} cannot have children`);
    if (this.type === 'INSTANCE' || this.inInstance()) fail(`cannot append into an instance (${this.name})`);
    if (c.type === 'PAGE') fail('cannot append a page');
    if (c.parent) c.parent.children.splice(c.parent.children.indexOf(c), 1);
    c.parent = this; this.children.push(c);
  }
  insertChild(i, c) { this.appendChild(c); this.children.splice(this.children.indexOf(c), 1); this.children.splice(i, 0, c); }
  remove() { if (this.type === 'PAGE' && this === current) fail('cannot remove current page'); if (this.parent) this.parent.children.splice(this.parent.children.indexOf(this), 1); this.parent = null; this._removed = true; }
  resize(w, h) { if (!(w > 0 && h > 0)) fail(`${this.name}: resize(${w},${h})`); this.width = w; this.height = h; }
  findAll(fn) { const out = []; const walk = (n) => { for (const c of n.children || []) { if (!fn || fn(c)) out.push(c); walk(c); } }; walk(this); return out; }
  findOne(fn) { return this.findAll(fn)[0] || null; }
  findAllWithCriteria(c) { return this.findAll((n) => !c.types || c.types.includes(n.type)); }
  async loadAsync() {}
  set fills(v) { checkPaints(this, v); this._fills = v; }
  get fills() { return this._fills || []; }
  set strokes(v) { checkPaints(this, v); this._strokes = v; }
  get strokes() { return this._strokes || []; }
  setBoundVariable(field, v) {
    if (!BINDABLE.has(field)) fail(`${this.name}: field ${field} not bindable`);
    if (!v || !variables.has(v.id)) fail(`${this.name}: bind ${field} to non-variable`);
    if (v.resolvedType !== 'FLOAT') fail(`${this.name}: bind ${field} to ${v.resolvedType}`);
    this.boundVariables[field] = { type: 'VARIABLE_ALIAS', id: v.id };
  }
  setExplicitVariableModeForCollection(col, mode) {
    if (!col || typeof col !== 'object') fail('explicit mode: pass the collection object');
    if (!col.modes.some((m) => m.modeId === mode)) fail('explicit mode: unknown mode');
    this._explicit = mode;
  }
  setTextStyleIdAsync(id) { if (!styles.has(id)) fail('unknown text style ' + id); if (this.type !== 'TEXT') fail('text style on ' + this.type); return Promise.resolve(); }
  setEffectStyleIdAsync(id) { if (!styles.has(id)) fail('unknown effect style ' + id); return Promise.resolve(); }
  set componentPropertyReferences(refs) {
    if (this.inInstance()) fail(`${this.name}: refs inside an instance`);
    let owner = this.parent; while (owner && owner.type !== 'COMPONENT') owner = owner.parent;
    if (!owner) fail(`${this.name}: refs outside a component`);
    const defs = owner.parent && owner.parent.type === 'COMPONENT_SET' ? owner.parent._defs : owner._defs;
    for (const [field, key] of Object.entries(refs)) {
      if (!['characters', 'visible', 'mainComponent'].includes(field)) fail('bad ref field ' + field);
      const d = defs && defs[key]; if (!d) fail(`${this.name}: unknown property key ${key}`);
      const want = { characters: 'TEXT', visible: 'BOOLEAN', mainComponent: 'INSTANCE_SWAP' }[field];
      if (d.type !== want) fail(`${this.name}: ${field} bound to ${d.type}`);
      if (field === 'characters' && this.type !== 'TEXT') fail(`${this.name}: characters ref on ${this.type}`);
      if (field === 'mainComponent' && this.type !== 'INSTANCE') fail(`${this.name}: mainComponent ref on ${this.type}`);
    }
    this._refs = refs;
  }
  get componentPropertyReferences() { return this._refs; }
  clone() { const n = this._copy(); if (this.parent && !this.parent._removed) { this.parent.children.push(n); n.parent = this.parent; } return n; }
  _copy() {
    const n = Object.create(Object.getPrototypeOf(this));
    for (const k of Object.keys(this)) n[k] = this[k];
    n.id = nid(); n.parent = null; count(this.type);
    if (this.children) { n.children = []; for (const c of this.children) { const cc = c._copy(); cc.parent = n; n.children.push(cc); } }
    nodeById.set(n.id, n);
    return n;
  }
}

class TextNode extends Node {
  constructor() { super('TEXT'); this._font = { family: 'Inter', style: 'Regular' }; this._chars = ''; this.fontSize = 12; }
  set fontName(f) { if (!f || !f.family) fail('fontName'); this._font = f; }
  get fontName() { return this._font; }
  set characters(s) {
    if (!loaded.has(fontKey(this._font))) fail(`characters with unloaded font ${fontKey(this._font)} on "${this.name}"`);
    if (typeof s !== 'string') fail('characters must be string');
    this._chars = s; this.width = Math.max(1, s.length * (this.fontSize || 12) * 0.55); this.height = (this.fontSize || 12) * 1.4;
  }
  get characters() { return this._chars; }
  setRangeFontName(a, b, f) { if (!loaded.has(fontKey(f))) fail('range font not loaded'); if (a < 0 || b > this._chars.length) fail('range'); }
  setRangeFills(a, b, p) { if (a < 0 || b > this._chars.length) fail('range'); }
}

function parseVariantName(name) {
  const props = {};
  for (const part of name.split(',')) { const [k, v] = part.split('=').map((s) => s.trim()); if (!k || v === undefined) fail('bad variant name ' + name); props[k] = v; }
  return props;
}
class ComponentNode extends Node {
  constructor() { super('COMPONENT'); this._defs = {}; this.description = ''; this.key = 'k' + this.id; }
  addComponentProperty(name, type, def) {
    if (this.parent && this.parent.type === 'COMPONENT_SET') fail('addComponentProperty on a variant; add it to the set');
    return addProp(this, name, type, def);
  }
  get variantProperties() { return this.parent && this.parent.type === 'COMPONENT_SET' ? parseVariantName(this.name) : null; }
  createInstance() { return makeInstance(this); }
}
function addProp(owner, name, type, def) {
  if (!['TEXT', 'BOOLEAN', 'INSTANCE_SWAP'].includes(type)) fail('prop type ' + type);
  if (type === 'TEXT' && typeof def !== 'string') fail(`TEXT default for ${name} must be string`);
  if (type === 'BOOLEAN' && typeof def !== 'boolean') fail('BOOLEAN default');
  if (type === 'INSTANCE_SWAP' && !(nodeById.get(def) && nodeById.get(def).type === 'COMPONENT')) fail('INSTANCE_SWAP default must be a component id');
  for (const k of Object.keys(owner._defs)) if (k.split('#')[0] === name) fail(`duplicate property ${name} on ${owner.name}`);
  const key = `${name}#${nid()}`;
  owner._defs[key] = { type, defaultValue: def };
  return key;
}
class ComponentSetNode extends Node {
  constructor() { super('COMPONENT_SET'); this._defs = {}; this.description = ''; }
  addComponentProperty(name, type, def) { return addProp(this, name, type, def); }
  get defaultVariant() { return this.children[0]; }
  get componentPropertyDefinitions() { return this._defs; }
}
const nodeById = new Map();
function reg(n) { nodeById.set(n.id, n); return n; }

function instChildren(inst, comp) {
  inst.children = [];
  for (const c of comp.children) { const cc = c._copy(); cc.parent = inst; inst.children.push(cc); }
}
class InstanceNode extends Node {
  constructor() { super('INSTANCE'); this._values = {}; }
  get componentProperties() { return instProps(this); }
  setProperties(obj) { return setInstProps(this, obj); }
  resetOverrides() { this._values = {}; instChildren(this, this.mainComponent); }
  async getMainComponentAsync() { return this.mainComponent; }
  swapComponent(comp) { if (!comp || comp.type !== 'COMPONENT') fail('swapComponent needs a component'); this.mainComponent = comp; this._values = {}; instChildren(this, comp); }
  _copy() { const n = super._copy(); n._values = Object.assign({}, this._values); return n; }
}
function makeInstance(comp) {
  const i = reg(new InstanceNode());
  i.name = comp.name; i.mainComponent = comp; i.width = comp.width; i.height = comp.height; i._layoutMode = comp.layoutMode;
  instChildren(i, comp);
  return i;
}
function defsOf(comp) { return comp.parent && comp.parent.type === 'COMPONENT_SET' ? comp.parent._defs : comp._defs; }
function instProps(i) {
  const comp = i.mainComponent, out = {};
  for (const [k, d] of Object.entries(defsOf(comp))) out[k] = { type: d.type, value: k in i._values ? i._values[k] : d.defaultValue };
  const vp = comp.variantProperties;
  if (vp) for (const [k, v] of Object.entries(vp)) out[k] = { type: 'VARIANT', value: v };
  return out;
}
function setInstProps(i, obj) {
  const props = instProps(i);
  for (const [k, v] of Object.entries(obj)) {
    const p = props[k]; if (!p) fail(`setProperties: no property ${k} on ${i.name}`);
    if (p.type === 'VARIANT') {
      const set = i.mainComponent.parent; const want = Object.assign({}, i.mainComponent.variantProperties, { [k]: v });
      const target = set.children.find((c) => Object.entries(want).every(([a, b]) => c.variantProperties[a] === b));
      if (!target) fail(`setProperties: no variant ${JSON.stringify(want)} in ${set.name}`);
      i.mainComponent = target; instChildren(i, target);
    } else if (p.type === 'TEXT') {
      if (typeof v !== 'string') fail('TEXT value');
      i._values[k] = v;
      for (const n of i.findAll((n) => n._refs && n._refs.characters === k)) n.characters = v;
    } else if (p.type === 'BOOLEAN') {
      if (typeof v !== 'boolean') fail('BOOLEAN value'); i._values[k] = v;
    } else if (p.type === 'INSTANCE_SWAP') {
      const c = nodeById.get(v); if (!c || c.type !== 'COMPONENT') fail('INSTANCE_SWAP value must be component id');
      i._values[k] = v;
      for (const n of i.findAll((n) => n._refs && n._refs.mainComponent === k)) { n.mainComponent = c; n.name = c.name; instChildren(n, c); }
    }
  }
}

function page(name) { const p = reg(new Node('PAGE')); p.name = name; return p; }
const root = { children: [], type: 'DOCUMENT' };
let current = page('Page 1'); root.children.push(current); current.parent = root;
function resetPage() { current = root.children[0]; }

const AVAILABLE = [
  ['Inter', ['Regular', 'Medium', 'Semi Bold', 'Bold']],
  ['Fraunces', ['9pt Regular', '72pt Regular', '72pt Italic', '72pt Medium', '72pt SemiBold', '9pt Italic', 'Regular', 'Italic', 'Medium']],
  ['Outfit', ['Light', 'Regular', 'Medium', 'SemiBold']],
  ['DM Mono', ['Regular', 'Medium', 'Light']]
].flatMap(([family, st]) => st.map((style) => ({ fontName: { family, style } })));

function mk(type) {
  const n = reg(type === 'TEXT' ? new TextNode() : type === 'COMPONENT' ? new ComponentNode() : type === 'COMPONENT_SET' ? new ComponentSetNode() : new Node(type));
  current.appendChild(n); return n;
}

const figma = {
  root,
  get currentPage() { return current; },
  async setCurrentPageAsync(p) { if (p.type !== 'PAGE') fail('not a page'); current = p; },
  createFrame: () => { const f = mk('FRAME'); f.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }]; return f; },
  createComponent: () => mk('COMPONENT'),
  createText: () => mk('TEXT'),
  createRectangle: () => mk('RECTANGLE'),
  createEllipse: () => mk('ELLIPSE'),
  createPage: () => { const p = page('Page'); root.children.push(p); p.parent = root; return p; },
  createNodeFromSvg(svg) {
    if (!/^<svg[\s\S]*<\/svg>$/.test(svg)) fail('bad svg');
    const f = mk('FRAME'); f.resize(24, 24); f.fills = [];
    const shapes = svg.match(/<(path|circle|rect)\b[^>]*\/>/g) || [];
    if (!shapes.length) fail('svg without shapes');
    for (const s of shapes) { const v = reg(new Node('VECTOR')); v.strokes = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }]; f.appendChild(v); }
    return f;
  },
  createComponentFromNode(node) {
    const c = mk('COMPONENT'); c.width = node.width; c.height = node.height;
    for (const ch of [...node.children]) c.appendChild(ch);
    node.remove(); return c;
  },
  combineAsVariants(nodes, parent) {
    if (!nodes.length) fail('combine: empty');
    const seen = new Set();
    for (const n of nodes) {
      if (n.type !== 'COMPONENT') fail('combine: not a component');
      parseVariantName(n.name);
      if (seen.has(n.name)) fail('combine: duplicate variant ' + n.name); seen.add(n.name);
    }
    const keys = JSON.stringify(Object.keys(parseVariantName(nodes[0].name)).sort());
    for (const n of nodes) if (JSON.stringify(Object.keys(parseVariantName(n.name)).sort()) !== keys) fail('combine: inconsistent variant keys ' + n.name);
    const s = reg(new ComponentSetNode()); parent.appendChild(s);
    for (const n of nodes) { if (Object.keys(n._defs).length) fail('combine: component already has properties'); s.appendChild(n); }
    return s;
  },
  createTextStyle: () => { const s = { id: 'S:t' + nid(), type: 'TEXT', remove() { styles.delete(this.id); } }; styles.set(s.id, s); return s; },
  createEffectStyle: () => { const s = { id: 'S:e' + nid(), type: 'EFFECT', remove() { styles.delete(this.id); } }; styles.set(s.id, s); return s; },
  getLocalTextStylesAsync: async () => [...styles.values()].filter((s) => s.type === 'TEXT'),
  getLocalEffectStylesAsync: async () => [...styles.values()].filter((s) => s.type === 'EFFECT'),
  listAvailableFontsAsync: async () => AVAILABLE,
  loadFontAsync: async (f) => { if (!AVAILABLE.some((a) => a.fontName.family === f.family && a.fontName.style === f.style)) throw new Error('font not available ' + fontKey(f)); loaded.add(fontKey(f)); },
  notify: (m) => console.log('[notify]', m),
  closePlugin: (m) => { figma._closed = m; console.log('[closePlugin]', m); },
  viewport: { scrollAndZoomIntoView: () => {} },
  variables: {
    createVariableCollection(name) {
      const col = { id: 'VC:' + nid(), name, modes: [{ modeId: 'm' + nid(), name: 'Mode 1' }],
        renameMode(id, n) { const m = this.modes.find((x) => x.modeId === id); if (!m) fail('renameMode'); m.name = n; },
        addMode(n) { const id = 'm' + nid(); this.modes.push({ modeId: id, name: n }); return id; },
        remove() { collections.splice(collections.indexOf(this), 1); } };
      collections.push(col); return col;
    },
    async getLocalVariableCollectionsAsync() { return [...collections]; },
    async getLocalVariablesAsync() { return [...variables.values()].filter((v) => collections.includes(v._col)).map((v) => { v.variableCollectionId = v._col.id; return v; }); },
    createVariable(name, col, type) {
      if (typeof col !== 'object') fail('createVariable: pass the collection object');
      for (const v of variables.values()) if (v._col === col && v.name === name) fail('duplicate variable ' + name);
      if (!/^[^.{}]+$/.test(name)) fail('bad variable name ' + name);
      const v = { id: 'V:' + nid(), name, resolvedType: type, _col: col, values: {}, description: '', scopes: ['ALL_SCOPES'],
        setValueForMode(m, val) {
          if (!col.modes.some((x) => x.modeId === m)) fail('setValueForMode: mode not in collection');
          if (type === 'COLOR' && !(val && 'r' in val && 'a' in val)) fail('COLOR value needs r,g,b,a');
          if (type === 'FLOAT' && typeof val !== 'number') fail('FLOAT value');
          this.values[m] = val;
        } };
      variables.set(v.id, v); return v;
    },
    setBoundVariableForPaint(paint, field, v) {
      if (field !== 'color') fail('paint field'); if (!v || v.resolvedType !== 'COLOR') fail('paint bound to non-color variable');
      return Object.assign({}, paint, { boundVariables: { color: { type: 'VARIABLE_ALIAS', id: v.id } } });
    }
  }
};

module.exports = { figma, counts, warnings, root, styles, variables, collections, resetPage };
