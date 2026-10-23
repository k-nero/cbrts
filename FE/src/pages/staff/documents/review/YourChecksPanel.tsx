import type { FC } from 'react';
import { Checkbox } from '@/components/ui';

export interface ManualCheckItem {
  id: string;
  label: string;
  sub?: string;
  checked: boolean;
}

type Props = {
  checks: ManualCheckItem[];
  onToggle: (id: string) => void;
};

/**
 * Specialist manual checklist (Figma: checksList).
 * Approval strictly requires every item to be ticked.
 */
export const YourChecksPanel: FC<Props> = ({ checks, onToggle }) => {
  const allTicked = checks.every((c) => c.checked);
  const untickedCount = checks.filter((c) => !c.checked).length;
  const statusLabel = allTicked
    ? `All ${checks.length} ticked`
    : `${untickedCount} of ${checks.length} not ticked`;

  return (
    <div className="rounded-lg border border-line bg-card p-5">
      <div className="flex items-center justify-between pb-3">
        <h4 className="type-h4 text-ink">Your checks</h4>
        <span className={`type-label-s ${allTicked ? 'text-ok' : 'text-bad'}`}>{statusLabel}</span>
      </div>

      <div className="divide-y divide-line">
        {checks.map((check) => (
          <div
            key={check.id}
            className="flex cursor-pointer items-start gap-3 py-3 select-none"
            onClick={() => onToggle(check.id)}
          >
            <div className="pt-0.5">
              <Checkbox checked={check.checked} onChange={() => onToggle(check.id)} />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="type-body-s font-medium text-ink">{check.label}</span>
              {check.sub && <span className="type-caption text-ink-3">{check.sub}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
