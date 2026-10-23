import type { FC } from 'react';
import { Link } from 'react-router-dom';
import { Flex, Tooltip } from 'antd';

import { Chip } from './Chip';
import { cx, type Tone } from './tone';

type Props = {
  title: string;
  body?: string | null;
  /** The state in words beside its tone: "Answer needed", "Trip held". */
  kindLabel: string;
  tone: Tone;
  /** The record's code in mono: REQ-2026-0031. */
  code: string;
  /** "3 h ago". */
  when: string;
  /** The exact time, in a tooltip on `when`: "23 Oct, 14:02". */
  whenExact: string;
  unread: boolean;
  /** The record's page. */
  to: string;
  onOpen?: () => void;
};

/**
 * One notification in the bell's panel (DESIGN.md, Notification centre): a link to the record it is
 * about. Unread rows sit on the raised surface with a dot and a Parchment title; read rows are
 * flat with a Mist title. The kind is a chip, so the state is said in words as well as tone.
 */
export const NotificationItem: FC<Props> = ({
  title,
  body,
  kindLabel,
  tone,
  code,
  when,
  whenExact,
  unread,
  to,
  onOpen,
}) => (
  <Link
    to={to}
    onClick={onOpen}
    className={cx(
      'focus-ring block px-4 py-3 no-underline transition-colors hover:bg-muted',
      unread && 'bg-raised',
    )}
  >
    <Flex gap={12} align="start">
      <span
        aria-hidden
        className={cx('mt-1.5 size-2 shrink-0 rounded-full', unread ? 'bg-ink' : 'bg-transparent')}
      />
      <Flex vertical gap={6} className="min-w-0 flex-1">
        <span className={cx('type-label-m', unread ? 'text-ink' : 'text-ink-2')}>
          {unread && <span className="sr-only">Unread: </span>}
          {title}
        </span>
        {body && <span className="type-body-s line-clamp-2 text-ink-3">{body}</span>}
        <Flex gap={8} align="center" wrap>
          <Chip tone={tone}>{kindLabel}</Chip>
          <span className="type-caption text-ink-2">{code}</span>
          <Tooltip title={whenExact}>
            <span className="type-caption text-ink-3">{when}</span>
          </Tooltip>
        </Flex>
      </Flex>
    </Flex>
  </Link>
);
