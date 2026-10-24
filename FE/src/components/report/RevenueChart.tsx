import { type FC, useLayoutEffect, useRef, useState } from 'react';

import { compactMoney, monthLabel, niceTicks } from './reportFormat';

import type { RevenueReport } from '@/interfaces';

const HEIGHT = 240;
const LEFT = 52;
const RIGHT = 8;
const TOP = 16;
const BOTTOM = 28;
const BAR_GAP = 2;
const RADIUS = 4;

/** A bar with a 4 px rounded top, anchored to the baseline (dataviz, marks). */
const barPath = (x: number, y: number, w: number, h: number) => {
  const r = Math.min(RADIUS, w / 2, h);
  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`;
};

/**
 * Revenue and direct cost by month (US-R-02, DESIGN.md: chart-1 blue, chart-2 terracotta): one axis, grouped bars
 * with a 2 px gap, the latest revenue labelled, and a tooltip per month. The corridor table beside it is its table
 * view.
 */
export const RevenueChart: FC<{ months: RevenueReport['months'] }> = ({ months }) => {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [hover, setHover] = useState<number | null>(null);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.max(320, entry.contentRect.width)),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const max = Math.max(0, ...months.flatMap((m) => [m.revenue, m.cost]));
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1];
  const plotH = HEIGHT - TOP - BOTTOM;
  const y = (v: number) => TOP + plotH - (Math.max(0, v) / top) * plotH;
  const slot = (width - LEFT - RIGHT) / Math.max(1, months.length);
  const barW = Math.min(28, (slot - 16) / 2);
  const latest = months.length - 1;
  const shown = hover === null ? null : months[hover];

  return (
    <div ref={box} className="relative w-full">
      <svg
        width={width}
        height={HEIGHT}
        role="img"
        aria-label={`Revenue and direct cost by month, ${months.length} months`}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={LEFT - 4}
              x2={width - RIGHT}
              y1={y(t)}
              y2={y(t)}
              className={t === 0 ? 'stroke-line-strong' : 'stroke-line'}
              strokeWidth={1}
            />
            <text x={0} y={y(t) + 4} className="fill-ink-3 font-mono text-[11px]">
              {compactMoney(t)}
            </text>
          </g>
        ))}
        {months.map((m, i) => {
          const cx = LEFT + slot * i + slot / 2;
          const revH = TOP + plotH - y(m.revenue);
          const costH = TOP + plotH - y(m.cost);
          return (
            <g key={m.month}>
              {revH > 0 && (
                <path
                  d={barPath(cx - barW - BAR_GAP / 2, y(m.revenue), barW, revH)}
                  className="fill-chart-1"
                  opacity={hover === null || hover === i ? 1 : 0.45}
                />
              )}
              {costH > 0 && (
                <path
                  d={barPath(cx + BAR_GAP / 2, y(m.cost), barW, costH)}
                  className="fill-chart-2"
                  opacity={hover === null || hover === i ? 1 : 0.45}
                />
              )}
              <text
                x={cx}
                y={HEIGHT - 8}
                textAnchor="middle"
                className="fill-ink-3 font-mono text-[11px]"
              >
                {monthLabel(m.month)}
              </text>
              {i === latest && m.revenue > 0 && (
                <text
                  x={cx - barW / 2 - BAR_GAP / 2}
                  y={y(m.revenue) - 6}
                  textAnchor="middle"
                  className="fill-ink text-[12px] font-medium"
                >
                  {compactMoney(m.revenue)}
                </text>
              )}
              {/* The hit target is the whole month, larger than the bars. */}
              <rect
                x={cx - slot / 2}
                y={TOP}
                width={slot}
                height={plotH}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              />
            </g>
          );
        })}
      </svg>
      {shown && hover !== null && (
        <div
          role="tooltip"
          className="pointer-events-none absolute top-2 z-10 min-w-[180px] rounded-md border border-line bg-raised px-3 py-2 shadow-sm"
          style={{
            left: Math.min(width - 196, Math.max(0, LEFT + slot * hover + slot / 2 - 90)),
          }}
        >
          <p className="type-label-s m-0 text-ink">{monthLabel(shown.month, true)}</p>
          <p className="type-caption m-0 mt-1 text-ink-3">
            {shown.jobs} {shown.jobs === 1 ? 'job' : 'jobs'} settled
          </p>
          <dl className="m-0 mt-1.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
            <dt className="type-caption flex items-center gap-1.5 text-ink-2">
              <span className="inline-block size-2 rounded-[2px] bg-chart-1" />
              Revenue
            </dt>
            <dd className="type-data m-0 text-right text-ink">{compactMoney(shown.revenue)}</dd>
            <dt className="type-caption flex items-center gap-1.5 text-ink-2">
              <span className="inline-block size-2 rounded-[2px] bg-chart-2" />
              Direct cost
            </dt>
            <dd className="type-data m-0 text-right text-ink">{compactMoney(shown.cost)}</dd>
            <dt className="type-caption text-ink-2">Margin</dt>
            <dd className="type-data m-0 text-right text-ink">
              {shown.revenue > 0
                ? `${(((shown.revenue - shown.cost) / shown.revenue) * 100).toFixed(1)}%`
                : '—'}
            </dd>
          </dl>
        </div>
      )}
    </div>
  );
};
