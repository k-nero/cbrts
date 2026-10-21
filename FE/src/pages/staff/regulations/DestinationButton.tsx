import { type FC } from 'react';
import { Chip } from '@/components/ui';
import type { DestinationItem } from './constants';

/** One destination row: its code, its name, and its version or a Draft chip. */
export const DestinationButton: FC<{
  item: DestinationItem;
  selected: boolean;
  onSelect: (id: string) => void;
}> = ({ item, selected, onSelect }) => (
  <button
    type="button"
    onClick={() => onSelect(item.id)}
    className={`flex w-full cursor-pointer items-center justify-between gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors ${
      selected ? 'border border-line bg-sunken' : 'border border-transparent hover:bg-sunken/50'
    }`}
  >
    <div className="flex min-w-0 items-center gap-2.5">
      <span className="grid h-[22px] w-[30px] shrink-0 place-items-center rounded border border-line-strong font-mono text-[11px] font-medium text-ink-2">
        {item.code}
      </span>
      <span
        className={`type-label-s truncate ${selected ? 'font-semibold text-ink' : 'text-ink-2'}`}
      >
        {item.label}
      </span>
    </div>
    {item.hasDraft ? (
      <Chip tone="warn" dot={false} className="px-1.5 py-0.5 text-[11px]">
        Draft
      </Chip>
    ) : (
      <span className="type-mono shrink-0 text-[11px] text-ink-3">{item.version}</span>
    )}
  </button>
);
