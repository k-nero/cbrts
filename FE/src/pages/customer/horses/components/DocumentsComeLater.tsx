import type { FC } from 'react';

import { Panel } from '@/components/ui';

/** Documents are asked per trip, against its dates: the profile and Add say so instead of listing them. */
export const DocumentsComeLater: FC = () => (
  <Panel title="Documents come later">
    <p className="type-body-s m-0 text-ink-2">
      We ask for the passport, tests and certificates per trip, checked against your travel dates.
      Nothing to upload now.
    </p>
  </Panel>
);
