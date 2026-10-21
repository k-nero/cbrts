import { useMemo } from 'react';
import { Button } from '@/components/ui';
import { TableColumnsType } from 'antd';
import type { PagedResponse, QueueRow } from '@/interfaces';
import { ageWords, departsWords, queueRoute } from '@/lib';
import { UseQueryResult } from '@tanstack/react-query';

interface Props {
  query: UseQueryResult<PagedResponse<QueueRow>, Error>;
}

export const useGeneratedRequestColumn = ({ query }: Props): TableColumnsType<QueueRow> => {
  const now = new Date();
  return useMemo(
    () => [
      {
        key: 'code',
        title: 'Request',
        width: 150,
        render: (_, r) => (
          <span className="flex flex-col gap-0.5">
            <span className="type-caption text-ink">{r.code}</span>
            {r.revisionNo >= 2 && (
              <span className="type-body-s text-ink-3">Version {r.revisionNo}</span>
            )}
          </span>
        ),
      },
      { key: 'club', title: 'Customer', width: 200, dataIndex: 'club' },
      {
        key: 'route',
        title: 'Route',
        width: 250,
        render: (_, r) => {
          const route = queueRoute(r);
          return (
            <span className="flex flex-col gap-0.5">
              <span className="type-body-m text-ink">{route.title}</span>
              <span className="type-body-s text-ink-3">{route.by}</span>
            </span>
          );
        },
      },
      {
        key: 'horses',
        title: 'Horses',
        width: 90,
        align: 'right',
        render: (_, r) => <span className="type-data text-ink">{r.horseCount}</span>,
      },
      {
        key: 'departs',
        title: 'Departs',
        width: 130,
        render: (_, r) =>
          r.departureDate ? (
            <span className="type-caption text-ink-2">
              {departsWords(r.departureDate, r.dateFlexDays)}
            </span>
          ) : null,
      },
      {
        key: 'age',
        title: 'Age',
        width: 80,
        align: 'right',
        render: (_, r) => (
          <span className="type-caption text-ink">{ageWords(r.waitingSince, now)}</span>
        ),
      },
    ],
    // `now` moves every render; the ages only need to be as fresh as the last fetch (every minute).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [query.dataUpdatedAt],
  );
};
