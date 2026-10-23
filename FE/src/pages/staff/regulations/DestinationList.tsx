import { type FC, useState } from 'react';
import { Flex, Input } from 'antd';
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
    <div className="w-full shrink-0 rounded-lg border border-line bg-card p-3 lg:w-64">
      <Flex vertical gap={12}>
        <span className="type-h4 px-1 pt-1 text-ink">Destinations</span>

        <Input
          prefix={<SearchOutlined className="text-ink-3" />}
          placeholder="Country"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="rounded-md"
          allowClear
        />

        <Flex vertical gap={4}>
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
        </Flex>
      </Flex>
    </div>
  );
};

export default DestinationList;
