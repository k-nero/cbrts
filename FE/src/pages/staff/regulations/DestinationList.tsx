import { type FC, useState } from 'react';
import { Flex, Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { DestinationItem } from './constants';
import { DestinationButton } from './DestinationButton';

import { Button } from '@/components/ui';

type Props = {
  countries: DestinationItem[];
  selectedId: string;
  onSelect: (id: string) => void;
  /** Opens Add country; absent for a role that only reads the catalogs. */
  onAdd?: () => void;
};

const matches = (item: DestinationItem, query: string) =>
  item.label.toLowerCase().includes(query) || item.code.toLowerCase().includes(query);

/**
 * The destinations sidebar: one regulation catalog per country. Rules for a crossing live in the
 * country catalog as "Per crossing" documents, so crossings have no catalog of their own.
 */
const DestinationList: FC<Props> = ({ countries, selectedId, onSelect, onAdd }) => {
  const [search, setSearch] = useState('');
  const query = search.trim().toLowerCase();
  const shown = query ? countries.filter((c) => matches(c, query)) : countries;

  return (
    <div className="w-full rounded-lg border border-line bg-card p-3">
      <Flex vertical gap={12}>
        <div className="px-1 pt-1">
          <Flex align="center" justify="space-between" gap={8}>
            <span className="type-h4 text-ink">Destinations</span>
            {onAdd && (
              <Button size="sm" variant="ghost" leadingIcon="plus" onClick={onAdd}>
                Add country
              </Button>
            )}
          </Flex>
        </div>

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
            <span className="type-body-s px-1 text-ink-3">
              {countries.length === 0
                ? 'No countries yet. Add the first one.'
                : 'No country matches.'}
            </span>
          )}
        </Flex>
      </Flex>
    </div>
  );
};

export default DestinationList;
