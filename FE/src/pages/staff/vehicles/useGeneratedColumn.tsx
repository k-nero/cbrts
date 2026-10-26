import { useMemo } from 'react';
import { App, Flex, type TableColumnsType } from 'antd';
import dayjs from 'dayjs';

import { countriesText, KIND_LABEL, STALL_TYPES, STATUS_CHIP } from './vehicleOptions';

import { Button, Chip, Icon } from '@/components/ui';
import { useUpdateVehicle } from '@/hooks/useVehicle';
import { type Vehicle, VehicleStatusEnum } from '@/interfaces';
import { apiErrorMessage } from '@/lib';
import { formatDate } from '@/lib/utils';

/**
 * Vehicles columns: the vehicle, its stalls by type, payload, where it is based and its permits, the
 * corridors it works, status, then the row actions.
 */
export const useGeneratedVehicleColumn = ({
  onBook,
  onEditPermits,
  onSetAvailableOn,
}: {
  onBook: (v: Vehicle) => void;
  onEditPermits: (v: Vehicle) => void;
  onSetAvailableOn: (v: Vehicle) => void;
}) => {
  const { message } = App.useApp();
  const update = useUpdateVehicle();

  return useMemo<TableColumnsType<Vehicle>>(() => {
    const setStatus = (v: Vehicle) => {
      const next =
        v.status === VehicleStatusEnum.ACTIVE
          ? VehicleStatusEnum.MAINTENANCE
          : VehicleStatusEnum.ACTIVE;
      update.mutate(
        { id: v.id, body: { status: next } },
        {
          onSuccess: () =>
            void message.success(
              next === VehicleStatusEnum.ACTIVE
                ? `${v.code} is back in service.`
                : `${v.code} is out for maintenance.`,
            ),
          onError: (err) =>
            void message.error(apiErrorMessage(err, `${v.code}’s status wasn’t changed.`)),
        },
      );
    };

    return [
      {
        title: 'Vehicle',
        key: 'code',
        dataIndex: 'code',
        width: 190,
        sorter: true,
        render: (_, v) => (
          <Flex align="center" gap={10}>
            <Icon name="truck" size={18} className="shrink-0 text-ink-2" />
            <Flex vertical>
              <span className="type-label-s text-ink">{v.code}</span>
              <span className="type-caption text-ink-3">{KIND_LABEL[v.kind] ?? v.kind}</span>
            </Flex>
          </Flex>
        ),
      },
      {
        title: 'Stalls',
        key: 'stalls',
        width: 320,
        render: (_, v) => (
          <Flex align="center" gap={12} wrap>
            <span className="type-data text-ink">{v.stalls?.length ?? 0}</span>
            {STALL_TYPES.map(({ type, label, swatch }) => {
              const count = (v.stalls ?? []).filter((s) => s.stallType === type).length;
              return count > 0 ? (
                <Flex key={type} align="center" gap={6}>
                  <span className={`size-2 rounded-xs ${swatch}`} aria-hidden />
                  <span className="type-caption text-ink-3">{`${count} ${label}`}</span>
                </Flex>
              ) : null;
            })}
          </Flex>
        ),
      },
      {
        title: 'Payload',
        key: 'payloadKg',
        dataIndex: 'payloadKg',
        width: 130,
        sorter: true,
        render: (kg?: number) => (
          <span className="type-data text-ink">{kg ? `${kg.toLocaleString()} kg` : '—'}</span>
        ),
      },
      {
        title: 'Countries',
        key: 'countries',
        width: 170,
        render: (_, v) => <span className="type-data text-ink">{countriesText(v)}</span>,
      },
      {
        title: 'Corridors',
        key: 'corridors',
        width: 240,
        render: (_, v) => {
          const codes = (v.operatingCorridors ?? []).map((c) => c.code);
          if (codes.length === 0) return <span className="type-body-s text-ink-3">None</span>;
          const shown = codes.slice(0, 2).join(', ');
          return (
            <span className="type-body-s text-ink-2" title={codes.join(', ')}>
              {codes.length > 2 ? `${shown} and ${codes.length - 2} more` : shown}
            </span>
          );
        },
      },
      {
        title: 'Expected back',
        key: 'availableOn',
        width: 150,
        render: (_, v) =>
          v.availableOn && !dayjs(v.availableOn).isBefore(dayjs(), 'day') ? (
            <span className="type-data text-ink">{formatDate(v.availableOn)}</span>
          ) : (
            <span className="type-body-s text-ink-3">—</span>
          ),
      },
      {
        title: 'Status',
        key: 'status',
        dataIndex: 'status',
        width: 160,
        sorter: true,
        render: (_, v) => {
          const chip = STATUS_CHIP[v.status];
          return chip ? <Chip tone={chip.tone}>{chip.label}</Chip> : null;
        },
      },
      {
        key: 'actions',
        width: 480,
        render: (_, v) =>
          v.status === VehicleStatusEnum.RETIRED ? null : (
            <Flex gap={8}>
              <Button variant="secondary" size="sm" onClick={() => onBook(v)}>
                Book slot
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onEditPermits(v)}>
                Countries and corridors
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onSetAvailableOn(v)}>
                Expected back
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={update.isPending && update.variables?.id === v.id}
                onClick={() => setStatus(v)}
              >
                {v.status === VehicleStatusEnum.ACTIVE ? 'Set maintenance' : 'Set active'}
              </Button>
            </Flex>
          ),
      },
    ];
  }, [message, onBook, onEditPermits, onSetAvailableOn, update]);
};
