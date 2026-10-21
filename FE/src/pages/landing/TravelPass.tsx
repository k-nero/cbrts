import type { FC } from 'react';

import { PassEnd } from './PassEnd';

import { Chip, cx, Icon, Perforation } from '@/components/ui';

/*
 * The landing page's pictures (docs/figma-plugin/src/03-pages.js, travelPass and the feature
 * visuals). They show the rules at work on an example, never a real customer, horse or job
 * (PRODUCT.md, Absences).
 */

/* The document dates worked out for the example route and departure (RULES_EXAMPLE). */
const PASS_DOCUMENTS: [string, string][] = [
  ['Equine passport', 'Valid through 20 Oct'],
  ['Influenza vaccination', '21 Apr–11 Oct'],
  ['EIA (Coggins) test', 'On or after 19 Aug'],
  ['Export health certificate', '8–18 Oct'],
  ['Proof of ownership', 'Any date'],
];

/* [label, value, mono] in reading order, two to a row */
const PASS_FACTS: [string, string, boolean][][] = [
  [
    ['Departs', '18 Oct · 06:00', true],
    ['Border', 'Mộc Bài – Bavet', false],
  ],
  [
    ['Horses', '4 · private trailer', false],
    ['Arrival window', '11:00–14:00', true],
  ],
];

/* The stub's code: decoration, labelled Example only. */
const CODE_BARS = [2, 1, 3, 1, 1, 2, 1, 3, 2, 1, 1, 2, 3, 1, 2, 1, 2];

/**
 * What a club holds once a move is approved: the route, the facts that matter, the date each
 * document must carry, and a stub that says the gate is open. Labelled Example; it names no horse
 * or club.
 */
export const TravelPass: FC = () => (
  <aside
    aria-label="Example travel pass: Ho Chi Minh City to Phnom Penh"
    className="flex w-[520px] shrink-0 overflow-hidden rounded-xl bg-card shadow-overlay"
  >
    <div className="flex min-w-0 flex-1 flex-col gap-[18px] py-6 pr-6 pl-7">
      <div className="flex items-center justify-between">
        <span className="type-label-s text-ink-3">Travel pass</span>
        <Chip dot={false}>Example</Chip>
      </div>
      <div className="flex items-center gap-3.5">
        <PassEnd code="HCM" city="Ho Chi Minh City" />
        <span className="flex flex-1 items-center gap-2 pb-[18px]" aria-hidden>
          <span className="h-px flex-1 bg-line-strong" />
          <Icon name="truck" size={18} className="text-ink-2" />
          <span className="h-px flex-1 bg-line-strong" />
        </span>
        <PassEnd code="PNH" city="Phnom Penh" end />
      </div>
      <dl className="m-0 flex flex-col gap-3">
        {PASS_FACTS.map((row) => (
          <div key={row[0][0]} className="grid grid-cols-2 gap-4">
            {row.map(([label, value, mono]) => (
              <div key={label} className="flex flex-col gap-0.5">
                <dt className="type-body-s text-ink-3">{label}</dt>
                <dd className={cx('m-0 text-ink', mono ? 'type-data' : 'type-label-m')}>{value}</dd>
              </div>
            ))}
          </div>
        ))}
      </dl>
      <hr className="m-0 border-0 border-t border-line" />
      <div className="flex flex-col gap-2">
        <span className="type-body-s text-ink-3">Each document must carry</span>
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {PASS_DOCUMENTS.map(([doc, date]) => (
            <li key={doc} className="flex items-center gap-3">
              <span className="type-label-s flex-1 text-ink">{doc}</span>
              <span className="type-caption text-right text-ink-2">{date}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
    <Perforation />
    <div className="flex w-[140px] shrink-0 flex-col justify-between gap-3 bg-sunken px-[18px] py-6">
      <div className="flex flex-col gap-2">
        <span className="grid size-8 place-items-center rounded-full bg-ok-soft text-ok">
          <Icon name="unlock" size={16} />
        </span>
        <span className="type-label-m text-ink">Clear to depart</span>
        <span className="type-body-s text-ink-2">23 of 23 documents cleared</span>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="flex h-9 gap-0.5" aria-hidden>
          {CODE_BARS.map((w, i) => (
            <span key={i} className="h-full bg-ink" style={{ width: w }} />
          ))}
        </span>
        <span className="type-caption text-ink-3">Example only</span>
      </div>
    </div>
  </aside>
);
