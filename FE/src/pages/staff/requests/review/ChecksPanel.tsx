import type { FC } from 'react';

import { Chip, Panel } from '@/components/ui';
import type { ReviewCheck } from '@/interfaces';
import { checkTally, checkTone } from '@/lib/utils';

const CHECK_NAMES: Record<ReviewCheck['key'], string> = {
  ROUTE_SERVED: 'Route served',
  LEAD_TIME: 'Lead time',
};

/**
 * The two checks the server worked out, each a toned word and its evidence (spec §5.2). The server works
 * them out from the request as it stands, which for a request out of review can hold the customer's unsent
 * edits, so they only show while the request is in review.
 */
export const ChecksPanel: FC<{ checks: ReviewCheck[]; inReview: boolean }> = ({
  checks,
  inReview,
}) => {
  if (!inReview)
    return (
      <Panel title="Feasibility checks">
        <p className="type-body-s m-0 text-ink-3">
          The checks run again when the request is back in review.
        </p>
      </Panel>
    );
  const allPass = checks.every((c) => c.state === 'OK');
  return (
    <Panel
      title="Feasibility checks"
      extra={
        <span className={allPass ? 'type-label-s text-ok' : 'type-label-s text-ink-2'}>
          {checkTally(checks)}
        </span>
      }
      flush
    >
      <ul className="m-0 list-none p-0">
        {checks.map((c, i) => (
          <li
            key={c.key}
            className={`flex items-start gap-4 px-6 py-3.5 ${i > 0 ? 'border-t border-line' : ''}`}
          >
            <span className="w-28 shrink-0">
              <Chip tone={checkTone(c.state)}>{c.word}</Chip>
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="type-label-m text-ink">{CHECK_NAMES[c.key]}</span>
              <span className="type-body-s text-ink-2">{c.evidence}</span>
              {c.sub && <span className="type-body-s text-ink-3">{c.sub}</span>}
            </span>
          </li>
        ))}
      </ul>
      <p className="type-body-s m-0 border-t border-line px-6 py-3.5 text-ink-3">
        Blackout, capacity and horse availability are checked with later steps.
      </p>
    </Panel>
  );
};
