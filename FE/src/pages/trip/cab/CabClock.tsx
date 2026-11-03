import { type FC, useEffect, useState } from 'react';

import { formatTime } from '@/lib/utils';

/** The time now at 28 px, so the escort reads it from the seat; it ticks with the minute. */
export const CabClock: FC = () => {
  const [now, setNow] = useState(() => new Date().toISOString());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date().toISOString()), 15_000);
    return () => window.clearInterval(id);
  }, []);
  return <span className="type-data-l text-ink">{formatTime(now)}</span>;
};
