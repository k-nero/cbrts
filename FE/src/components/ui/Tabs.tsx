import type { ReactNode } from 'react';

import { cx } from './tone';

export type TabItem<K extends string> = {
  key: K;
  label: ReactNode;
  /** Shown inline: "Blocked · 3". */
  count?: number;
  disabled?: boolean;
};

type Props<K extends string> = {
  items: TabItem<K>[];
  activeKey: K;
  onChange: (key: K) => void;
  /** Accessible name for the tab list. */
  label: string;
  /** Right-hand content on the tab line, such as the tab's owner ("Owner Lan, transport specialist"). */
  extra?: ReactNode;
  className?: string;
};

/** In-page views (DESIGN.md, Tabs): Label M, active in Parchment with a 2 px gold underline. */
export const Tabs = <K extends string>({
  items,
  activeKey,
  onChange,
  label,
  extra,
  className,
}: Props<K>) => (
  <div className={cx('flex items-end justify-between gap-6 border-b border-line', className)}>
    <div role="tablist" aria-label={label} className="flex gap-6">
      {items.map((item) => {
        const active = item.key === activeKey;
        return (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={item.disabled}
            onClick={() => onChange(item.key)}
            className={cx(
              'focus-ring type-label-m -mb-px flex cursor-pointer flex-col gap-3 border-0 bg-transparent',
              'px-1 pt-3 disabled:cursor-not-allowed disabled:opacity-45',
              active ? 'text-ink' : 'text-ink-3 enabled:hover:text-ink-2',
            )}
          >
            <span>
              {item.label}
              {item.count !== undefined && ` · ${item.count}`}
            </span>
            <span
              aria-hidden
              className={cx('h-0.5 w-full rounded-full', active ? 'bg-gold' : 'bg-transparent')}
            />
          </button>
        );
      })}
    </div>
    {extra && <div className="type-label-s pb-3 text-ink-3">{extra}</div>}
  </div>
);
