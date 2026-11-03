import type { FC } from 'react';

import { Icon, TONE_FG, cx } from '@/components/ui';
import type { HorseCondition } from '@/interfaces';
import { HorseConditionEnum } from '@/interfaces';

const WORDS: { value: HorseCondition; label: string; on: string }[] = [
  { value: HorseConditionEnum.SOUND, label: 'Sound', on: `bg-ok-soft border-ok ${TONE_FG.ok}` },
  {
    value: HorseConditionEnum.WATCH,
    label: 'Watch',
    on: `bg-warn-soft border-warn ${TONE_FG.warn}`,
  },
  {
    value: HorseConditionEnum.CONCERN,
    label: 'Concern',
    on: `bg-bad-soft border-bad ${TONE_FG.bad}`,
  },
];

type Props = {
  horse: string;
  value: HorseCondition | null;
  onChange: (value: HorseCondition) => void;
};

/**
 * Sound / Watch / Concern at touch size. The chosen word is said three ways so it survives glare: a
 * check before it, a 1.5 px border in the full status colour, and its tone fill.
 */
export const ConditionSegment: FC<Props> = ({ horse, value, onChange }) => (
  <div
    role="radiogroup"
    aria-label={`${horse} condition`}
    className="flex shrink-0 overflow-hidden rounded-md border border-line-strong"
  >
    {WORDS.map((word, i) => {
      const on = word.value === value;
      return (
        <label
          key={word.value}
          className={cx(
            'type-label-m flex h-[52px] w-28 cursor-pointer items-center justify-center gap-1.5',
            'has-[:focus-visible]:outline-[1.5px] has-[:focus-visible]:-outline-offset-4',
            'has-[:focus-visible]:outline-gold has-[:focus-visible]:outline-solid',
            on ? `border-[1.5px] ${word.on}` : 'text-ink-2',
            !on && i > 0 && 'border-l border-line-strong',
          )}
        >
          <input
            type="radio"
            name={`condition-${horse}`}
            className="sr-only"
            checked={on}
            onChange={() => onChange(word.value)}
          />
          {on && <Icon name="check" size={16} />}
          {word.label}
        </label>
      );
    })}
  </div>
);
