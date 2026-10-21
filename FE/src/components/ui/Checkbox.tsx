import type { ComponentPropsWithRef, FC, ReactNode } from 'react';

import { Icon } from './Icon';
import { cx } from './tone';
import { LABEL } from './choiceStyles';

export type InputProps = Omit<ComponentPropsWithRef<'input'>, 'type'> & {
  label?: ReactNode;
};

/* The native input stays in the page for keyboard and forms; the mark is drawn from its state. */
const BOX = [
  'grid size-[18px] shrink-0 place-items-center rounded-sm border border-line-strong bg-input',
  'text-transparent peer-checked:border-ink peer-checked:bg-ink peer-checked:text-canvas',
  'peer-focus-visible:outline-[1.5px] peer-focus-visible:outline-offset-4',
  'peer-focus-visible:outline-gold peer-focus-visible:outline-solid',
].join(' ');

/** A multi-select control the reader can change. Something already true is a fact line, not this. */
export const Checkbox: FC<InputProps> = ({ label, className, ...rest }) => (
  <label className={cx(LABEL, className)}>
    <input type="checkbox" className="peer sr-only" {...rest} />
    <span aria-hidden className={BOX}>
      <Icon name="check" size={14} strokeWidth={2.25} />
    </span>
    {label}
  </label>
);
