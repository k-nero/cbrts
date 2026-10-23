import { Icon } from '@/components/ui';

type Props = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  sub?: string;
  disabled?: boolean;
};

export function Toggle48({ label, checked, onChange, sub, disabled }: Props) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`flex h-12 w-full items-center justify-between gap-3 rounded-lg border px-4 transition-colors ${
        checked
          ? 'border-line-strong bg-card text-ink'
          : 'border-line bg-muted/30 text-ink-2 hover:bg-muted/60'
      } cursor-pointer disabled:cursor-not-allowed disabled:opacity-50`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`flex size-6 items-center justify-center rounded-md border transition-colors ${
            checked ? 'border-ink bg-ink text-canvas' : 'border-line-strong bg-transparent'
          }`}
        >
          {checked && <Icon name="check" size={16} />}
        </span>
        <span className="type-label-m text-ink">{label}</span>
      </div>
      {sub && <span className="type-mono-caption text-ink-2">{sub}</span>}
    </button>
  );
}
