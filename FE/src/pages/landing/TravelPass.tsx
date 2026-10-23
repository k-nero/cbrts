import { Col, Flex, Row } from 'antd';
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
  <Flex
    component="aside"
    aria-label="Example travel pass: Ho Chi Minh City to Phnom Penh"
    className="w-[520px] shrink-0 overflow-hidden rounded-xl bg-card shadow-overlay"
  >
    <div className="min-w-0 flex-1 py-6 pr-6 pl-7">
      <Flex vertical gap={18}>
        <Flex align="center" justify="space-between">
          <span className="type-label-s text-ink-3">Travel pass</span>
          <Chip dot={false}>Example</Chip>
        </Flex>
        <Flex align="center" gap={14}>
          <PassEnd code="HCM" city="Ho Chi Minh City" />
          <span className="flex-1 pb-[18px]" aria-hidden>
            <Flex component="span" align="center" gap={8}>
              <span className="h-px flex-1 bg-line-strong" />
              <Icon name="truck" size={18} className="text-ink-2" />
              <span className="h-px flex-1 bg-line-strong" />
            </Flex>
          </span>
          <PassEnd code="PNH" city="Phnom Penh" end />
        </Flex>
        <Flex component="dl" vertical gap={12}>
          {PASS_FACTS.map((row) => (
            <Row key={row[0][0]} gutter={[16, 16]}>
              {row.map(([label, value, mono]) => (
                <Col key={label} span={12}>
                  <Flex vertical gap={2}>
                    <dt className="type-body-s text-ink-3">{label}</dt>
                    <dd className={cx('m-0 text-ink', mono ? 'type-data' : 'type-label-m')}>
                      {value}
                    </dd>
                  </Flex>
                </Col>
              ))}
            </Row>
          ))}
        </Flex>
        <hr className="m-0 border-0 border-t border-line" />
        <Flex vertical gap={8}>
          <span className="type-body-s text-ink-3">Each document must carry</span>
          <Flex component="ul" vertical gap={8} className="list-none">
            {PASS_DOCUMENTS.map(([doc, date]) => (
              <Flex key={doc} component="li" align="center" gap={12}>
                <span className="type-label-s flex-1 text-ink">{doc}</span>
                <span className="type-caption text-right text-ink-2">{date}</span>
              </Flex>
            ))}
          </Flex>
        </Flex>
      </Flex>
    </div>
    <Perforation />
    <div className="w-[140px] shrink-0 bg-sunken px-[18px] py-6">
      <Flex vertical justify="space-between" gap={12} className="h-full">
        <Flex vertical gap={8}>
          <Flex
            component="span"
            align="center"
            justify="center"
            className="size-8 rounded-full bg-ok-soft text-ok"
          >
            <Icon name="unlock" size={16} />
          </Flex>
          <span className="type-label-m text-ink">Clear to depart</span>
          <span className="type-body-s text-ink-2">23 of 23 documents cleared</span>
        </Flex>
        <Flex vertical gap={6}>
          <Flex component="span" gap={2} className="h-9" aria-hidden>
            {CODE_BARS.map((w, i) => (
              <span key={i} className="h-full bg-ink" style={{ width: w }} />
            ))}
          </Flex>
          <span className="type-caption text-ink-3">Example only</span>
        </Flex>
      </Flex>
    </div>
  </Flex>
);
