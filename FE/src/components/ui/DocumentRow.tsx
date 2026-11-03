import type { FC, ReactNode } from 'react';

import { Chip } from './Chip';
import { cx, type Tone } from './tone';

export type DocumentStatus = 'cleared' | 'review' | 'amber' | 'red' | 'required';

/** Each state's tone and word; pages that show a document's state on its own use the same pair. */
export const DOCUMENT_STATUS: Record<
  DocumentStatus,
  { tone: Tone; label: string; result: string }
> = {
  cleared: { tone: 'ok', label: 'Cleared', result: 'text-ink-2' },
  review: { tone: 'info', label: 'In review', result: 'text-ink-2' },
  amber: { tone: 'warn', label: 'Expires in transit', result: 'text-warn' },
  red: { tone: 'bad', label: 'Fails rule', result: 'text-bad' },
  required: { tone: 'neutral', label: 'Required', result: 'text-ink-3' },
};

type Props = {
  status: DocumentStatus;
  /** Overrides the status word, keeping the tone ("Rejected", "With the authority"). */
  statusLabel?: string;
  document: ReactNode;
  /** The rule in words: "Valid through arrival + 2 days". Left out when no rule is pinned. */
  rule?: ReactNode;
  /** The result of the validity check, or "Not uploaded yet." */
  result?: ReactNode;
  /** Who holds the next step ("With you", "With the customer"). */
  holder?: ReactNode;
  /** "v1 · 2 Sep 2026", or a Deadline. */
  version?: ReactNode;
  /** Left out on a read-only row, which then gives the space to the document. */
  actions?: ReactNode;
  className?: string;
};

/**
 * One checklist item (DESIGN.md, Document row). The rule is checked against the travel dates, never
 * today: GREEN counts toward the gate only once a specialist approves it; AMBER never counts.
 */
export const DocumentRow: FC<Props> = ({
  status,
  statusLabel,
  document,
  rule,
  result,
  holder,
  version,
  actions,
  className,
}) => {
  const s = DOCUMENT_STATUS[status];
  return (
    <div
      className={cx(
        'flex items-center gap-4 border-b border-line bg-card px-5 py-3.5 last:border-b-0',
        className,
      )}
    >
      <span className="w-[172px] shrink-0">
        <Chip tone={s.tone}>{statusLabel ?? s.label}</Chip>
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <span className="type-label-m text-ink">{document}</span>
        {rule && <span className="type-body-s text-ink-3">{rule}</span>}
        {result && <span className={cx('type-body-s', s.result)}>{result}</span>}
      </span>
      {holder && <span className="type-label-s w-[140px] shrink-0 text-ink-2">{holder}</span>}
      {/* Always present, so the actions line up down the table. A long file name is cut to one line, whole on hover. */}
      <span
        className="type-caption w-[150px] shrink-0 truncate text-ink-3"
        title={typeof version === 'string' ? version : undefined}
      >
        {version}
      </span>
      {actions !== undefined && (
        <span className="flex w-[250px] shrink-0 items-center justify-end gap-2">{actions}</span>
      )}
    </div>
  );
};
