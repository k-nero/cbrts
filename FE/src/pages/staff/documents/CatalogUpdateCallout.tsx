import type { FC } from 'react';

import { Button, Callout } from '@/components/ui';
import type { CatalogUpdate } from '@/interfaces';

type Props = {
  update: CatalogUpdate;
  onMove: (update: CatalogUpdate) => void;
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/**
 * A newer published version of a catalog the job is pinned to. The job keeps its version until the
 * specialist moves it (PRODUCT.md: a later change never silently alters an in-flight case).
 */
export const CatalogUpdateCallout: FC<Props> = ({ update, onMove }) => {
  const counts = [
    update.added.length && `${plural(update.added.length, 'document')} added`,
    update.changed.length && `${plural(update.changed.length, 'rule')} changed`,
    update.removed.length && `${update.removed.length} removed`,
  ].filter(Boolean);
  return (
    <Callout
      tone="warn"
      title={`${update.country} published v${update.versionNo}; this job is on v${update.pinnedVersionNo}${
        counts.length ? `: ${counts.join(', ')}` : ''
      }`}
      action={
        <Button variant="secondary" size="sm" onClick={() => onMove(update)}>
          Move to v{update.versionNo}
        </Button>
      }
    >
      <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
        {update.added.map((d) => (
          <li key={`a-${d}`}>Added: {d}</li>
        ))}
        {update.changed.map((d) => (
          <li key={`c-${d}`}>Changed: {d}</li>
        ))}
        {update.removed.map((d) => (
          <li key={`r-${d}`}>Removed: {d}</li>
        ))}
        {counts.length === 0 && <li>Only the catalog's parameters changed.</li>}
      </ul>
    </Callout>
  );
};
