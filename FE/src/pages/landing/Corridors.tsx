import { Flex } from 'antd';
import type { FC } from 'react';

import { cx } from '@/components/ui';

const CORRIDORS: [string, string][] = [
  ['Ho Chi Minh City → Phnom Penh', 'Road · Mộc Bài – Bavet'],
  ['Phnom Penh → Bangkok', 'Road · Poipet – Aranyaprathet'],
  ['Bangkok → Vientiane', 'Road · Nong Khai – Vientiane'],
  ['Bangkok → Kuala Lumpur', 'Road · Sadao – Bukit Kayu Hitam'],
  ['Hanoi → Vientiane', 'Road · Cầu Treo – Nam Phao'],
  ['Ho Chi Minh City, Phnom Penh → Hong Kong', 'Air · Economy, Business, First stalls'],
];

/** The map's key: each corridor with its line, solid for road and dashed for air. */
export const Corridors: FC = () => (
  <section
    aria-labelledby="corridors-title"
    className="min-w-0 flex-1 rounded-lg border border-line bg-card px-6 pt-5 pb-3"
  >
    <header className="pb-3.5">
      <Flex vertical gap={4}>
        <h3 id="corridors-title" className="type-h4 m-0 text-ink">
          Corridors we run
        </h3>
        <p className="type-body-s m-0 max-w-[360px] text-ink-3">
          Each road corridor crosses at one border post. Air goes through Hong Kong.
        </p>
      </Flex>
    </header>
    <ul className="m-0 list-none p-0">
      {CORRIDORS.map(([route, how]) => {
        const air = how.startsWith('Air');
        return (
          <li key={route} className="border-t border-line py-2.5">
            <Flex align="center" gap={12}>
              <Flex component="span" align="center" className="h-3 w-7 shrink-0" aria-hidden>
                <span
                  className={cx('w-full', air ? 'h-0.5' : 'h-[3px] bg-ink')}
                  style={
                    air
                      ? {
                          background:
                            'repeating-linear-gradient(to right, var(--color-ink-3) 0 6px, transparent 6px 12px)',
                        }
                      : undefined
                  }
                />
              </Flex>
              <Flex component="span" vertical gap={2} className="min-w-0">
                <span className="type-label-s text-ink">{route}</span>
                <span className="type-body-s text-ink-3">{how}</span>
              </Flex>
            </Flex>
          </li>
        );
      })}
    </ul>
  </section>
);
