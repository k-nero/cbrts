import type { ComponentPropsWithRef, FC, ReactNode } from 'react';

import { Icon } from './Icon';
import { cx } from './tone';

/*
 * A checked box or selected radio is a strong neutral (Paper Ink) on every surface: gold stays for
 * the one action, green for facts that are done (DESIGN.md, Checkbox).
 */

/** The box alone, for controlled indicators such as the one inside Option card. */
export const CheckMark: FC<{ checked: boolean; className?: string }> = ({ checked, className }) => (
  <span
    aria-hidden
    className={cx(
      'grid size-[18px] shrink-0 place-items-center rounded-sm border',
      checked ? 'border-ink bg-ink text-canvas' : 'border-line-strong bg-input text-transparent',
      className,
    )}
  >
    <Icon name="check" size={14} strokeWidth={2.25} />
  </span>
);

/** The radio circle alone. */
export const RadioMark: FC<{ checked: boolean; className?: string }> = ({ checked, className }) => (
  <span
    aria-hidden
    className={cx(
      'grid size-5 shrink-0 place-items-center rounded-full bg-input',
      checked ? 'border-[1.5px] border-ink' : 'border border-line-strong',
      className,
    )}
  >
    {checked && <span className="size-2.5 rounded-full bg-ink" />}
  </span>
);

type InputProps = Omit<ComponentPropsWithRef<'input'>, 'type'> & {
  label?: ReactNode;
};

const LABEL = [
  'inline-flex w-fit cursor-pointer items-center gap-2.5 type-body-m text-ink',
  'has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50',
].join(' ');

/* The native input stays in the page for keyboard and forms; the mark is drawn from its state. */
const BOX = [
  'grid size-[18px] shrink-0 place-items-center rounded-sm border border-line-strong bg-input',
  'text-transparent peer-checked:border-ink peer-checked:bg-ink peer-checked:text-canvas',
  'peer-focus-visible:outline-[1.5px] peer-focus-visible:outline-offset-4',
  'peer-focus-visible:outline-gold peer-focus-visible:outline-solid',
].join(' ');

const CIRCLE = [
  'grid size-5 shrink-0 place-items-center rounded-full border border-line-strong bg-input',
  'peer-checked:border-[1.5px] peer-checked:border-ink peer-checked:[&>span]:bg-ink',
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
