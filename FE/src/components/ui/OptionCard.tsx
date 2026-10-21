import type { ChangeEvent, FC, ReactNode } from 'react';

import { CheckMark } from './CheckMark';
import { RadioMark } from './RadioMark';
import { Icon, type IconName } from './Icon';
import { cx } from './tone';

type Props = {
  /** 'checkbox' for multi-select (horses on a request); 'radio' for one choice in a group. */
  type?: 'checkbox' | 'radio';
  /** Groups radio cards; also the form field name. */
  name?: string;
  value?: string;
  selected: boolean;
  onChange?: (selected: boolean, event: ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  icon?: IconName;
  /** In place of the icon: a 48 px coat swatch on a horse pick card. */
  media?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /**
   * The card's effect, said in words or a figure: "In the estimate", "+ $2,400 – $3,300", who
   * answers a note. On a disabled card it names why and the nearest alternative (warn tone).
   */
  meta?: ReactNode;
  /** Under the meta: a horse's chips, or a note on what picking it changes. */
  children?: ReactNode;
  className?: string;
};

/**
 * A large selectable target (DESIGN.md, Option card). Selected is a strong neutral border and mark
 * on Lifted Navy, never gold. Disabled cards stay readable and carry the reason.
 */
export const OptionCard: FC<Props> = ({
  type = 'radio',
  name,
  value,
  selected,
  onChange,
  disabled,
  icon,
  media,
  title,
  description,
  meta,
  children,
  className,
}) => (
  <label
    className={cx(
      'flex flex-col gap-2.5 rounded-lg p-5 transition-colors',
      'has-[:focus-visible]:outline-[1.5px] has-[:focus-visible]:outline-offset-4',
      'has-[:focus-visible]:outline-gold has-[:focus-visible]:outline-solid',
      selected
        ? 'border-[1.5px] border-ink-2 bg-raised'
        : 'border border-line bg-card hover:border-line-strong',
      disabled ? 'cursor-not-allowed opacity-55' : 'cursor-pointer',
      className,
    )}
  >
    <input
      type={type}
      name={name}
      value={value}
      checked={selected}
      disabled={disabled}
      onChange={(e) => onChange?.(e.target.checked, e)}
      className="sr-only"
    />
    <span className="flex items-center justify-between">
      {media ? (
        media
      ) : icon ? (
        <span className="grid size-9 place-items-center rounded-md bg-muted text-ink-2">
          <Icon name={icon} size={20} />
        </span>
      ) : (
        <span />
      )}
      {type === 'checkbox' ? <CheckMark checked={selected} /> : <RadioMark checked={selected} />}
    </span>
    <span className="type-h4 text-ink">{title}</span>
    {description && <span className="type-body-s text-ink-3">{description}</span>}
    {meta && (
      <span className={cx('type-label-s', disabled ? 'text-warn' : 'text-ink-2')}>{meta}</span>
    )}
    {children}
  </label>
);
