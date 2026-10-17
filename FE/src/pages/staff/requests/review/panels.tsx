import { type FC, useState } from 'react';

import { RequestSummary } from '@/pages/customer/requests/components/RequestSummary';
import { Chip, Panel, Tabs } from '@/components/ui';
import type { HistoryEntry, ReviewCheck, ReviewRevision } from '@/interfaces';
import { asSent, changedRows, checkTally, checkTone, ict, reviewRows } from '@/lib/utils';

const CHECK_NAMES: Record<ReviewCheck['key'], string> = {
  ROUTE_SERVED: 'Route served',
  LEAD_TIME: 'Lead time',
};

/** The two checks the server worked out, each a toned word and its evidence (spec §5.2). */
export const ChecksPanel: FC<{ checks: ReviewCheck[] }> = ({ checks }) => {
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

/** What the customer sent, at a version; later versions mark what changed (spec §5.2). */
export const SentPanel: FC<{ revisions: ReviewRevision[] }> = ({ revisions }) => {
  const latest = revisions[revisions.length - 1]?.revisionNo ?? 0;
  const [shown, setShown] = useState(String(latest));
  const index = revisions.findIndex((v) => String(v.revisionNo) === shown);
  const version = revisions[index];
  if (!version) return null;
  const previous = index > 0 ? revisions[index - 1] : undefined;
  return (
    <RequestSummary
      title={`What the customer sent · v${version.revisionNo}`}
      rows={reviewRows(asSent(version.payload))}
      changed={changedRows(previous?.payload, version.payload)}
      extra={
        revisions.length > 1 && (
          <Tabs
            label="Versions"
            items={revisions.map((v) => ({ key: String(v.revisionNo), label: `v${v.revisionNo}` }))}
            activeKey={shown}
            onChange={setShown}
          />
        )
      }
      footer={
        version.note && (
          <div className="rounded-md bg-sunken px-4 py-3">
            <p className="type-label-s m-0 text-ink-2">
              Returned
              {version.returnedAt ? ` ${ict(version.returnedAt).format('D MMM, HH:mm')}` : ''} with:
            </p>
            <p className="type-body-s m-0 mt-1 whitespace-pre-line text-ink">{version.note}</p>
          </div>
        )
      }
    />
  );
};

/** The request's audit trail, newest first. */
export const HistoryPanel: FC<{ history: HistoryEntry[] }> = ({ history }) => (
  <Panel title="History" flush>
    <ol className="m-0 list-none p-0">
      {history.map((h, i) => (
        <li
          key={`${h.occurredAt}-${i}`}
          className={`grid grid-cols-[120px_minmax(0,1fr)] gap-4 px-6 py-3 ${i > 0 ? 'border-t border-line' : ''}`}
        >
          <span className="type-caption pt-0.5 text-ink-3">
            {ict(h.occurredAt).format('D MMM · HH:mm')}
          </span>
          <span className="flex flex-col gap-0.5">
            <span className="type-body-s text-ink">{h.summary}</span>
            <span className="type-body-s text-ink-3">{h.actorLabel}</span>
          </span>
        </li>
      ))}
    </ol>
  </Panel>
);
