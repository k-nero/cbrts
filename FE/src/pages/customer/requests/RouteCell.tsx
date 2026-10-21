import { type FC } from 'react';

import type { Endpoint, RequestSummary } from '@/interfaces';

const cityOf = (e: Endpoint | null) => (e ? (e.placeId ? e.city : e.text) : null);

/** The route as the pass reads it, the place names beneath. */
export const RouteCell: FC<{ row: RequestSummary }> = ({ row }) => {
  const from = cityOf(row.origin);
  const to = cityOf(row.destination);
  if (!from && !to) return <span className="type-body-s text-ink-3">Route not set</span>;
  const places = [row.origin?.name, row.destination?.name].filter(Boolean).join(' → ');
  return (
    <span className="flex flex-col gap-0.5">
      <span className="type-label-s text-ink">
        {from ?? '—'} → {to ?? '—'}
      </span>
      {places && <span className="type-body-s text-ink-3">{places}</span>}
    </span>
  );
};
