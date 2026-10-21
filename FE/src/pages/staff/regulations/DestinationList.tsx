import { type FC, useState } from 'react';
import { Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { DestinationItem } from './constants';
import { DestinationButton } from './DestinationButton';

type Props = {
  countries: DestinationItem[];
  selectedId: string;
  onSelect: (id: string) => void;
};

const matches = (item: DestinationItem, query: string) =>
  item.label.toLowerCase().includes(query) || item.code.toLowerCase().includes(query);

/**
 * The destinations sidebar: one regulation catalog per country. Rules for a crossing live in the
 * country catalog as "Per crossing" documents, so crossings have no catalog of their own.
 */
const DestinationList: FC<Props> = ({ countries, selectedId, onSelect }) => {
  const [search, setSearch] = useState('');
  const query = search.trim().toLowerCase();
  const shown = query ? countries.filter((c) => matches(c, query)) : countries;

  return (
    <div className="flex w-full shrink-0 flex-col gap-3 rounded-lg border border-line bg-card p-3 lg:w-64">
      <span className="type-h4 px-1 pt-1 text-ink">Destinations</span>

      <Input
        prefix={<SearchOutlined className="text-ink-3" />}
        placeholder="Country"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        className="rounded-md"
        allowClear
      />

      <div className="flex flex-col gap-1">
        {shown.map((item) => (
          <DestinationButton
            key={item.id}
            item={item}
            selected={selectedId === item.id}
            onSelect={onSelect}
          />
        ))}
        {shown.length === 0 && (
          <span className="type-body-s px-1 text-ink-3">No country matches.</span>
        )}
      </div>
    </div>
  );
};

export default DestinationList;
