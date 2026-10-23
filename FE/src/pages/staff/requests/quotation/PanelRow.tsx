import { Flex } from 'antd';
import type { FC, ReactNode } from 'react';

/** A label and its value across a side panel: "Total  $8,757.40". */
export const PanelRow: FC<{ label: string; children: ReactNode }> = ({ label, children }) => (
  <Flex gap={16} align="center" justify="space-between">
    <span className="type-body-s text-ink-2">{label}</span>
    {children}
  </Flex>
);
