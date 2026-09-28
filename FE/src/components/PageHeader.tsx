import { FC, ReactNode } from 'react';
import { Flex } from 'antd';

import { COLOR_BORDER } from '@/constant/color';

const TITLE = 'm-0 font-display text-[44px] leading-[50px] font-normal tracking-[-0.01em] text-ink';

type Props = {
  title: string;
  /** One short paragraph under the title (Body M, Mist). */
  summary?: ReactNode;
  /** Chips, a deadline or a Secondary control. Never the gold action (DESIGN.md, One Gold Button). */
  right?: ReactNode;
};

/** The one page header: title in Fraunces Display L, summary beneath, a hairline under both. */
const PageHeader: FC<Props> = ({ title, summary, right }) => (
  <Flex
    justify="space-between"
    align="end"
    gap={24}
    style={{ paddingBottom: 24, borderBottom: `1px solid ${COLOR_BORDER}` }}
  >
    <Flex vertical gap={8}>
      <h1 className={TITLE}>{title}</h1>
      {summary && <p className="m-0 max-w-[640px] text-[15px] leading-6 text-ink-2">{summary}</p>}
    </Flex>
    {right && (
      <Flex gap={8} align="center">
        {right}
      </Flex>
    )}
  </Flex>
);

export default PageHeader;
