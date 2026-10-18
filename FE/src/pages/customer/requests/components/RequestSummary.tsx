import type { FC } from 'react';

import { Button, cx, Panel } from '@/components/ui';
import type { FieldStep, ReviewRow } from '@/lib/utils';

type Props = {
  rows: ReviewRow[];
  title?: string;
  /** With it, each row has an Edit link to the step that sets it. */
  onEdit?: (step: FieldStep) => void;
};

/**
 * What a customer sent, in one order and with one set of labels (DESIGN.md, Request summary): the
 * wizard's Review, and later In review's "What you sent".
 */
export const RequestSummary: FC<Props> = ({ rows, title, onEdit }) => (
  <Panel title={title} flush>
    <dl className="m-0">
      {rows.map((r, i) => (
        <div
          key={r.label}
          className={cx(
            'grid grid-cols-[140px_minmax(0,1fr)_auto] items-start gap-4 px-6 py-3.5',
            i > 0 && 'border-t border-line',
          )}
        >
          <dt className="type-body-s pt-0.5 text-ink-3">{r.label}</dt>
          <dd className={cx('m-0 text-ink', r.mono ? 'type-data' : 'type-body-m')}>{r.value}</dd>
          {onEdit ? (
            <Button size="sm" variant="ghost" onClick={() => onEdit(r.step)}>
              Edit
            </Button>
          ) : (
            <span />
          )}
        </div>
      ))}
    </dl>
  </Panel>
);
