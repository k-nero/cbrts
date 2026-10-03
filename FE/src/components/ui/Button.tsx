import type { ComponentPropsWithRef, FC } from 'react';

import { Icon, type IconName } from './Icon';
import { cx } from './tone';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'md' | 'sm';

const BASE = [
  'focus-ring inline-flex shrink-0 cursor-pointer items-center justify-center rounded-md border',
  'whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-45',
].join(' ');

const SIZE: Record<ButtonSize, string> = {
  md: 'type-label-m h-10 gap-2 px-[18px]',
  sm: 'type-label-s h-8 gap-1.5 px-3',
};

const VARIANT: Record<ButtonVariant, string> = {
  primary: 'border-transparent bg-gold text-gold-on enabled:hover:bg-gold-hover',
  secondary: 'border-line-strong bg-transparent text-ink enabled:hover:bg-muted',
  ghost:
    'border-transparent bg-transparent text-ink-2 enabled:hover:bg-muted enabled:hover:text-ink',
  danger: 'border-bad-line bg-transparent text-bad enabled:hover:bg-bad-soft',
};

type Props = ComponentPropsWithRef<'button'> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leadingIcon?: IconName;
  trailingIcon?: IconName;
  /** Fill the parent's width. */
  block?: boolean;
};

/**
 * Quiet and outlined, with one gold exception (DESIGN.md, Buttons). Primary is the single forward
 * action on a view. Danger is outlined, never filled. An action that is unavailable because
 * something upstream is missing is a disabled Secondary, never a faded gold.
 */
export const Button: FC<Props> = ({
  variant = 'secondary',
  size = 'md',
  leadingIcon,
  trailingIcon,
  block,
  type = 'button',
  className,
  children,
  ...rest
}) => {
  const iconSize = size === 'md' ? 16 : 14;
  return (
    <button
      type={type}
      className={cx(BASE, SIZE[size], VARIANT[variant], block && 'w-full', className)}
      {...rest}
    >
      {leadingIcon && <Icon name={leadingIcon} size={iconSize} />}
      {children}
      {trailingIcon && <Icon name={trailingIcon} size={iconSize} />}
    </button>
  );
};
