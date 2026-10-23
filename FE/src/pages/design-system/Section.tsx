import { Flex } from 'antd';
import { FC, ReactNode } from 'react';

export const Section: FC<{ title: string; description: string; children: ReactNode }> = ({
  title,
  description,
  children,
}) => (
  <section className="rounded-xl border border-line bg-card p-10">
    <Flex vertical gap={20}>
      <Flex vertical gap={8}>
        <h2 className="type-display-m m-0 text-ink">{title}</h2>
        <p className="type-body-m m-0 max-w-225 text-ink-2">{description}</p>
      </Flex>
      {children}
    </Flex>
  </section>
);
