import { type FC, useState } from 'react';
import { Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { Chip } from '@/components/ui';
import { BORDER_CROSSINGS, type DestinationItem } from './constants';

type Props = {
  countries: DestinationItem[];
  selectedId: string;
  onSelect: (id: string) => void;
};

const matches = (item: DestinationItem, query: string) =>
  item.label.toLowerCase().includes(query) || item.code.toLowerCase().includes(query);

/** The destinations sidebar: country catalogs, then border crossings, filtered by one search. */
const DestinationList: FC<Props> = ({ countries, selectedId, onSelect }) => {
  const [search, setSearch] = useState('');
  const query = search.trim().toLowerCase();
  const shownCountries = query ? countries.filter((c) => matches(c, query)) : countries;
  const shownCrossings = query
    ? BORDER_CROSSINGS.filter((b) => matches(b, query))
    : BORDER_CROSSINGS;

  return (
    <div className="flex w-full shrink-0 flex-col gap-3 rounded-lg border border-line bg-card p-3 lg:w-64">
      <span className="type-h4 px-1 pt-1 text-ink">Destinations</span>

      <Input
        prefix={<SearchOutlined className="text-ink-3" />}
        placeholder="Country or crossing"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        className="rounded-md"
        allowClear
      />

      <div className="flex flex-col gap-1">
        <span className="type-body-s px-1 font-medium text-ink-3">Countries</span>
        {shownCountries.map((item) => (
          <DestinationButton
            key={item.id}
            item={item}
            selected={selectedId === item.id}
            onSelect={onSelect}
          />
        ))}
      </div>

      <div className="flex flex-col gap-1 border-t border-line pt-2">
        <span className="type-body-s px-1 font-medium text-ink-3">Border crossings</span>
        {shownCrossings.map((item) => (
          <DestinationButton
            key={item.id}
            item={item}
            selected={selectedId === item.id}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
};

/** One destination row: its code, its name, and its version or a Draft chip. */
const DestinationButton: FC<{
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

export default DestinationList;
