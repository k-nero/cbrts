// Runs the generator against the mock Figma API: bun test/run.js
'use strict';
const fs = require('fs');
const path = require('path');
const mock = require('./mock-figma.js');

globalThis.figma = mock.figma;
const warns = [];
const origWarn = console.warn;
console.warn = (...a) => { warns.push(a.join(' ')); };

const code = fs.readFileSync(path.join(__dirname, '..', 'code.js'), 'utf8');
if (/\?\.|\?\?|\.\.\.[a-zA-Z{]/.test(code.replace(/\/\/.*$/gm, '').replace(/'[^'\n]*'/g, "''"))) {
  console.error('FAIL: optional chaining / nullish / spread syntax found — not safe for the plugin sandbox');
  process.exit(1);
}

new Function(code)();

const wait = setInterval(() => {
  if (!mock.figma._closed) return;
  clearInterval(wait);
  console.warn = origWarn;
  const ok = !/failed/i.test(mock.figma._closed);
  console.log('\nnode counts:', JSON.stringify(mock.counts));
  console.log('variables:', mock.variables.size, 'collections:', mock.collections.map((c) => c.name + ' [' + c.modes.map((m) => m.name) + ']').join(', '));
  console.log('styles:', mock.styles.size);
  console.log('pages:', mock.root.children.map((p) => `${p.name} (${p.children.length})`).join(', '));
  // an empty hug-sized auto-layout frame keeps Figma's default 100px box and shifts its siblings
  mock.root.children.forEach((p) => p.findAll((n) => n.type === 'FRAME' && n.layoutMode && n.layoutMode !== 'NONE' && n.children.length === 0 && n.layoutSizingHorizontal === 'HUG' && n.layoutSizingVertical === 'HUG')
    .forEach((n) => warns.push(`empty hug frame "${n.name}" in "${n.parent && n.parent.name}"`)));
  if (warns.length) { console.log('\nwarnings (' + warns.length + '):'); [...new Set(warns)].slice(0, 40).forEach((w) => console.log('  ' + w)); }
  process.exit(ok && !warns.length ? 0 : 1);
}, 20);
setTimeout(() => { console.error('timeout: plugin never closed'); process.exit(2); }, 20000);
