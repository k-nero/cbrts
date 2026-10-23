import type { FC } from 'react';
import { Chip, Panel } from '@/components/ui';

type Props = {
  text: string;
  tone: 'ok' | 'info' | 'warn' | 'bad';
};

const LABEL: Record<Props['tone'], string> = {
  ok: 'Passes',
  info: 'Present',
  warn: 'Flagged',
  bad: 'Failed',
};

/**
 * Automatic validity check panel (Figma: autoCheck).
 * Summarises the machine evaluation against pinned country regulation rules and travel dates.
 */
export const AutomaticCheckPanel: FC<Props> = ({ text, tone }) => (
  <Panel title="Automatic check" extra={<Chip tone={tone}>{LABEL[tone]}</Chip>}>
    <p className="type-body-s m-0 text-ink-2">{text}</p>
  </Panel>
);
