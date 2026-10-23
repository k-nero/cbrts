import { useMemo } from 'react';
import { App, Flex, type TableColumnsType } from 'antd';

import { KIND_LABEL, STALL_TYPES, STATUS_CHIP } from './vehicleOptions';

import { Button, Chip, Icon } from '@/components/ui';
import { useUpdateVehicle } from '@/hooks/useVehicle';
import { type Vehicle, VehicleStatusEnum } from '@/interfaces';
import { apiErrorMessage } from '@/lib';

/** Vehicles columns: the vehicle, its stalls by type, payload, status, then the row actions. */
export const useGeneratedVehicleColumn = ({ onBook }: { onBook: (v: Vehicle) => void }) => {
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
        width: 240,
        render: (_, v) =>
          v.status === VehicleStatusEnum.RETIRED ? null : (
            <Flex gap={8}>
              <Button variant="secondary" size="sm" onClick={() => onBook(v)}>
                Book slot
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
  }, [message, onBook, update]);
};
