// Runs mcp/NN-*.js in order against one mock "file", each in a fresh async function (no shared JS state).
'use strict';
const fs = require('fs');
const path = require('path');
const mock = require('./mock-figma.js');
globalThis.figma = mock.figma;
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const dir = path.join(__dirname, '..', 'mcp');
const warns = [];
console.warn = (...a) => warns.push(a.join(' '));
(async () => {
  for (const f of fs.readdirSync(dir).filter((f) => /^\d\d-.*\.js$/.test(f)).sort()) {
    mock.resetPage();
    delete globalThis.__EF;
    const out = await new AsyncFunction(fs.readFileSync(path.join(dir, f), 'utf8'))();
    const s = JSON.stringify(out);
    console.log(`${f}: ${s.length > 300 ? s.slice(0, 300) + '…' : s}`);
    // a frame the canvas can't file is either a new screen missing from CANVAS or a node a builder made and never used
    if (out && out.loose && out.loose.length) { console.error('FAILED: loose frames on the canvas: ' + out.loose.join(', ')); process.exit(1); }
  }
  console.log('\npages:', mock.root.children.map((p) => `${p.name} (${p.children.length})`).join(', '));
  console.log('node counts:', JSON.stringify(mock.counts));
  if (warns.length) { console.log('\nwarnings:'); [...new Set(warns)].slice(0, 30).forEach((w) => console.log('  ' + w)); process.exit(1); }
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
