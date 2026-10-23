import { Flex } from 'antd';
import type { FC, ReactNode } from 'react';

/* Every visual is one height, so the feature titles line up (FEATURE_VISUAL_H). */
export const Visual: FC<{
  children: ReactNode;
  label: string;
  gap?: number;
  justify?: 'center';
}> = ({ children, label, gap = 8, justify }) => (
  <figure aria-label={label} className="m-0 h-[132px] rounded-md bg-sunken p-4">
    <Flex vertical gap={gap} justify={justify} className="h-full">
      {children}
    </Flex>
  </figure>
);
