import { type FC, useLayoutEffect, useRef, useState } from 'react';

import type { OnTimeReport } from '@/interfaces';

const HEIGHT = 220;
const LEFT = 44;
const RIGHT = 16;
const TOP = 16;
const BOTTOM = 28;

/** The axis floor: 85% unless a rate or the target sits lower, then a round step below it (0 at the least). */
const floorOf = (rates: number[], target: number) => {
  const low = Math.min(target, ...rates) - 5;
  if (low >= 85) return 85;
  const step = low >= 50 ? 10 : 25;
  return Math.max(0, Math.floor(low / step) * step);
};

/**
 * On-time delivery by week or month (US-R-03, the Figma frame's on-time chart): one line in chart-1 with dots ringed
 * in the card colour, the target as a dashed line, the latest rate labelled, a tooltip per point. A week with no
 * delivery leaves a gap rather than a zero.
 */
export const OnTimeChart: FC<{ report: OnTimeReport }> = ({ report }) => {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(560);
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

  const points = report.buckets;
  const rates = points.flatMap((p) => (p.rate == null ? [] : [Number(p.rate)]));
  const lo = floorOf(rates, Number(report.target));
  // About four gridlines however wide the range: every 5, 10 or 25 points.
  const tickStep = 100 - lo <= 20 ? 5 : 100 - lo <= 50 ? 10 : 25;
  const ticks = Array.from({ length: (100 - lo) / tickStep + 1 }, (_, i) => 100 - i * tickStep)
    .filter((t) => t >= lo)
    .reverse();
  const plotH = HEIGHT - TOP - BOTTOM;
  const y = (v: number) => TOP + plotH - ((v - lo) / (100 - lo)) * plotH;
  const step = (width - LEFT - RIGHT) / Math.max(1, points.length - 1);
  const x = (i: number) => (points.length === 1 ? (LEFT + width - RIGHT) / 2 : LEFT + i * step);

  // Segments between delivered buckets; an empty bucket breaks the line.
  const segments: string[] = [];
  let current = '';
  points.forEach((p, i) => {
    if (p.rate == null) {
      if (current) segments.push(current);
      current = '';
      return;
    }
    current += `${current ? ' L' : 'M'}${x(i).toFixed(1)} ${y(Number(p.rate)).toFixed(1)}`;
  });
  if (current) segments.push(current);
  const latest = points.reduce<number | null>((last, p, i) => (p.rate == null ? last : i), null);
  const shown = hover === null ? null : points[hover];

  return (
    <div ref={box} className="relative w-full">
      <svg width={width} height={HEIGHT} role="img" aria-label="On-time delivery rate by period">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={LEFT - 4} x2={width - RIGHT} y1={y(t)} y2={y(t)} className="stroke-line" />
            <text x={0} y={y(t) + 4} className="fill-ink-3 font-mono text-[11px]">
              {t}%
            </text>
          </g>
        ))}
        <line
          x1={LEFT}
          x2={width - RIGHT}
          y1={y(Number(report.target))}
          y2={y(Number(report.target))}
          className="stroke-ink-3"
          strokeWidth={1.5}
          strokeDasharray="4 4"
        />
        <text
          x={width - RIGHT}
          y={y(Number(report.target)) + 16}
          textAnchor="end"
          className="fill-ink-3 font-mono text-[11px]"
        >
          Target {Number(report.target)}%
        </text>
        {segments.map((d) => (
          <path
            key={d}
            d={d}
            fill="none"
            className="stroke-chart-1"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}
        {points.map((p, i) => (
          <g key={p.start}>
            {p.rate != null && (
              <circle
                cx={x(i)}
                cy={y(Number(p.rate))}
                r={i === latest || i === hover ? 5 : 4}
                className="fill-chart-1 stroke-card"
                strokeWidth={2}
              />
            )}
            <text
              x={x(i)}
              y={HEIGHT - 8}
              textAnchor="middle"
              className="fill-ink-3 font-mono text-[11px]"
            >
              {p.label}
            </text>
            <rect
              x={x(i) - step / 2}
              y={TOP}
              width={Math.max(step, 24)}
              height={plotH}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            />
          </g>
        ))}
        {latest !== null && hover === null && (
          <text
            x={x(latest)}
            y={y(Number(points[latest].rate)) - 12}
            textAnchor={latest === points.length - 1 ? 'end' : 'middle'}
            className="fill-ink text-[12px] font-medium"
          >
            {Number(points[latest].rate)}%
          </text>
        )}
      </svg>
      {shown && hover !== null && (
        <div
          role="tooltip"
          className="pointer-events-none absolute top-2 z-10 min-w-[160px] rounded-md border border-line bg-raised px-3 py-2 shadow-sm"
          style={{ left: Math.min(width - 172, Math.max(0, x(hover) - 80)) }}
        >
          <p className="type-label-s m-0 text-ink">
            {report.by === 'WEEK' ? `Week ${shown.label.slice(1)}` : shown.label}
          </p>
          <p className="type-data m-0 mt-1 text-ink">
            {shown.rate == null ? 'No delivery' : `${Number(shown.rate)}% on time`}
          </p>
          <p className="type-caption m-0 text-ink-3">
            {shown.delivered} delivered, {shown.late} late
          </p>
        </div>
      )}
    </div>
  );
};
