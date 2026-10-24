import { type FC, useMemo } from 'react';
import { Line, type LineConfig } from '@ant-design/plots';

import { PALETTE } from '@/constant/color';
import type { OnTimeReport } from '@/interfaces';
import { useThemeStore } from '@/stores/themeStore';

type Bucket = OnTimeReport['buckets'][number];

/** The axis floor: 85% unless a rate or the target sits lower, then a round step below it (0 at the least). */
const floorOf = (rates: number[], target: number) => {
  const low = Math.min(target, ...rates) - 5;
  if (low >= 85) return 85;
  const step = low >= 50 ? 10 : 25;
  return Math.max(0, Math.floor(low / step) * step);
};

/** The tooltip's body, in the app's own ink: the period, its rate, and how many were delivered and late. */
const tooltipHtml = (b: Bucket, by: OnTimeReport['by']) =>
  `<div style="min-width:160px;font-size:12px;line-height:18px">
    <div style="font-weight:500;color:var(--color-ink)">${by === 'WEEK' ? `Week ${b.label.slice(1)}` : b.label}</div>
    <div style="font-family:var(--font-mono);color:var(--color-ink);margin-top:4px">${b.rate == null ? 'No delivery' : `${Number(b.rate)}% on time`}</div>
    <div style="color:var(--color-ink-3)">${b.delivered} delivered, ${b.late} late</div>
  </div>`;

/**
 * On-time delivery by week or month (US-R-03, the Figma frame's on-time chart), on @ant-design/plots: one line in
 * chart-1 with dots ringed in the card colour, the target as a dashed line, the latest rate labelled, a tooltip per
 * point. A period with no delivery leaves a gap rather than a zero. Its colours and ink follow the theme
 * (constant/color.ts, PALETTE).
 */
const OnTimeChart: FC<{ report: OnTimeReport }> = ({ report }) => {
  const mode = useThemeStore((s) => s.mode);
  const p = PALETTE[mode];
  const config = useMemo<LineConfig>(() => {
    const target = Number(report.target);
    const points = report.buckets;
    const rates = points.flatMap((b) => (b.rate == null ? [] : [Number(b.rate)]));
    const lo = floorOf(rates, target);
    const latest = [...points].reverse().find((b) => b.rate != null)?.start;
    const byStart = new Map(points.map((b) => [b.start, b]));
    return {
      data: points.map((b) => ({ ...b, rate: b.rate == null ? null : Number(b.rate) })),
      xField: 'start',
      yField: 'rate',
      height: 220,
      autoFit: true,
      // Room above 100% for the latest rate's label.
      insetTop: 20,
      theme: mode === 'dark' ? 'classicDark' : 'classic',
      scale: { y: { domainMin: lo, domainMax: 100, nice: true, tickCount: 4 } },
      style: { stroke: p.chart1, lineWidth: 2, lineJoin: 'round', lineCap: 'round' },
      point: {
        shapeField: 'circle',
        sizeField: 4,
        style: { fill: p.chart1, stroke: p.bgCard, lineWidth: 2 },
      },
      axis: {
        x: {
          labelFormatter: (start: string) => byStart.get(start)?.label ?? start,
          labelFill: p.textTertiary,
          labelFontFamily: 'DM Mono, ui-monospace, monospace',
          labelFontSize: 11,
          line: true,
          lineStroke: p.borderStrong,
          tick: false,
          title: false,
        },
        y: {
          labelFormatter: (v: number) => `${v}%`,
          tick: false,
          labelFill: p.textTertiary,
          labelFontFamily: 'DM Mono, ui-monospace, monospace',
          labelFontSize: 11,
          grid: true,
          gridStroke: p.border,
          gridStrokeOpacity: 1,
          gridLineDash: [0, 0],
          title: false,
        },
      },
      label: {
        text: (d: Bucket) => (d.start === latest ? `${d.rate}%` : ''),
        textBaseline: 'bottom',
        dy: -8,
        fill: p.textPrimary,
        fontSize: 12,
        fontWeight: 500,
      },
      annotations: [
        {
          type: 'lineY',
          data: [target],
          style: { stroke: p.textTertiary, lineWidth: 1.5, lineDash: [4, 4], strokeOpacity: 1 },
          label: {
            text: `Target ${target}%`,
            position: 'right',
            textAlign: 'end',
            textBaseline: 'top',
            dy: 6,
            fill: p.textTertiary,
            fontFamily: 'DM Mono, ui-monospace, monospace',
            fontSize: 11,
          },
          tooltip: false,
        },
      ],
      tooltip: { title: (d: Bucket) => d.start, items: [{ channel: 'y' }] },
      interaction: {
        tooltip: {
          render: (_event: unknown, { title }: { title: string }) => {
            const b = byStart.get(title);
            return b ? tooltipHtml(b, report.by) : '';
          },
        },
      },
    };
  }, [report, mode, p]);

  return (
    <div
      role="img"
      aria-label={`On-time delivery rate by ${report.by === 'WEEK' ? 'week' : 'month'}, against the ${Number(report.target)}% target; the corridors are in the table below`}
    >
      <Line {...config} />
    </div>
  );
};

export default OnTimeChart;
