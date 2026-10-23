import type { FC } from 'react';

import { QuotedHorses } from './QuotedHorses';

import { DraftPass } from '@/components/ui';
import type { CustomerQuotation } from '@/interfaces';
import {
  departsText,
  formatDayTime,
  formatTime,
  money,
  quotedPassChip,
  quotedPassSub,
  serviceParts,
} from '@/lib/utils';

const service = (q: CustomerQuotation): string => {
  const r = q.request;
  const cover =
    r.insurance === 'EQUIFREIGHT'
      ? 'EquiFreight cover'
      : r.insurance === 'OWN_POLICY'
        ? 'Own policy'
        : null;
  return [cover, r.vetEscort ? 'vet escort' : null].filter(Boolean).join(' · ') || '—';
};

const mode = (q: CustomerQuotation): string => {
  const p = serviceParts(q.request.mode, q.request.trailer, q.request.airClass);
  return p.detail ? `${p.mode} · ${p.detail}` : p.mode;
};

const arrival = (q: CustomerQuotation): string => {
  const r = q.request;
  if (r.mode === 'AIR') return 'Airline schedule';
  if (r.arrivalMode === 'WINDOW' && r.windowStart && r.windowEnd)
    return `${formatDayTime(r.windowStart)}–${formatTime(r.windowEnd)}`;
  return 'Any time on the day';
};

/**
 * The quoted pass (DESIGN.md, Quotation side column): the wizard's draft pass carried forward, with the
 * quoted total in its stub and the date it holds until.
 */
export const QuotedPass: FC<{ quotation: CustomerQuotation }> = ({ quotation }) => {
  const r = quotation.request;
  return (
    <DraftPass
      chip={quotedPassChip(quotation)}
      from={r.fromCity}
      to={r.toCity}
      mode={r.mode === 'AIR' ? 'air' : 'road'}
      rows={[
        { label: 'Horses', value: <QuotedHorses quotation={quotation} /> },
        {
          label: 'Departs',
          value: departsText(r.departureDate, r.dateFlexDays),
          mono: true,
        },
        { label: 'Mode', value: mode(quotation) },
        { label: 'Arrival', value: arrival(quotation) },
        { label: 'Service', value: service(quotation) },
      ]}
      stubLabel="Quoted total"
      range={
        quotation.totals.total == null ? null : money(quotation.totals.total, quotation.currency)
      }
      rangeSub={quotedPassSub(quotation)}
    />
  );
};
