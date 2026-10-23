import { Icon } from '@/components/ui';
import type { HorseCondition } from '@/interfaces';
import { HorseConditionEnum } from '@/interfaces';

type Props = {
  value: HorseCondition;
  onChange: (val: HorseCondition) => void;
  disabled?: boolean;
};

const OPTIONS: Array<{
  value: HorseCondition;
  label: string;
  tone: 'ok' | 'bad' | 'warn';
}> = [
  { value: HorseConditionEnum.STABLE, label: 'Stable', tone: 'ok' },
  { value: HorseConditionEnum.OFF_FEED, label: 'Off feed', tone: 'bad' },
  { value: HorseConditionEnum.STRESSED, label: 'Stressed', tone: 'warn' },
  { value: HorseConditionEnum.CLIMATE_CHANGE, label: 'Climate change', tone: 'warn' },
];

export function ConditionSegmented({ value, onChange, disabled }: Props) {
  return (
    <div className="inline-flex overflow-hidden rounded-lg border border-line-strong bg-card">
      {OPTIONS.map((opt, idx) => {
        const isSelected = value === opt.value;
        const toneClasses =
          opt.tone === 'ok'
            ? 'border-ok text-ok bg-ok-soft/40'
            : opt.tone === 'bad'
              ? 'border-bad text-bad bg-bad-soft/40'
              : 'border-warn text-warn bg-warn-soft/40';

        return (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={`flex h-[52px] min-w-[110px] items-center justify-center gap-1.5 px-3 transition-colors ${
              idx > 0 && !isSelected ? 'border-l border-line-strong' : ''
            } ${
              isSelected
                ? `border-[1.5px] ${toneClasses} font-semibold shadow-inner`
                : 'text-ink-2 hover:bg-muted/50'
            } cursor-pointer disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {isSelected && <Icon name="check" size={16} />}
            <span className="type-label-m">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
