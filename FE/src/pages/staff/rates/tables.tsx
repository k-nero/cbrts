import type { FC, ReactNode } from 'react';
import type { TableColumnsType } from 'antd';

import Table from '@/components/table';
import { Button, Chip, Panel, cx } from '@/components/ui';
import type { RateCorridorView, RateLine, ServiceClass, ServiceClassRow } from '@/interfaces';
import {
  bandLabel,
  basisWords,
  corridorShort,
  money,
  pctText,
  policyRows,
  rowActionLabels,
} from '@/lib/utils';

const CLASS_WORDS: Record<ServiceClass, string> = {
  ECONOMY: 'Economy',
  BUSINESS: 'Business',
  FIRST: 'First',
};

/** Row actions shown only while a draft is open. */
export type RowActions<T> = { onEdit: (row: T) => void; onRemove: (row: T) => void } | null;

const actionsColumn = <T extends object>(actions: RowActions<T>, label: (row: T) => string) =>
  actions
    ? [
        {
          key: 'actions',
          width: 150,
          align: 'right' as const,
          render: (_: unknown, row: T) => (
            <span className="flex justify-end gap-1">
              <Button
                size="sm"
                variant="ghost"
                aria-label={rowActionLabels(label(row)).edit}
                onClick={() => actions.onEdit(row)}
              >
                Edit
              </Button>
              <Button
                size="sm"
                variant="ghost"
                aria-label={rowActionLabels(label(row)).remove}
                onClick={() => actions.onRemove(row)}
              >
                Remove
              </Button>
            </span>
          ),
        },
      ]
    : [];

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
        <span className="type-label-m text-ink">{CLASS_WORDS[r.serviceClass]}</span>
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
    ...actionsColumn(actions, (r) => CLASS_WORDS[r.serviceClass]),
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

/** Volume breaks, in break-point order: applied to the air and ground lines (A, C, G). */
export const BreaksPanel: FC<{ view: RateCorridorView; edit?: ReactNode }> = ({ view, edit }) => (
  <Panel title="Volume breaks" extra={edit}>
    <div className="flex flex-col gap-3">
      <span className="type-body-s text-ink-3">
        {view.volumeBreaksScope === 'CORRIDOR'
          ? "This corridor's own bands, applied to air and ground lines."
          : 'The bands for every corridor, applied to air and ground lines.'}
      </span>
      {view.volumeBreaks.length === 0 && (
        <span className="type-body-s text-ink-2">
          No volume breaks: every quotation is priced without a discount.
        </span>
      )}
      <dl className="m-0 flex flex-col gap-2">
        {view.volumeBreaks.map((b) => (
          <div key={b.minHorses} className="flex items-center justify-between gap-4">
            <dt className="type-data text-ink">{`${bandLabel(b)} ${b.maxHorses === 1 && b.minHorses === 1 ? 'horse' : 'horses'}`}</dt>
            <dd className="type-data m-0 text-ink">{pctText(b.discountPct)}</dd>
          </div>
        ))}
      </dl>
    </div>
  </Panel>
);

/** Percentages and policy, with the fee bands read-only (they serve deposits and cancellation terms). */
export const PolicyPanel: FC<{ view: RateCorridorView; edit?: ReactNode }> = ({ view, edit }) => (
  <Panel title="Percentages and policy" extra={edit}>
    <dl className="m-0 flex flex-col gap-2">
      {policyRows(view.policies, view.feeBands).map((row) => (
        <div key={row.key} className="flex items-start justify-between gap-4">
          <dt className="type-body-s text-ink-2">{row.label}</dt>
          <dd className="type-label-s m-0 text-right text-ink">{row.value}</dd>
        </div>
      ))}
    </dl>
  </Panel>
);

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
        <span className="flex flex-wrap items-center gap-2">
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
        </span>
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
