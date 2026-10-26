import { Col, Flex, Row } from 'antd';
import { motion } from 'motion/react';
import type { FC } from 'react';

import { EASE_OUT, fade, IN_VIEW, pin, rise, stagger } from '@/lib/motion';
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

/* The pass is issued in order: the card, the truck along its road, each document, then the gate opens. */
const TRUCK_AT = 0.35;
const DOCUMENTS_AT = 0.6;
const DOCUMENT_GAP = 0.07;
const CLEARED_AT = DOCUMENTS_AT + PASS_DOCUMENTS.length * DOCUMENT_GAP + 0.15;

const truck = {
  hidden: { opacity: 0, x: -48 },
  shown: { opacity: 1, x: 0, transition: { delay: TRUCK_AT, duration: 0.9, ease: EASE_OUT } },
};

/**
 * What a club holds once a move is approved: the route, the facts that matter, the date each
 * document must carry, and a stub that says the gate is open. Labelled Example; it names no horse
 * or club.
 */
export const TravelPass: FC = () => (
  <motion.aside
    aria-label="Example travel pass: Ho Chi Minh City to Phnom Penh"
    className="flex w-full max-w-[520px] shrink-0 flex-col overflow-hidden sm:flex-row rounded-xl bg-card shadow-overlay"
    variants={rise}
    initial="hidden"
    whileInView="shown"
    viewport={IN_VIEW}
  >
    <div className="min-w-0 flex-1 px-5 py-6 sm:pr-6 sm:pl-7">
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
              <motion.span variants={truck} className="flex">
                <Icon name="truck" size={18} className="text-ink-2" />
              </motion.span>
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
          <motion.ul
            variants={stagger(DOCUMENT_GAP, DOCUMENTS_AT)}
            className="m-0 flex list-none flex-col gap-2 p-0"
          >
            {PASS_DOCUMENTS.map(([doc, date]) => (
              <motion.li key={doc} variants={fade} className="flex items-center gap-3">
                <span className="type-label-s flex-1 text-ink">{doc}</span>
                <span className="type-caption text-right text-ink-2">{date}</span>
              </motion.li>
            ))}
          </motion.ul>
        </Flex>
      </Flex>
    </div>
    <Perforation className="hidden sm:block" />
    <Perforation direction="horizontal" className="sm:hidden" />
    <div className="shrink-0 bg-sunken px-[18px] py-6 sm:w-[140px]">
      <Flex vertical justify="space-between" gap={12} className="h-full">
        <Flex vertical gap={8}>
          <motion.span
            variants={pin}
            custom={CLEARED_AT}
            className="flex size-8 items-center justify-center rounded-full bg-ok-soft text-ok"
          >
            <Icon name="unlock" size={16} />
          </motion.span>
          <motion.span variants={fade} custom={CLEARED_AT + 0.1} className="type-label-m text-ink">
            Clear to depart
          </motion.span>
          <motion.span
            variants={fade}
            custom={CLEARED_AT + 0.15}
            className="type-body-s text-ink-2"
          >
            23 of 23 documents cleared
          </motion.span>
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
  </motion.aside>
);
