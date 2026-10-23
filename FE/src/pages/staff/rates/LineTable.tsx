import type { FC, ReactNode } from 'react';
import { Flex, type TableColumnsType } from 'antd';

import { actionsColumn, type RowActions } from './tableActions';

import Table from '@/components/table';
import { Chip, Panel, cx } from '@/components/ui';
import type { RateCorridorView, RateLine } from '@/interfaces';
import { basisWords, money } from '@/lib/utils';

/** Catalog lines: the corridor's own and every-corridor lines, group then code order. */
export const LineTable: FC<{
  view: RateCorridorView;
  actions: RowActions<RateLine>;
  add?: ReactNode;
}> = ({ view, actions, add }) => {
  // An every-corridor line is replaced on this corridor by its own line with the same code.
  const ownCodes = new Set(view.lines.filter((l) => !l.everyCorridor).map((l) => l.code));
  const replaced = (l: RateLine) => l.everyCorridor && ownCodes.has(l.code);
  const columns: TableColumnsType<RateLine> = [
    {
      key: 'line',
      title: 'Line',
      width: 300,
      render: (_, l) => (
        <Flex component="span" wrap align="center" gap={8}>
          <span className="type-mono-label text-ink-3">{l.group}</span>
          <span className={cx('type-body-m', replaced(l) ? 'text-ink-3 line-through' : 'text-ink')}>
            {l.description}
          </span>
          {replaced(l) ? (
            <Chip tone="neutral" dot={false}>
              Replaced here
            </Chip>
          ) : (
            l.everyCorridor && (
              <Chip tone="neutral" dot={false}>
                All corridors
              </Chip>
            )
          )}
        </Flex>
      ),
    },
    {
      key: 'basis',
      title: 'Basis',
      width: 200,
      render: (_, l) => (
        <span className="type-caption text-ink-2">{basisWords(l, view.policies)}</span>
      ),
    },
    {
      key: 'rate',
      title: 'Rate',
      width: 120,
      align: 'right',
      render: (_, l) => <span className="type-data text-ink">{money(l.rate)}</span>,
    },
    {
      key: 'certainty',
      width: 120,
      align: 'right',
      render: (_, l) =>
        l.certainty === 'ESTIMATED' ? (
          <Chip tone="warn" dot={false}>
            Estimated
          </Chip>
        ) : (
          <Chip tone="neutral" dot={false}>
            Fixed
          </Chip>
        ),
    },
    ...actionsColumn(actions, (l) => l.description),
  ];
  return (
    <Panel title="Catalog lines" extra={add} flush>
      <p className="type-body-s m-0 px-6 pb-3 text-ink-3">
        Quantities are derived from the request. Estimated lines are marked on the quotation.
      </p>
      <Table<RateLine>
        id="rate-lines"
        rowKey="id"
        columns={columns}
        dataSource={view.lines}
        pagination={false}
        ignoreKeys={['actions', 'certainty']}
      />
    </Panel>
  );
};
