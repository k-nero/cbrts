import { type FC, type ReactNode } from 'react';
import { Flex } from 'antd';

/**
 * A value the form works out from other answers, with the rule in words, on a sunken line (DESIGN.md, First run): the
 * size class from the height, the box stall from an aggressive temperament.
 */
export const DerivedLine: FC<{ children: ReactNode }> = ({ children }) => (
  <div className="rounded-sm bg-sunken px-4 py-3">
    <Flex align="center" gap={12}>
      {children}
    </Flex>
  </div>
);
