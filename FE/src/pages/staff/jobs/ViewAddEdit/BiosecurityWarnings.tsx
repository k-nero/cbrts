import { Flex } from 'antd';

import { Callout, Chip } from '@/components/ui';
import type { BiosecurityWarning } from '@/interfaces';

const TITLE: Record<BiosecurityWarning['kind'], string> = {
  ISOLATION: 'Isolation mismatch',
  HEALTH_TESTS: 'Different health tests',
  HEALTH_DOCUMENTS: 'Health documents not yet clear',
};

/**
 * Biosecurity warnings for horses of different jobs on one trailer (US-F3-12). They don't block:
 * the coordinator accepts them, and an accepted one is marked until what it says changes.
 */
export function BiosecurityWarnings({ warnings }: { warnings: BiosecurityWarning[] }) {
  if (warnings.length === 0) return null;
  return (
    <Flex vertical gap={8}>
      {warnings.map((w) => (
        <Callout
          key={w.key}
          tone="warn"
          title={
            <Flex gap={8} align="center">
              {TITLE[w.kind]}
              {w.accepted && <Chip tone="neutral">Accepted</Chip>}
            </Flex>
          }
        >
          {w.message}
        </Callout>
      ))}
    </Flex>
  );
}
