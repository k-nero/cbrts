import type { FC, ReactNode } from 'react';
import type { TableColumnsType } from 'antd';

import { actionsColumn, type RowActions } from './tableActions';

import Table from '@/components/table';
import { Panel } from '@/components/ui';
import type { RateCorridorView, ServiceClassRow } from '@/interfaces';
import { corridorShort, money, SERVICE_CLASS_LABELS } from '@/lib/utils';

/** Air stall by service class: the width each class gives a horse and the price of one 96 in position. */
export const ClassTable: FC<{
  view: RateCorridorView;
  actions: RowActions<ServiceClassRow>;
  add?: ReactNode;
}> = ({ view, actions, add }) => {
  const columns: TableColumnsType<ServiceClassRow> = [
    {
      key: 'class',
      title: 'Class',
      width: 130,
      render: (_, r) => (
        <span className="type-label-m text-ink">{SERVICE_CLASS_LABELS[r.serviceClass]}</span>
      ),
    },
    {
      key: 'width',
      title: 'Width',
      width: 110,
      render: (_, r) => <span className="type-data text-ink">{`${r.widthPerHorseIn} in`}</span>,
    },
    {
      key: 'perPosition',
      title: 'Per position',
      width: 130,
      align: 'right',
      render: (_, r) => <span className="type-data text-ink">{r.horsesPerPosition}</span>,
    },
    {
      key: 'rate',
      title: 'Position rate',
      width: 150,
      align: 'right',
      render: (_, r) => <span className="type-data text-ink">{money(r.positionRate)}</span>,
    },
    {
      key: 'perHorse',
      title: 'Per horse',
      width: 140,
      align: 'right',
      render: (_, r) => <span className="type-data text-ink-2">{money(r.perHorse)}</span>,
    },
    ...actionsColumn(actions, (r) => SERVICE_CLASS_LABELS[r.serviceClass]),
  ];
  return (
    <Panel
      title={`Air stall by service class · ${corridorShort(view.corridor.code)}`}
      extra={add}
      flush
    >
      <p className="type-body-s m-0 px-6 pb-3 text-ink-3">
        Class sets the width per horse. A horse wider than the class, or a mare with a foal at foot,
        can&apos;t travel in it.
      </p>
      <Table<ServiceClassRow>
        id="rate-classes"
        rowKey="serviceClass"
        columns={columns}
        dataSource={view.serviceClasses}
        pagination={false}
        ignoreKeys={['actions']}
      />
    </Panel>
  );
};
