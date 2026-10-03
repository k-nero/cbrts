import type { FC } from 'react';

/** The seven stage names, used everywhere (DESIGN.md, Process Vocabulary). */
export const STAGES = [
  'Request',
  'Quotation',
  'Approval',
  'Documents',
  'Clearance',
  'Trip',
  'Handover',
] as const;
export type Stage = (typeof STAGES)[number];

/**
 * A stage is a position, not a state, so it is words, never a chip (DESIGN.md, Stage mark):
 * "Documents 4 of 7".
 */
export const StageMark: FC<{ stage: Stage }> = ({ stage }) => (
  <span className="inline-flex items-baseline gap-1.5">
    <span className="type-label-s text-ink">{stage}</span>
    <span className="type-caption text-ink-3">
      {STAGES.indexOf(stage) + 1} of {STAGES.length}
    </span>
  </span>
);
