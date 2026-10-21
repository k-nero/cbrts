import type { FC } from 'react';

import { Chip, cx, Panel } from '@/components/ui';
import type { CustomerQuotation } from '@/interfaces';
import { formatDate, noticeBandLabel } from '@/lib/utils';

/** The cancellation fee by notice period (today's band marked), the late-arrival terms, the versions. */
export const TermsAndVersions: FC<{ quotation: CustomerQuotation }> = ({ quotation }) => (
  <Panel title="Terms and versions">
    <div className="flex flex-col gap-2">
      <span className="type-label-s text-ink-2">Cancellation fee by notice period</span>
      {quotation.cancellation.bands.length === 0 && (
        <span className="type-body-s text-ink-3">The rate catalog has no cancellation bands.</span>
      )}
      {[...quotation.cancellation.bands].reverse().map((b) => (
        <div
          key={b.minDays}
          className={cx(
            'flex items-center gap-2.5 rounded-md px-2.5 py-2',
            b.current && 'bg-info-soft',
          )}
        >
          <span className="type-body-s flex-1 text-ink-2">{noticeBandLabel(b)}</span>
          {b.current && (
            <Chip
              tone="info"
              dot={false}
            >{`Now · ${quotation.cancellation.daysToDeparture} days`}</Chip>
          )}
          <span className="type-data w-12 text-right text-ink">{`${b.pct}%`}</span>
        </div>
      ))}
      {quotation.latePenalty && (
        <span className="type-body-s text-ink-3">
          {`Late arrival: ${quotation.latePenalty.pctPerHour}% per hour late, up to ${quotation.latePenalty.capPct}%.`}
        </span>
      )}
      <span className="mt-2 border-t border-line pt-3 type-label-s text-ink-2">Versions</span>
      {quotation.versions.map((v) => {
        const current = v.versionNo === quotation.versionNo;
        return (
          <div key={v.versionNo} className="flex items-start gap-2.5">
            <span
              className={cx('type-data', current ? 'text-ink' : 'text-ink-3')}
            >{`v${v.versionNo}`}</span>
            <span className={cx('type-body-s flex-1', current ? 'text-ink-2' : 'text-ink-3')}>
              {v.status === 'SUPERSEDED'
                ? `Superseded. ${v.supersededReason ?? ''}`.trim()
                : v.status === 'EXPIRED'
                  ? `Expired ${v.validUntil ? formatDate(v.validUntil) : ''}`.trim()
                  : `Issued ${v.issuedAt ? formatDate(v.issuedAt) : ''}`.trim()}
            </span>
            {current && (
              <Chip tone="info" dot={false}>
                Current
              </Chip>
            )}
          </div>
        );
      })}
    </div>
  </Panel>
);
