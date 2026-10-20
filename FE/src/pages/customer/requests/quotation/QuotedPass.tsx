import type { FC } from 'react';

import { COAT_SWATCH, cx, DraftPass } from '@/components/ui';
import type { CustomerQuotation, HorseCoat } from '@/interfaces';
import { coatOf, departsText, formatDate, formatDayTime, formatTime, money } from '@/lib/utils';

/** The horses as coat swatches with their names, as on the pass. */
const Horses: FC<{ quotation: CustomerQuotation }> = ({ quotation }) => (
  <span className="flex items-center justify-end gap-2">
    <span className="flex -space-x-1.5">
      {quotation.request.horses.slice(0, 6).map((h) => (
        <span
          key={h.id}
          aria-hidden
          className={cx(
            'size-4 rounded-full border-2 border-card',
            COAT_SWATCH[coatOf(h.coat as HorseCoat | null)],
          )}
        />
      ))}
    </span>
    <span className="type-label-s text-ink">
      {quotation.request.horses.map((h) => h.name).join(', ')}
    </span>
  </span>
);

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
  const r = q.request;
  if (r.mode === 'AIR') return `Air · ${(r.airClass ?? 'business').toLowerCase()}`;
  return `Road · ${r.trailer === 'PRIVATE' ? 'private trailer' : 'shared load'}`;
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
      chip={{ tone: 'info', label: `Quoted · v${quotation.versionNo}` }}
      from={r.fromCity}
      to={r.toCity}
      mode={r.mode === 'AIR' ? 'air' : 'road'}
      rows={[
        { label: 'Horses', value: <Horses quotation={quotation} /> },
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
      range={quotation.totals.total == null ? null : money(quotation.totals.total)}
      rangeSub={
        quotation.status === 'EXPIRED'
          ? `Expired ${quotation.validUntil ? formatDate(quotation.validUntil) : ''}. It is re-priced from the rate catalog in force now.`
          : `Valid until ${quotation.validUntil ? formatDate(quotation.validUntil) : '—'}. Once you accept and the job is approved, this becomes your travel pass.`
      }
    />
  );
};
