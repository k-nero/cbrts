import { Flex } from 'antd';
import { FC, ReactNode } from 'react';

export const Row: FC<{ label?: string; children: ReactNode }> = ({ label, children }) => (
  <Flex vertical gap={10}>
    {label && <span className="type-body-s text-ink-3">{label}</span>}
    <Flex wrap align="center" gap={12}>
      {children}
    </Flex>
  </Flex>
);
