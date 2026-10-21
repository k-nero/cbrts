import { type FC } from 'react';

import { Button, COAT_SWATCH, cx, Panel, TONE_FG } from '@/components/ui';
import type { CustomerHome } from '@/interfaces';

/* ---------- your horses ---------- */

/** Coat swatch, name and breed line, documents cleared, and the one thing a horse waits on. */
export const YourHorses: FC<{ home: CustomerHome; onAll: () => void }> = ({ home, onAll }) => (
  <Panel
    title={
      <div className="flex flex-col gap-0.5">
        <h2 className="type-h4 m-0 text-ink">Your horses</h2>
        <p className="type-body-s m-0 text-ink-3">{home.horsesNote}</p>
      </div>
    }
    className="self-start"
  >
    <ul className="m-0 -mt-1 list-none p-0">
      {home.horses.map((h) => (
        <li key={h.id} className="flex items-center gap-3 border-t border-line py-3">
          <span
            aria-hidden
            className={cx(
              'size-3 shrink-0 rounded-full border border-line-strong',
              COAT_SWATCH[h.coat],
            )}
          />
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="type-label-m text-ink">{h.name}</span>
            <span className="type-body-s text-ink-3">{h.line}</span>
          </span>
          <span className="flex shrink-0 flex-col items-end gap-0.5 text-right">
            <span className="type-caption text-ink-2">{h.documents}</span>
            {h.note && (
              <span className={cx('type-body-s', TONE_FG[h.note.tone])}>{h.note.text}</span>
            )}
          </span>
        </li>
      ))}
    </ul>
    <div className="pt-1">
      <Button size="sm" variant="ghost" trailingIcon="arrow-right" onClick={onAll}>
        My horses
      </Button>
    </div>
  </Panel>
);
