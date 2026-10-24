import { type FC, useMemo } from 'react';
import { Column, type ColumnConfig } from '@ant-design/plots';

import { compactMoney, monthLabel } from './reportFormat';

import { PALETTE } from '@/constant/color';
import type { RevenueReport } from '@/interfaces';
import { useThemeStore } from '@/stores/themeStore';

const REVENUE = 'Revenue';
const COST = 'Direct cost';

/** The tooltip's body, in the app's own ink: the month, its jobs, both series and the margin. */
const tooltipHtml = (m: RevenueReport['months'][number], chart1: string, chart2: string) => {
  const swatch = (c: string) =>
    `<span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${c}"></span>`;
  const row = (label: string, value: string) =>
    `<div style="display:flex;justify-content:space-between;gap:16px"><span style="display:flex;align-items:center;gap:6px;color:var(--color-ink-2)">${label}</span><span style="font-family:var(--font-mono);color:var(--color-ink)">${value}</span></div>`;
  const margin = m.revenue > 0 ? `${(((m.revenue - m.cost) / m.revenue) * 100).toFixed(1)}%` : '—';
  return `<div style="min-width:180px;font-size:12px;line-height:18px">
    <div style="font-weight:500;color:var(--color-ink)">${monthLabel(m.month, true)}</div>
    <div style="color:var(--color-ink-3);margin-bottom:4px">${m.jobs} ${m.jobs === 1 ? 'job' : 'jobs'} settled</div>
    ${row(`${swatch(chart1)}${REVENUE}`, compactMoney(m.revenue))}
    ${row(`${swatch(chart2)}${COST}`, compactMoney(m.cost))}
    ${row('Margin', margin)}
  </div>`;
};

/**
 * Revenue and direct cost by month (US-R-02, DESIGN.md: chart-1 blue, chart-2 terracotta), on @ant-design/plots:
 * one axis, grouped columns with 4 px rounded tops and a 2 px gap, the latest revenue labelled, and a tooltip per
 * month. The legend is the panel's own and the corridor table is the chart's table view, so the chart draws neither.
 * Its colours and ink follow the theme (constant/color.ts, PALETTE).
 */
const RevenueChart: FC<{ months: RevenueReport['months'] }> = ({ months }) => {
  const mode = useThemeStore((s) => s.mode);
  const p = PALETTE[mode];
  const config = useMemo<ColumnConfig>(() => {
    const latest = months[months.length - 1]?.month;
    // Headroom above the tallest bar, so the latest revenue's label sits above it, not inside it.
    const top = Math.max(1, ...months.flatMap((m) => [m.revenue, m.cost])) * 1.15;
    const byMonth = new Map(months.map((m) => [m.month, m]));
    return {
      data: months.flatMap((m) => [
        { month: m.month, series: REVENUE, value: m.revenue },
        { month: m.month, series: COST, value: m.cost },
      ]),
      xField: 'month',
      yField: 'value',
      colorField: 'series',
      group: true,
      height: 240,
      autoFit: true,
      theme: mode === 'dark' ? 'classicDark' : 'classic',
      scale: {
        color: { domain: [REVENUE, COST], range: [p.chart1, p.chart2] },
        y: { domainMin: 0, domainMax: top, nice: true, tickCount: 4 },
      },
      style: { radiusTopLeft: 4, radiusTopRight: 4, insetLeft: 1, insetRight: 1, maxWidth: 28 },
      legend: false,
      axis: {
        x: {
          labelFormatter: (v: string) => monthLabel(v),
          labelFill: p.textTertiary,
          labelFontFamily: 'DM Mono, ui-monospace, monospace',
          labelFontSize: 11,
          line: true,
          lineStroke: p.borderStrong,
          tick: false,
          title: false,
        },
        y: {
          labelFormatter: (v: number) => compactMoney(v),
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
        text: (d: { month: string; series: string; value: number }) =>
          d.month === latest && d.series === REVENUE && d.value > 0 ? compactMoney(d.value) : '',
        position: 'top',
        // Above the bar, not centred on its edge.
        textBaseline: 'bottom',
        dy: -4,
        fill: p.textPrimary,
        fontSize: 12,
        fontWeight: 500,
      },
      tooltip: {
        title: (d: { month: string }) => d.month,
        items: [{ channel: 'y' }],
      },
      interaction: {
        tooltip: {
          shared: true,
          render: (_event: unknown, { title }: { title: string }) => {
            const m = byMonth.get(title);
            return m ? tooltipHtml(m, p.chart1, p.chart2) : '';
          },
        },
        elementHighlightByX: true,
      },
    };
  }, [months, mode, p]);

  return (
    <div
      role="img"
      aria-label={`Revenue and direct cost by month, ${months.length} months; the figures are in the table below`}
    >
      <Column {...config} />
    </div>
  );
};

export default RevenueChart;
