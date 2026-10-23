import { useRef, useState } from 'react';
import { Flex, message, Select, Spin } from 'antd';

import { EscortCabSurface } from './cab/EscortCabSurface';
import { CheckpointReportForm } from './CheckpointReportForm';
import { TripDetails } from './TripDetails';
import { formatTime, sentence } from './tripFormat';

import PageHeader from '@/components/PageHeader';
import { Button, Callout, Chip, Panel } from '@/components/ui';
import { useAuth, useMe } from '@/hooks/auth';
import { useTrip, useTripRecord, useTrips } from '@/hooks/trip';
import type { HorseCondition, TripRecordKind } from '@/interfaces';
import { TripStatusEnum } from '@/interfaces';
import { apiErrorMessage } from '@/lib/utils';

const statusTone = (status: string) =>
  status === TripStatusEnum.DELIVERED ? 'ok' : status === TripStatusEnum.HELD ? 'warn' : 'info';

export function TripWorkspace({
  audience,
  title,
  summary,
  editable = false,
}: {
  audience: 'escort' | 'staff' | 'customer';
  title: string;
  summary: string;
  editable?: boolean;
}) {
  const { logout } = useAuth();
  const { data: currentUser } = useMe();
  const [page, setPage] = useState(0);
  const summariesQuery = useTrips(audience, page);
  const summaries = summariesQuery.data?.content ?? [];
  const [code, setCode] = useState('');
  const selectedCode = summaries.some((item) => item.jobCode === code)
    ? code
    : (summaries[0]?.jobCode ?? '');
  const detailQuery = useTrip(audience, selectedCode);
  const trip = detailQuery.data;

  const clientRefs = useRef<{ checkpoint: string | null; condition: string | null }>({
    checkpoint: null,
    condition: null,
  });
  const mutation = useTripRecord(audience === 'staff' ? 'staff' : 'escort', selectedCode);
  const [messageApi, contextHolder] = message.useMessage();

  const handleSaveCheckpoint = async (data: {
    routeStopId: string | null;
    kind: TripRecordKind;
    occurredAt: string;
    text?: string;
    receiverName?: string;
  }) => {
    if (!trip) return;
    const clientRef = clientRefs.current.checkpoint ?? crypto.randomUUID();
    clientRefs.current.checkpoint = clientRef;
    try {
      await mutation.mutateAsync({
        routeStopId: data.routeStopId,
        kind: data.kind,
        occurredAt: data.occurredAt,
        clientRef,
        text: data.text,
        receiverName: data.receiverName,
      });
      clientRefs.current.checkpoint = null;
      messageApi.success('Trip checkpoint saved.');
    } catch (error) {
      messageApi.error(apiErrorMessage(error, 'The trip update could not be saved.'));
      throw error;
    }
  };

  const handleSaveConditions = async (
    conditions: Array<{
      horseId: string;
      condition: HorseCondition;
      drinking: boolean | null;
      eating: boolean | null;
      note?: string;
      photoFileIds: string[];
    }>,
  ) => {
    if (!trip) return;
    const clientRef = clientRefs.current.condition ?? crypto.randomUUID();
    clientRefs.current.condition = clientRef;
    try {
      await mutation.mutateAsync({
        routeStopId: null,
        kind: 'CONDITION_CHECK' as TripRecordKind,
        occurredAt: new Date().toISOString(),
        clientRef,
        conditions,
      });
      clientRefs.current.condition = null;
      messageApi.success('Horse conditions recorded.');
    } catch (error) {
      messageApi.error(apiErrorMessage(error, 'The condition check could not be saved.'));
      throw error;
    }
  };

  const selectedSummary = summaries.find((item) => item.jobCode === selectedCode);

  return (
    <Flex vertical gap={24}>
      {contextHolder}
      <PageHeader
        title={title}
        summary={summary}
        right={
          audience === 'escort' ? (
            <Button variant="secondary" onClick={logout}>
              Sign out
            </Button>
          ) : undefined
        }
      />
      {summariesQuery.isPending && (
        <div className="py-12 text-center">
          <Spin />
        </div>
      )}
      {summariesQuery.isError && (
        <Callout tone="bad" title="The trips could not be loaded">
          {apiErrorMessage(summariesQuery.error, 'Refresh the page to try again.')}
        </Callout>
      )}
      {summariesQuery.data && summariesQuery.data.totalPages === 0 && (
        <Panel>
          <p className="type-body-s m-0 text-ink-2">No trips are available for this account yet.</p>
        </Panel>
      )}
      {summaries.length > 0 && (
        <>
          <Flex wrap align="center" justify="space-between" gap={12}>
            <Select
              aria-label="Select trip"
              value={selectedCode}
              onChange={(value) => setCode(value)}
              options={summaries.map((item) => ({
                value: item.jobCode,
                label: `${item.jobCode} · ${item.origin ?? 'Origin'} → ${item.destination ?? 'Destination'}`,
              }))}
              className="min-w-72 flex-1"
            />
            {summariesQuery.data && summariesQuery.data.totalPages > 1 && (
              <Flex align="center" gap={8}>
                <Button
                  size="sm"
                  disabled={summariesQuery.data.first}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <span className="type-body-s text-ink-3">
                  Page {page + 1} of {summariesQuery.data.totalPages}
                </span>
                <Button
                  size="sm"
                  disabled={summariesQuery.data.last}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </Flex>
            )}
          </Flex>
          {selectedSummary && (
            <Panel
              title={
                trip?.tripCode
                  ? `${selectedSummary.jobCode} · ${trip.tripCode}`
                  : selectedSummary.jobCode
              }
              extra={
                <Chip tone={statusTone(selectedSummary.tripStatus)}>
                  {sentence(selectedSummary.tripStatus)}
                </Chip>
              }
            >
              <p className="type-body-s m-0 text-ink-3">
                {selectedSummary.origin ?? 'Origin not set'} →{' '}
                {selectedSummary.destination ?? 'Destination not set'} · Last update{' '}
                {formatTime(selectedSummary.lastUpdate)}
              </p>
            </Panel>
          )}
          {detailQuery.isPending && (
            <div className="py-8 text-center">
              <Spin />
            </div>
          )}
          {detailQuery.isError && (
            <Callout tone="bad" title="This trip could not be loaded">
              {apiErrorMessage(detailQuery.error, 'Refresh the page to try again.')}
            </Callout>
          )}
          {audience === 'customer' && trip && (
            <Callout tone="info" title="Progress follows recorded checkpoints">
              You see the last checkpoint the escort or coordinator recorded, with its time. It
              refreshes on its own.
            </Callout>
          )}
          {audience === 'escort' && trip ? (
            <EscortCabSurface
              trip={trip}
              userName={
                currentUser
                  ? `${currentUser.firstName} ${currentUser.lastName}`.trim() || 'Minh, driver'
                  : 'Minh, driver'
              }
              isPending={mutation.isPending}
              onSaveCheckpoint={handleSaveCheckpoint}
              onSaveConditions={handleSaveConditions}
            />
          ) : (
            <>
              {editable && trip && (
                <Panel title="Update progress by checkpoint">
                  <CheckpointReportForm
                    trip={trip}
                    isPending={mutation.isPending}
                    onSave={handleSaveCheckpoint}
                  />
                </Panel>
              )}
              {trip && <TripDetails trip={trip} audience={audience} />}
            </>
          )}
        </>
      )}
    </Flex>
  );
}
