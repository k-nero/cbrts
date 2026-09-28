// Cross-frame consistency: the demo data is evidence, so counts, times and codes
// that appear on several screens must agree. Loads the source fixtures (no Figma
// needed) and fails the build on any disagreement.
'use strict';
const fs = require('fs');
const path = require('path');
const src = path.join(__dirname, '..', 'src');
const files = fs.readdirSync(src).filter((f) => /^\d\d-.*\.js$/.test(f) && !/^0[49]-/.test(f)).sort();
const code = files.map((f) => fs.readFileSync(path.join(src, f), 'utf8')).join('\n');
const data = new Function(code + '\nreturn { CHECKLIST, ALL_DOCS, TRIP_LOG, tripLogSummary, tripLogUntil, INC36, INC40, NOW40, toMin, durText, arrivesLate, unloadBy, dahDocs, CLEARANCE_041, HORSES, QUOTE, quoteTotals, money };')();

const errors = [];
const expect = (ok, msg) => { if (!ok) errors.push(msg); };
const mins = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

// 1. CBRT-2026-041 checklist: 23 items, 14 cleared; the customer list says the same
const items = data.CHECKLIST.flatMap((g) => g[3]);
expect(items.length === 23, `checklist has ${items.length} items, expected 23`);
expect(items.filter((d) => d[1] === 'Cleared').length === 14, 'checklist cleared count is not 14');
const rows = data.ALL_DOCS.flatMap((g) => g[2]);
expect(rows.length === items.length, `All documents lists ${rows.length} rows, checklist has ${items.length}`);
expect(rows.filter((d) => d[2] === 'Ok').length === 14, 'All documents cleared count is not 14');
expect(rows.filter((d) => d[4] === 'You').length === 4, 'All documents "with you" count is not 4');
expect(rows.filter((d) => /authority|GDAHP/.test(d[4])).length === 5, 'All documents "with the authorities" count is not 5');

// 2. the 18 Oct trip log is in time order and every count derives from it
const times = data.TRIP_LOG.map((r) => r[0]);
expect(times.every((t, i) => i === 0 || t >= times[i - 1]), 'trip log is not in time order');
expect(data.tripLogSummary('12:48') === `${data.TRIP_LOG.length} records, ${times[0]} – 12:48`, 'delivery summary does not match the log');

// 2b. at handover the log shows only saved records; the handover being recorded is the last one
expect(data.tripLogUntil('12:41').length === data.TRIP_LOG.length - 1, 'delivery log should count every record before the handover');

// 3. the CBRT-2026-036 report: reply due 2 hours after it arrives, and the countdown agrees
const I = data.INC36;
expect(mins(I.due) - mins(I.reported) === 120, `reply due ${I.due} is not 2 hours after ${I.reported}`);
expect(mins(I.draft) < mins(I.reported), 'the customer form is drawn after the report was sent');
const left = mins(I.due) - mins(I.now);
expect(I.left === `${Math.floor(left / 60)} h ${left % 60} min`, `countdown "${I.left}" does not match ${I.now} → ${I.due}`);

expect(mins(I.opened) <= mins(I.notified) && mins(I.notified) <= mins(I.vet) && mins(I.vet) <= mins(I.now), 'CBRT-2026-036 next steps are not between the incident opening and now');

// 3b. the CBRT-2026-040 hold: the escort's record is quoted verbatim from one fixture, and every delay derives from the plan
const src40 = files.map((f) => fs.readFileSync(path.join(src, f), 'utf8')).join('\n');
expect((src40.match(/parked in the Bavet exit lane/gi) || []).length === 1, 'the 08:12 record is written out more than once; quote INC40.record');
expect(data.arrivesLate('19:30') === 'About 19:30 · 6 h late', `waiting reads "${data.arrivesLate('19:30')}"`);
expect(data.arrivesLate('15:40') === 'About 15:40 · 2 h 10 min late', `re-route reads "${data.arrivesLate('15:40')}"`);
expect(data.unloadBy() === '11:30', `unload by ${data.unloadBy()}, expected 11:30`);
expect(mins(data.NOW40) > mins(data.INC40.held), 'the staff view of the hold is earlier than the hold');

// 3c. CBRT-2026-041 clearance: one date and one dossier count everywhere
const rowsH = data.ALL_DOCS.filter((g) => g[0] !== 'Shipment').flatMap((g) => g[2]).filter((d) => d[0] !== 'Export health certificate');
expect(data.dahDocs().startsWith(rowsH.length + ' customer documents'), 'the Animal Health dossier count does not match the checklist');
expect(!/customer documents, including/.test(src40), 'a dossier count is written by hand; use dahDocs()');
expect(!/(file|filing is|filing is planned for) (on )?14 Oct/.test(src40), 'a filing on 14 Oct is mentioned, but customs was filed on 26 Sep; clearance is ' + data.CLEARANCE_041);

// 4. every microchip on any screen belongs to a known horse
const chips = new Set(data.HORSES.map((h) => h.chip).concat(['250 259 600 441 087'])); // + Langbiang Star (first run)
for (const f of files) {
  const text = fs.readFileSync(path.join(src, f), 'utf8');
  for (const m of text.matchAll(/\b\d{3} \d{3} \d{3} \d{3} \d{3}\b/g)) expect(chips.has(m[0]), `${f}: microchip ${m[0]} belongs to no horse`);
}

// 5. quotation Q-2026-0188 v2 totals, quoted on the builder and the customer page
const T = data.quoteTotals(data.QUOTE);
expect(data.money(T.total) === '$38,019.20', `quotation total ${data.money(T.total)}, expected $38,019.20`);
expect(data.money(T.deposit) === '$11,405.76', `deposit ${data.money(T.deposit)}, expected $11,405.76`);

if (errors.length) { console.log('consistency: ' + errors.length + ' problem(s)'); errors.forEach((e) => console.log('  - ' + e)); process.exit(1); }
console.log('consistency: all cross-frame checks pass');
