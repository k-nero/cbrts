import type { FC, ReactNode } from 'react';

import { Icon, type IconName } from './Icon';
import { cx, type StatusTone, TONE_FG, TONE_SURFACE } from './tone';

const ICON: Record<StatusTone, IconName> = {
  info: 'info',
  ok: 'check',
  warn: 'alert',
  bad: 'alert',
};

type Props = {
  tone: StatusTone;
  title: ReactNode;
  children?: ReactNode;
  /** A Secondary or Ghost control; the gold belongs to the view's one forward action. */
  action?: ReactNode;
  className?: string;
};

/**
 * An inline rule or refusal (DESIGN.md, Callout). It names the rule, the value found and the fix,
 * and sits beside its cause; other places refer to it neutrally (Say it once).
 */
export const Callout: FC<Props> = ({ tone, title, children, action, className }) => (
  <div
    role={tone === 'bad' ? 'alert' : undefined}
    className={cx('flex gap-3 rounded-md border p-4', TONE_SURFACE[tone], className)}
  >
    <Icon name={ICON[tone]} size={18} className={cx('mt-px shrink-0', TONE_FG[tone])} />
    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
      <span className="type-label-m text-ink">{title}</span>
      {children && <div className="type-body-s text-ink-2">{children}</div>}
      {action && <div className="mt-2.5 flex gap-2">{action}</div>}
    </div>
  </div>
);
