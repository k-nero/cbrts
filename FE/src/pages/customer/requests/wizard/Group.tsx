import type { FC, ReactNode } from 'react';
import { Flex } from 'antd';

/** A group of choices on a step, with its heading and why it is asked. */
export const Group: FC<{ title: string; sub?: string; error?: string; children: ReactNode }> = ({
  title,
  sub,
  error,
  children,
}) => (
  <Flex vertical gap={12}>
    <Flex vertical gap={2}>
      <h3 className="type-h4 m-0 text-ink">{title}</h3>
      {sub && <p className="type-body-s m-0 text-ink-3">{sub}</p>}
    </Flex>
    {children}
    {error && (
      <p data-refusal className="type-body-s m-0 text-bad">
        {error}
      </p>
    )}
  </Flex>
);
