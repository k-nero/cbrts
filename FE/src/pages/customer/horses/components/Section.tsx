import { type FC, type ReactNode } from 'react';
import { Flex } from 'antd';

/** One section of the form: its title, why it asks, then its fields. */
export const Section: FC<{ title: string; sub?: string; first?: boolean; children: ReactNode }> = ({
  title,
  sub,
  first,
  children,
}) => (
  <section className={first ? undefined : 'border-t border-line pt-5'}>
    <Flex vertical gap={14}>
      <Flex vertical gap={2}>
        <h4 className="type-h4 m-0 text-ink">{title}</h4>
        {sub && <p className="type-body-s m-0 text-ink-3">{sub}</p>}
      </Flex>
      {children}
    </Flex>
  </section>
);
