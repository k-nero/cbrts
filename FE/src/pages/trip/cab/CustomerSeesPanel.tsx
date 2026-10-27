import type { FC, ReactNode } from 'react';

import { Panel } from '@/components/ui';

/** What the customer will read from this record, so the escort writes for them. */
export const CustomerSeesPanel: FC<{ children: ReactNode }> = ({ children }) => (
  <Panel title="What the customer sees">
    <p className="type-body-s m-0 text-ink-2">{children}</p>
  </Panel>
);
