import type { FC, ReactNode } from 'react';
import { Flex } from 'antd';

import { cx, Icon, type IconName, Panel } from '@/components/ui';

const TONE: Record<'neutral' | 'warn' | 'bad', string> = {
  neutral: 'bg-muted text-ink-2',
  warn: 'bg-warn-soft text-warn',
  bad: 'bg-bad-soft text-bad',
};

type Props = {
  tone?: keyof typeof TONE;
  icon: IconName;
  /** A short reference to quote to support, in mono: "Error 503 · GET /staff/jobs". */
  reference?: string;
  title: string;
  /** What happened and what to do, in a sentence or two. */
  children: ReactNode;
  /** At most one primary (gold) button, then the way back. */
  actions: ReactNode;
  /** The raw error message; pass it in development only. */
  detail?: string;
};

/**
 * A page that couldn't be shown (the error boundary's fallback): says what happened in plain words,
 * what the person can do, and how to get back to their work, in the panel style of "Not allowed".
 */
export const ErrorPage: FC<Props> = ({
  tone = 'neutral',
  icon,
  reference,
  title,
  children,
  actions,
  detail,
}) => (
  // The boundary replaces the shell's padded content area, so the page brings its own padding.
  <div className="px-10 py-16">
    <Flex justify="center">
      <Panel className="w-full max-w-160">
        <div className="p-4">
          <Flex vertical align="start" gap={16}>
            <Flex
              component="span"
              align="center"
              justify="center"
              className={cx('size-11 rounded-full', TONE[tone])}
            >
              <Icon name={icon} size={20} />
            </Flex>
            {reference && <span className="type-mono-label text-ink-3">{reference}</span>}
            <h1 className="type-h3 m-0 text-ink">{title}</h1>
            <div className="type-body-m m-0 text-ink-2">{children}</div>
            {detail && (
              <pre className="type-caption m-0 w-full font-mono overflow-x-auto rounded-md border border-line bg-sunken p-3 whitespace-pre-wrap text-ink-2">
                {detail}
              </pre>
            )}
            <Flex gap={12} wrap>
              {actions}
            </Flex>
          </Flex>
        </div>
      </Panel>
    </Flex>
  </div>
);
