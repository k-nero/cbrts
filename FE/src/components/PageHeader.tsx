import { FC, ReactNode } from 'react';
import { Flex } from 'antd';

import { Button } from '@/components/ui';
import { COLOR_BORDER } from '@/constant/color';

const TITLE = 'm-0 font-display text-[44px] leading-[50px] font-normal tracking-[-0.01em] text-ink';

type Props = {
  title: string;
  /** One short paragraph under the title (Body M, Mist). */
  summary?: ReactNode;
  /** Chips, a deadline or a Secondary control. Never the gold action (DESIGN.md, One Gold Button). */
  right?: ReactNode;
  /**
   * Owner shell pages without a back link reserve its row (46 px), so every owner title sits at
   * the same height (DESIGN.md, One page header). Staff pages have no back row.
   */
  reserveBack?: boolean;
  /** A back link in that 46 px row ("My horses"), instead of reserving it. */
  back?: { label: string; onClick: () => void };
  /** A full-width picture above the title row, e.g. a horse's coat band. */
  banner?: ReactNode;
};

/** The one page header: title in Fraunces Display L, summary beneath, a hairline under both. */
const PageHeader: FC<Props> = ({ title, summary, right, reserveBack, back, banner }) => (
  <Flex vertical gap={16}>
    {back && (
      <div className="flex h-[46px] items-end">
        <Button variant="ghost" size="sm" leadingIcon="arrow-left" onClick={back.onClick}>
          {back.label}
        </Button>
      </div>
    )}
    {banner}
    <Flex
      justify="space-between"
      align="end"
      gap={24}
      style={{
        paddingTop: reserveBack && !back ? 46 : 0,
        paddingBottom: 24,
        borderBottom: `1px solid ${COLOR_BORDER}`,
      }}
    >
      <Flex vertical gap={8}>
        <h1 className={TITLE}>{title}</h1>
        {summary && <div className="m-0 max-w-[640px] text-[15px] leading-6 text-ink-2">{summary}</div>}
      </Flex>
      {right && (
        <Flex gap={8} align="center">
          {right}
        </Flex>
      )}
    </Flex>
  </Flex>
);

export default PageHeader;
