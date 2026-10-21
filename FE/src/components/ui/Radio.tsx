import type { FC } from 'react';

import { cx } from './tone';
import type { InputProps } from './Checkbox';
import { LABEL } from './choiceStyles';

const CIRCLE = [
  'grid size-5 shrink-0 place-items-center rounded-full border border-line-strong bg-input',
  'peer-checked:border-[1.5px] peer-checked:border-ink peer-checked:[&>span]:bg-ink',
  'peer-focus-visible:outline-[1.5px] peer-focus-visible:outline-offset-4',
  'peer-focus-visible:outline-gold peer-focus-visible:outline-solid',
].join(' ');

/** A single choice in a group (same name). Large targets use Option card instead. */
export const Radio: FC<InputProps> = ({ label, className, ...rest }) => (
  <label className={cx(LABEL, className)}>
    <input type="radio" className="peer sr-only" {...rest} />
    <span aria-hidden className={CIRCLE}>
      <span className="size-2.5 rounded-full" />
    </span>
    {label}
  </label>
);
