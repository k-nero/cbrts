import type { FC } from 'react';

import { Chip, Panel } from '@/components/ui';
import type { TransportRequest } from '@/interfaces';
import { latestRevision, versionLine } from '@/lib/utils';

/**
 * Every version the customer sent (US-F1-04): a returned request keeps v1 when v2 goes out, so nothing
 * sent is lost. `current` marks the latest while the customer is changing it.
 */
export const VersionsPanel: FC<{ request: TransportRequest; current?: boolean }> = ({
  request,
  current,
}) => {
  const latest = latestRevision(request);
  if (latest === 0) return null;
  return (
    <Panel title="Versions">
      <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
        {request.revisions.map((v) => (
          <li key={v.revisionNo} className="flex items-center justify-between gap-3">
            <span className="type-body-s text-ink-2">{versionLine(v)}</span>
            {current && v.revisionNo === latest && (
              <Chip tone="info" dot={false}>
                Current
              </Chip>
            )}
          </li>
        ))}
      </ul>
      {current && (
        <p className="type-body-s m-0 mt-3 text-ink-3">
          Your changes become v{latest + 1}. You and the logistics manager both keep v{latest}, so
          nothing you sent is lost.
        </p>
      )}
    </Panel>
  );
};
