import type { FC } from 'react';

import type { RevenueReport } from '@/interfaces';
import { money } from '@/lib/utils';

/** The report by corridor, most revenue first: the chart's figures as a table too (dataviz, accessibility). */
export const CorridorTable: FC<{ report: RevenueReport }> = ({ report }) => (
  <table className="w-full border-collapse">
    <caption className="type-label-s pb-2 text-left text-ink">By corridor</caption>
    <thead>
      <tr className="border-b border-line">
        {['Corridor', 'Jobs', 'Revenue', 'Direct cost', 'Margin'].map((h, i) => (
          <th
            key={h}
            scope="col"
            className={`type-caption py-2 font-normal text-ink-3 ${i === 0 ? 'text-left' : 'text-right'}`}
          >
            {h}
          </th>
        ))}
      </tr>
    </thead>
    <tbody>
      {report.corridors.length === 0 ? (
        <tr>
          <td colSpan={5} className="type-body-s py-3 text-ink-3">
            No job was settled in this period.
          </td>
        </tr>
      ) : (
        report.corridors.map((c) => (
          <tr key={c.corridorId ?? 'none'} className="border-b border-line">
            <th scope="row" className="type-body-s py-2 text-left font-normal text-ink">
              {c.label}
            </th>
            <td className="type-data py-2 text-right text-ink-2">{c.jobs}</td>
            <td className="type-data py-2 text-right text-ink">
              {money(c.revenue, report.currency)}
            </td>
            <td className="type-data py-2 text-right text-ink-2">
              {money(c.cost, report.currency)}
            </td>
            <td className="type-data py-2 text-right text-ink">
              {c.marginPct == null ? '—' : `${c.marginPct}%`}
            </td>
          </tr>
        ))
      )}
    </tbody>
  </table>
);
