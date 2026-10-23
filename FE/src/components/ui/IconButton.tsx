import type { ComponentPropsWithRef, FC } from 'react';

import { Icon, type IconName } from './Icon';
import { cx } from './tone';

type Props = Omit<ComponentPropsWithRef<'button'>, 'children'> & {
  icon: IconName;
  /** The accessible name. With a count, say what it counts: "Notifications, 3 unread". */
  label: string;
  /** A count in the corner: hidden at 0, 99+ above 99. */
  count?: number;
};

/** "99+" above 99, as every count badge reads (DESIGN.md, Staff sidebar). */
export const badgeCount = (count: number) => (count > 99 ? '99+' : String(count));

/**
 * A 36 px square tool in the shell's corner, with a Rule border (DESIGN.md, App header): the theme
 * toggle and the notification bell. The count is a strong neutral pill, never gold or a status
 * tone, because it says how many, not how bad.
 */
export const IconButton: FC<Props> = ({
  icon,
  label,
  count,
  type = 'button',
  className,
  ...rest
}) => (
  <button
    type={type}
    aria-label={label}
    className={cx(
      'focus-ring relative grid size-9 shrink-0 cursor-pointer place-items-center rounded-md border',
      'border-line-strong bg-transparent text-ink-2 transition-colors hover:bg-muted hover:text-ink',
      className,
    )}
    {...rest}
  >
    <Icon name={icon} size={18} />
    {count !== undefined && count > 0 && (
      <span
        aria-hidden
        className={cx(
          'type-caption absolute -top-2 -right-2 grid h-5 min-w-5 place-items-center rounded-full',
          'bg-ink px-1 text-canvas ring-2 ring-canvas',
        )}
      >
        {badgeCount(count)}
      </span>
    )}
  </button>
);
