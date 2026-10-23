import { Flex } from 'antd';
import type { FC, ReactNode } from 'react';

export const Section: FC<{ id: string; title: string; summary?: string; children: ReactNode }> = ({
  id,
  title,
  summary,
  children,
}) => (
  <section aria-labelledby={id} className="scroll-mt-6 pt-20">
    <Flex vertical gap={32}>
      <Flex component="header" vertical gap={10}>
        <h2 id={id} className="type-display-l m-0 text-ink">
          {title}
        </h2>
        {summary && <p className="type-body-m m-0 max-w-[680px] text-ink-2">{summary}</p>}
      </Flex>
      {children}
    </Flex>
  </section>
);
