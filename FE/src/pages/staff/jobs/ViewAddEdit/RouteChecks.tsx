import type { FC } from 'react';

import type { RouteCheck } from './routeDraft';

import { Chip } from '@/components/ui';

/** The checks a draft passes before it is confirmed, each a state in words and what was found. */
export const RouteChecks: FC<{ checks: RouteCheck[] }> = ({ checks }) => (
  <ul className="m-0 flex list-none flex-col gap-2 p-0" aria-label="Route checks">
    {checks.map((c) => (
      <li key={c.key} className="flex items-start gap-3">
        <Chip tone={c.ok ? 'ok' : c.blocks ? 'bad' : 'warn'}>
          {c.ok ? 'Passes' : c.blocks ? 'Fix' : 'Check'}
        </Chip>
        <span className="type-body-s text-ink-2">{c.label}</span>
      </li>
    ))}
  </ul>
);
