import { type FC } from 'react';
import { Flex } from 'antd';
import { Chip } from '@/components/ui';
import type { DestinationItem } from './constants';

/** One destination row: its code, its name, and its version, a Draft chip, or No catalog. */
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
    <Flex align="center" gap={10} className="min-w-0">
      <Flex
        component="span"
        align="center"
        justify="center"
        className="h-[22px] w-[30px] shrink-0 rounded border border-line-strong font-mono text-[11px] font-medium text-ink-2"
      >
        {item.code}
      </Flex>
      <span
        className={`type-label-s truncate ${selected ? 'font-semibold text-ink' : 'text-ink-2'}`}
      >
        {item.label}
      </span>
    </Flex>
    {item.version === null ? (
      <span className="type-caption shrink-0 text-ink-3">No catalog</span>
    ) : item.hasDraft ? (
      <Chip tone="warn" dot={false}>
        Draft
      </Chip>
    ) : (
      <span className="type-caption shrink-0 text-ink-3">{item.version}</span>
    )}
  </button>
);
