import type { FC, ReactNode } from 'react';

import { Icon, cx } from '@/components/ui';

type Props = {
  label: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Right-aligned detail: a reference number or what the toggle covers. */
  detail?: ReactNode;
  className?: string;
};

/**
 * A 48 px toggle for gloved hands (DESIGN.md, Escort cab surface). Ticked is the strong neutral box
 * of the Checkbox: green is kept for facts that are done, gold for the one action.
 */
export const Toggle48: FC<Props> = ({ label, checked, onChange, detail, className }) => (
  <label
    className={cx(
      'flex h-12 cursor-pointer items-center gap-3 rounded-md border border-line-strong bg-input pr-4 pl-3',
      'has-[:focus-visible]:outline-[1.5px] has-[:focus-visible]:outline-offset-2',
      'has-[:focus-visible]:outline-gold has-[:focus-visible]:outline-solid',
      className,
    )}
  >
    <input
      type="checkbox"
      className="sr-only"
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
    />
    <span
      aria-hidden
      className={cx(
        'grid size-6 shrink-0 place-items-center rounded-[6px]',
        checked ? 'bg-ink text-canvas' : 'border-[1.5px] border-line-strong',
      )}
    >
      {checked && <Icon name="check" size={16} strokeWidth={2.25} />}
    </span>
    <span className="type-label-m whitespace-nowrap text-ink">{label}</span>
    {detail && <span className="type-caption ml-auto truncate text-ink-2">{detail}</span>}
  </label>
);
