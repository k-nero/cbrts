import type { FC } from 'react';
import { Flex } from 'antd';

/** A label and its figure on one line of a side panel. */
export const DlRow: FC<{ label: string; value: string }> = ({ label, value }) => (
  <Flex align="center" justify="space-between" gap={16}>
    <span className="type-body-s text-ink-3">{label}</span>
    <span className="type-data text-ink">{value}</span>
  </Flex>
);
