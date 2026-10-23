import type { FC, ReactNode } from 'react';
import { Flex } from 'antd';

export const Row: FC<{ label: string; children: ReactNode }> = ({ label, children }) => (
  <Flex align="baseline" justify="space-between" gap={16}>
    <span className="type-body-s shrink-0 text-ink-3">{label}</span>
    <span className="min-w-0 text-right break-all">{children}</span>
  </Flex>
);
