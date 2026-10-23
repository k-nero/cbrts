import { Flex } from 'antd';
import type { FC } from 'react';

import { cx } from '@/components/ui';

export const PassEnd: FC<{ code: string; city: string; end?: boolean }> = ({ code, city, end }) => (
  <Flex
    component="span"
    vertical
    gap={2}
    align={end ? 'end' : undefined}
    className={cx('shrink-0', end && 'text-right')}
  >
    <span className="type-data-l text-ink">{code}</span>
    <span className="type-body-s text-ink-2">{city}</span>
  </Flex>
);
