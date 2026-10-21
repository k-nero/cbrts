import { type FC } from 'react';

import { StatTile } from '@/components/ui';
import type { RateCatalog, RateCorridorView } from '@/interfaces';
import { formatDate } from '@/lib/utils';

/** The four facts about the corridor and the version it is read from. */
export const RateTiles: FC<{ catalog: RateCatalog; view: RateCorridorView }> = ({
  catalog,
  view,
}) => {
  const current = catalog.versions.find((v) => v.id === catalog.currentVersionId);
  return (
    <div className="grid grid-cols-4 gap-4">
      <StatTile
        value={
          view.corridor.distanceKm == null
            ? '—'
            : `${view.corridor.distanceKm.toLocaleString('en-US')} km`
        }
        label="Distance"
      />
      <StatTile value={view.corridor.crossingCount} label="Border crossings" />
      <StatTile
        tone="info"
        value={current?.quotationsPinned ?? 0}
        label={current ? `Quotes pinned to v${current.versionNo}` : 'Quotes pinned'}
      />
      <StatTile
        value={current?.publishedAt ? formatDate(current.publishedAt) : '—'}
        label="Last published"
      />
    </div>
  );
};
