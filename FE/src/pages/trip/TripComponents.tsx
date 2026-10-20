import type { FC, ReactNode } from 'react';
import { Button, Checkbox, Chip, Icon, Panel, type Tone } from '@/components/ui';
import { ict } from '@/lib/utils/time';

/** Converts "HH:mm" to minutes from midnight. */
export function toMin(timeStr: string): number {
  const parts = timeStr.split(':');
  if (parts.length < 2) return 0;
  return Number.parseInt(parts[0], 10) * 60 + Number.parseInt(parts[1], 10);
}

/** Converts minutes from midnight to "HH:mm". */
export function fromMin(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h < 10 ? '0' : ''}${h}:${m < 10 ? '0' : ''}${m}`;
}

/** Formats duration into "X h Y min" or "Y min". */
export function durText(mins: number): string {
  const abs = Math.abs(mins);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (h > 0) {
    return `${h} h${m > 0 ? ` ${m} min` : ''}`;
  }
  return `${m} min`;
}

/** Extracts "HH:mm" in ICT time from an ISO timestamp. */
export function formatTimeOnly(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return ict(iso).format('HH:mm');
  } catch {
    return '—';
  }
}

/** Formats "D MMM YYYY, HH:mm" in ICT time. */
export function formatFullTime(iso: string | null | undefined): string {
  if (!iso) return 'Not recorded';
  try {
    return ict(iso).format('D MMM YYYY, HH:mm');
  } catch {
    return 'Not recorded';
  }
}

/** Calculates planned vs recorded delay/advance text. */
export function againstPlanText(plannedIso: string | null, recordedIso: string | null): string {
  if (!plannedIso || !recordedIso) return '—';
  try {
    const planned = ict(plannedIso);
    const recorded = ict(recordedIso);
    const diff = recorded.diff(planned, 'minute');
    if (diff === 0) return 'On time';
    return diff > 0 ? `+${durText(diff)}` : `−${durText(Math.abs(diff))}`;
  } catch {
    return '—';
  }
}

/** Sentence case for enum values. */
export function sentence(value: string | null | undefined): string {
  if (!value) return '';
  return value.charAt(0) + value.slice(1).toLowerCase().replaceAll('_', ' ');
}

// ---------------------------------------------------------------------------
// CabBar (Figma: cabBar)
// ---------------------------------------------------------------------------
export type CabBarProps = {
  jobCode: string;
  route: string;
  pill: { label: string; tone: Tone };
  synced: boolean;
  syncLabel: string;
  nowTime: string;
  user: { name: string; role: string; initials: string };
  onSignOut?: () => void;
  jobSelector?: ReactNode;
};

export const CabBar: FC<CabBarProps> = ({
  jobCode,
  route,
  pill,
  synced,
  syncLabel,
  nowTime,
  user,
  onSignOut,
  jobSelector,
}) => (
  <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line bg-card px-6 py-3.5 shadow-sm">
    <div className="flex flex-wrap items-center gap-3">
      {jobSelector}
      <span className="type-mono-data text-ink-2">{jobCode}</span>
      <h2 className="type-h4 m-0 text-ink">{route}</h2>
      <div className="flex items-center gap-1.5">
        <span className="type-label-s text-ink">Trip</span>
        <span className="type-mono-caption text-ink-3">6 of 7</span>
      </div>
      <Chip tone={pill.tone}>{pill.label}</Chip>
    </div>

    <div className="flex items-center gap-6">
      <div className="flex items-center gap-2">
        <Icon
          name={synced ? 'check' : 'clock'}
          size={18}
          className={synced ? 'text-ok' : 'text-warn'}
        />
        <span className={`type-label-s ${synced ? 'text-ink-3' : 'text-warn'}`}>{syncLabel}</span>
      </div>

      <div className="type-data-l font-mono text-2xl font-bold tracking-tight text-ink">
        {nowTime}
      </div>

      <div className="flex items-center gap-2.5 border-l border-line pl-4">
        <div className="grid size-9 place-items-center rounded-full bg-muted font-medium text-ink-2">
          {user.initials}
        </div>
        <div className="flex flex-col text-left">
          <span className="type-label-s leading-tight text-ink">{user.name}</span>
          <span className="type-body-s leading-tight text-ink-3">{user.role}</span>
        </div>
        {onSignOut && (
          <Button variant="secondary" size="sm" onClick={onSignOut} className="ml-2">
            Sign out
          </Button>
        )}
      </div>
    </div>
  </header>
);

// ---------------------------------------------------------------------------
// CabStrip (Figma: cabStrip)
// ---------------------------------------------------------------------------
export type CabStripStop = {
  id: string;
  name: string;
  kind: string;
  state: 'done' | 'current' | 'upcoming' | 'held';
  time: string;
  note: string;
};

export const CabStrip: FC<{
  stops: CabStripStop[];
  selectedStopId?: string;
  onSelectStop?: (id: string) => void;
}> = ({ stops, selectedStopId, onSelectStop }) => (
  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
    {stops.map((s) => {
      const isHeld = s.state === 'held';
      const isCur = s.state === 'current' || isHeld;
      const isDone = s.state === 'done';
      const isSelected = selectedStopId === s.id;

      let cardStyle = 'bg-card border-line';
      let dotColor = 'border-2 border-line-strong bg-canvas';
      let textColor = 'text-ink-3';

      if (isHeld) {
        cardStyle = 'bg-bad-soft border-bad border-[1.5px]';
        dotColor = 'bg-bad';
        textColor = 'text-bad';
      } else if (isCur) {
        cardStyle = 'bg-info-soft border-info border-[1.5px]';
        dotColor = 'bg-info';
        textColor = 'text-info';
      } else if (isDone) {
        dotColor = 'bg-ok';
        textColor = 'text-ink-2';
      }

      if (isSelected && !isCur) {
        cardStyle += ' ring-2 ring-ink';
      }

      return (
        <button
          type="button"
          key={s.id}
          onClick={() => onSelectStop?.(s.id)}
          className={`flex flex-col gap-1 rounded-xl p-3.5 text-left transition-all ${cardStyle} ${
            onSelectStop ? 'cursor-pointer hover:border-line-strong' : ''
          }`}
        >
          <div className="flex items-center gap-2">
            <span className={`size-2.5 rounded-full ${dotColor}`} />
            <strong className="type-label-m truncate text-ink">{s.name}</strong>
          </div>
          <span className="type-body-s text-ink-3">{s.kind}</span>
          <span
            className={`type-data-l font-mono text-xl font-bold ${
              isDone ? 'text-ink-2' : 'text-ink'
            }`}
          >
            {s.time}
          </span>
          <span className={`type-body-s truncate ${textColor}`}>{s.note}</span>
        </button>
      );
    })}
  </div>
);

// ---------------------------------------------------------------------------
// ConditionControl (Figma: conditionControl)
// ---------------------------------------------------------------------------
export type ConditionPick = 'SOUND' | 'WATCH' | 'CONCERN';

export const ConditionControl: FC<{
  value: ConditionPick;
  onChange: (value: ConditionPick) => void;
}> = ({ value, onChange }) => {
  const options: Array<{ key: ConditionPick; label: string; tone: Tone }> = [
    { key: 'SOUND', label: 'Sound', tone: 'ok' },
    { key: 'WATCH', label: 'Watch', tone: 'warn' },
    { key: 'CONCERN', label: 'Concern', tone: 'bad' },
  ];

  return (
    <div className="inline-flex overflow-hidden rounded-lg border border-line-strong bg-card shadow-xs">
      {options.map((opt, idx) => {
        const isSelected = value === opt.key;
        let activeStyles = 'text-ink-2 hover:bg-muted';
        if (isSelected) {
          if (opt.tone === 'ok')
            activeStyles = 'bg-ok-soft text-ok border-ok border-[1.5px] font-semibold';
          else if (opt.tone === 'warn')
            activeStyles = 'bg-warn-soft text-warn border-warn border-[1.5px] font-semibold';
          else if (opt.tone === 'bad')
            activeStyles = 'bg-bad-soft text-bad border-bad border-[1.5px] font-semibold';
        }

        return (
          <button
            type="button"
            key={opt.key}
            onClick={() => onChange(opt.key)}
            className={`flex h-12 w-28 items-center justify-center gap-1.5 px-3 text-sm transition-colors cursor-pointer ${
              idx > 0 ? 'border-l border-line-strong' : ''
            } ${activeStyles}`}
          >
            {isSelected && <Icon name="check" size={16} />}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Toggle48 (Figma: toggle48)
// ---------------------------------------------------------------------------
export const Toggle48: FC<{
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  sub?: string;
  disabled?: boolean;
}> = ({ label, checked, onChange, sub, disabled }) => (
  <button
    type="button"
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`flex h-12 w-full items-center justify-between rounded-lg border border-line-strong bg-input px-4 transition-colors text-left ${
      disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-ink'
    }`}
  >
    <div className="flex items-center gap-3">
      <div
        className={`grid size-6 place-items-center rounded-md border ${
          checked ? 'border-ink bg-ink text-canvas' : 'border-line-strong bg-canvas'
        }`}
      >
        {checked && <Icon name="check" size={16} />}
      </div>
      <span className="type-label-m text-ink">{label}</span>
    </div>
    {sub && <span className="type-mono-caption truncate pl-3 text-right text-ink-3">{sub}</span>}
  </button>
);

// ---------------------------------------------------------------------------
// SignatureBox (Figma: signatureBox)
// ---------------------------------------------------------------------------
export const SignatureBox: FC<{
  name: string;
  when: string;
  onClear?: () => void;
}> = ({ name, when, onClear }) => (
  <div className="flex flex-col gap-2 rounded-lg border border-line-strong bg-input p-3">
    <div className="flex h-16 items-center px-3 font-serif text-3xl italic text-ink">
      {name || 'Signature'}
    </div>
    <div className="flex items-center justify-between border-t border-line pt-2">
      <span className="type-body-s text-ink-3">{when}</span>
      {onClear && (
        <Button variant="secondary" size="sm" onClick={onClear}>
          Clear signature
        </Button>
      )}
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// TaskHead (Figma: taskHead)
// ---------------------------------------------------------------------------
export const TaskHead: FC<{
  title: string;
  sub: string;
}> = ({ title, sub }) => (
  <div className="flex flex-col gap-1 border-b border-line px-6 py-4">
    <h3 className="type-display-m m-0 text-ink">{title}</h3>
    <p className="type-body-m m-0 text-ink-2">{sub}</p>
  </div>
);

// ---------------------------------------------------------------------------
// CabDock (Figma: cabDock)
// ---------------------------------------------------------------------------
export const CabDock: FC<{
  summary: string;
  sub: string;
  secondary?: { label: string; onClick: () => void };
  primary?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    loading?: boolean;
  };
}> = ({ summary, sub, secondary, primary }) => (
  <footer className="fixed bottom-0 left-0 right-0 z-40 flex flex-wrap items-center justify-between gap-4 border-t border-line-strong bg-card px-8 py-3.5 shadow-xl">
    <div className="flex flex-col gap-0.5">
      <strong className="type-label-m text-ink">{summary}</strong>
      <span className="type-body-s text-ink-2">{sub}</span>
    </div>

    <div className="flex items-center gap-3">
      {secondary && (
        <Button
          variant="secondary"
          size="md"
          onClick={secondary.onClick}
          className="h-14 md:h-16 px-6"
        >
          {secondary.label}
        </Button>
      )}
      {primary && (
        <Button
          variant="primary"
          size="md"
          disabled={primary.disabled || primary.loading}
          onClick={primary.onClick}
          leadingIcon="check"
          className="h-14 md:h-16 px-8 text-base font-semibold min-w-[280px] md:min-w-[380px]"
        >
          {primary.loading ? 'Saving…' : primary.label}
        </Button>
      )}
    </div>
  </footer>
);

// ---------------------------------------------------------------------------
// Right Side Panels for Cab (Next stop, On board, Customer sees)
// ---------------------------------------------------------------------------
export const NextStopPanel: FC<{
  title: string;
  sub: string;
  dueText: string;
  dueTime: string;
}> = ({ title, sub, dueText, dueTime }) => (
  <Panel title="Next stop">
    <div className="flex flex-col gap-1.5">
      <h4 className="type-h3 m-0 text-ink">{title}</h4>
      <p className="type-body-s m-0 text-ink-2">{sub}</p>
      <div className="mt-2 flex items-baseline gap-3">
        <span className="type-data-l font-mono text-2xl font-bold text-ink">{dueTime}</span>
        <span className="type-label-m text-info">{dueText}</span>
      </div>
    </div>
  </Panel>
);

export const OnBoardPanel: FC<{
  horses: Array<{ name: string; stall: string | null }>;
  crewText?: string;
}> = ({ horses, crewText = 'Minh, driver · Hoa and Tuấn, grooms' }) => (
  <Panel title="On board">
    <div className="divide-y divide-line">
      {horses.map((h) => (
        <div key={h.name} className="flex items-center justify-between py-2.5">
          <span className="type-label-m text-ink">{h.name}</span>
          <span className="type-body-s text-ink-3">{h.stall ?? 'Standard stall'}</span>
        </div>
      ))}
      <div className="flex items-center justify-between pt-2.5">
        <span className="type-label-m text-ink">Crew</span>
        <span className="type-body-s text-ink-3">{crewText}</span>
      </div>
    </div>
  </Panel>
);

export const CustomerSeesPanel: FC<{ text: string }> = ({ text }) => (
  <Panel title="What the customer sees">
    <p className="type-body-s m-0 leading-relaxed text-ink-2">{text}</p>
  </Panel>
);
