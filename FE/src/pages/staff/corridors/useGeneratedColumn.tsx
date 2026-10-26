import { useMemo } from 'react';
import { Flex, type TableColumnsType } from 'antd';

import { flexWords, MODE_LABEL } from './routeOptions';

import { Button, Chip } from '@/components/ui';
import { type Corridor, TransportModeEnum } from '@/interfaces';

/**
 * Routes columns: the route, mode, border crossings, distance, flexible dates, and how many vehicles
 * run it (US-F7-01): a road route nobody runs can't be planned.
 */
export const useGeneratedCorridorColumn = ({
  onEditDrivingDays,
}: {
  onEditDrivingDays: (c: Corridor) => void;
}) =>
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
      {
        title: 'Driving days',
        key: 'drivingDays',
        width: 170,
        render: (_, c) =>
          c.mode !== TransportModeEnum.ROAD ? (
            <span className="type-body-s text-ink-3">Flown</span>
          ) : (
            <Flex align="center" gap={8}>
              <span className="type-data text-ink">{c.drivingDays}</span>
              <Button variant="ghost" size="sm" onClick={() => onEditDrivingDays(c)}>
                Change
              </Button>
            </Flex>
          ),
      },
      {
        title: 'Vehicles',
        key: 'vehicleCount',
        width: 150,
        render: (_, c) => {
          if (c.mode !== TransportModeEnum.ROAD) {
            return <span className="type-body-s text-ink-3">Flown</span>;
          }
          const count = c.vehicleCount ?? 0;
          return count === 0 ? (
            <Chip tone="warn">No vehicle yet</Chip>
          ) : (
            <span className="type-data text-ink">{count}</span>
          );
        },
      },
    ],
    [onEditDrivingDays],
  );
