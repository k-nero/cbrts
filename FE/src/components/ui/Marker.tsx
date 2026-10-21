import type { FC } from 'react';

import { cx } from './tone';
import type { RouteStopState } from './RouteStrip';

export const Marker: FC<{ state: RouteStopState }> = ({ state }) => (
  <span className="grid size-5 place-items-center">
    <span
      className={cx(
        'block rounded-full',
        state === 'done' && 'size-3.5 bg-ok',
        state === 'current' && 'size-5 border-2 border-info bg-info-soft',
        state === 'upcoming' && 'size-3.5 border-2 border-line-strong bg-canvas',
      )}
    />
  </span>
);
