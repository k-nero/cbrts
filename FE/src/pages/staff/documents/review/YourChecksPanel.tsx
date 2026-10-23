import type { FC } from 'react';
import { Flex } from 'antd';
import { Checkbox, Panel } from '@/components/ui';

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
  const untickedCount = checks.filter((c) => !c.checked).length;
  const allTicked = untickedCount === 0;
  const statusLabel = allTicked
    ? `All ${checks.length} ticked`
    : `${untickedCount} of ${checks.length} not ticked`;

  return (
    <Panel
      title="Your checks"
      extra={
        <span className={`type-label-s ${allTicked ? 'text-ok' : 'text-bad'}`}>{statusLabel}</span>
      }
    >
      <Flex vertical gap={12}>
        {checks.map((check) => (
          // The Checkbox's own label toggles it; a click handler around it would toggle twice.
          <Checkbox
            key={check.id}
            checked={check.checked}
            onChange={() => onToggle(check.id)}
            label={
              <Flex vertical gap={2}>
                <span className="type-body-s text-ink">{check.label}</span>
                {check.sub && <span className="type-caption text-ink-3">{check.sub}</span>}
              </Flex>
            }
          />
        ))}
      </Flex>
    </Panel>
  );
};
