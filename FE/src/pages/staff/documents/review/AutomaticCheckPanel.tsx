import type { FC } from 'react';
import { Chip } from '@/components/ui';

type Props = {
  text: string;
  tone: 'ok' | 'info' | 'warn' | 'bad';
};

/**
 * Automatic validity check panel (Figma: autoCheck).
 * Summarises the machine evaluation against pinned country regulation rules and travel dates.
 */
export const AutomaticCheckPanel: FC<Props> = ({ text, tone }) => {
  const chipLabel =
    tone === 'ok' ? 'Passes' : tone === 'info' ? 'Present' : tone === 'warn' ? 'Flagged' : 'Failed';

  return (
    <div className="rounded-lg border border-line bg-card p-5">
      <div className="flex items-center justify-between pb-2">
        <h4 className="type-h4 text-ink">Automatic check</h4>
        <Chip tone={tone}>{chipLabel}</Chip>
      </div>
      <p className="type-body-s mt-1 text-ink-2">{text}</p>
    </div>
  );
};
