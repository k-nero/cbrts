import { useMemo } from 'react';
import { Flex, type TableColumnsType } from 'antd';

import { flexWords, MODE_LABEL } from './routeOptions';

import { Chip } from '@/components/ui';
import type { Corridor } from '@/interfaces';

/** Routes columns: the route, mode, border crossings, distance and flexible dates. */
export const useGeneratedCorridorColumn = () =>
  useMemo<TableColumnsType<Corridor>>(
    () => [
      {
        title: 'Route',
        key: 'code',
        dataIndex: 'code',
        width: 260,
        sorter: true,
        render: (_, c) => (
          <Flex vertical>
            <span className="type-label-s text-ink">
              {c.originCity} → {c.destinationCity}
            </span>
            <span className="type-caption text-ink-3">{c.code}</span>
          </Flex>
        ),
      },
      {
        title: 'Mode',
        key: 'mode',
        width: 100,
        render: (_, c) => <Chip>{MODE_LABEL[c.mode] ?? c.mode}</Chip>,
      },
      {
        title: 'Border crossings',
        key: 'crossings',
        width: 420,
        render: (_, c) =>
          c.crossings.length === 0 ? (
            <span className="type-body-s text-ink-3">
              {c.mode === 'AIR' ? 'By air' : 'Stays in one country'}
            </span>
          ) : (
            <span className="type-body-s text-ink-2">{c.crossings.join(' → ')}</span>
          ),
      },
      {
        title: 'Distance',
        key: 'distanceKm',
        width: 120,
        render: (_, c) => (
          <span className="type-data text-ink">
            {c.distanceKm === null ? '—' : `${c.distanceKm.toLocaleString('en')} km`}
          </span>
        ),
      },
      {
        title: 'Flexible dates',
        key: 'dateFlexDays',
        dataIndex: 'dateFlexDays',
        width: 140,
        sorter: true,
        render: (_, c) => <span className="type-body-s text-ink">{flexWords(c.dateFlexDays)}</span>,
      },
    ],
    [],
  );
