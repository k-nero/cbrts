import { Flex } from 'antd';
import type { FC, ReactNode } from 'react';

/** The sunken band an inline line editor sits in, under its line or at the foot of its group. */
export const EditorFrame: FC<{ title: string; children: ReactNode }> = ({ title, children }) => (
  <div className="px-5 py-4 border-b border-line bg-sunken">
    <Flex vertical gap={12}>
      <span className="type-label-m text-ink">{title}</span>
      {children}
    </Flex>
  </div>
);
