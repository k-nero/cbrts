import { useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Col, DatePicker, Flex, Input, Row, message, Select, Spin } from 'antd';
import dayjs from 'dayjs';

import { HandoverAnswer } from './HandoverAnswer';
import { HandoverPanel } from './HandoverPanel';
import { HandoverRecord } from './HandoverRecord';
import { TripBoard } from './TripBoard';
import { TripDetails } from './TripDetails';
import { eventLabels, formatTime, sentence } from './tripFormat';

import PageHeader from '@/components/PageHeader';
import { Button, Callout, Chip, Panel } from '@/components/ui';
import { apiErrorMessage } from '@/lib/utils';
import { useTrip, useTripRecord, useTrips } from '@/hooks/trip';
import type { TripRecordKind, TripSummary } from '@/interfaces';
import { TripRecordKindEnum, TripStatusEnum } from '@/interfaces';

const eventKinds = Object.values(TripRecordKindEnum);

// The handover has its own panel (US-F6-01), with each horse's condition and the receiver's confirmation.
const checkpointKinds = eventKinds.filter(
  (kind) => kind !== TripRecordKindEnum.CONDITION_CHECK && kind !== TripRecordKindEnum.HANDED_OVER,
);

const errorMessage = (error: unknown) =>
  apiErrorMessage(error, 'The trip update could not be saved.');

const statusTone = (status: string) =>
  status === TripStatusEnum.DELIVERED ? 'ok' : status === TripStatusEnum.HELD ? 'warn' : 'info';

export function TripWorkspace({
  audience,
  title,
  summary,
  editable = false,
}: {
  audience: 'staff' | 'customer';
  title: string;
  summary: string;
  editable?: boolean;
}) {
  const [page, setPage] = useState(0);
  const summariesQuery = useTrips(audience, page);
  const summaries = summariesQuery.data?.content ?? [];
  // A notification opens tracking on its job (/tracking?job=CBRT-…); a trip lists under any of its jobs.
  const [searchParams] = useSearchParams();
  const [code, setCode] = useState(searchParams.get('job') ?? '');
  const selectedCode =
    summaries.find((item) => item.jobCode === code || item.jobCodes.includes(code))?.jobCode ??
    summaries[0]?.jobCode ??
    '';
  // One part of a job an incident split across trips (US-F5-06).
  const [partId, setPartId] = useState<string>();
  const shownPart = partId;
  const detailQuery = useTrip(audience, selectedCode, shownPart);
  const trip = detailQuery.data;
  const [kind, setKind] = useState<TripRecordKind>(TripRecordKindEnum.ARRIVED_AT_STOP);
  const [stopId, setStopId] = useState<string>();
  const [occurredAt, setOccurredAt] = useState(dayjs);
  const [text, setText] = useState('');
  const clientRefs = useRef<{ checkpoint: string | null }>({ checkpoint: null });
  const mutation = useTripRecord('staff', selectedCode, shownPart);
  const [messageApi, contextHolder] = message.useMessage();

  const saveCheckpoint = async () => {
    if (!trip) return;
    const clientRef = clientRefs.current.checkpoint ?? crypto.randomUUID();
    clientRefs.current.checkpoint = clientRef;
    try {
      await mutation.mutateAsync({
        routeStopId: stopId ?? null,
        kind,
        occurredAt: occurredAt.toISOString(),
        clientRef,
        text: text || undefined,
      });
      clientRefs.current.checkpoint = null;
      messageApi.success('Trip checkpoint saved.');
      setText('');
      setOccurredAt(dayjs());
    } catch (error) {
      messageApi.error(errorMessage(error));
    }
  };

  const pageChange = (nextPage: number) => {
    setPage(nextPage);
    setCode('');
    setStopId(undefined);
  };
  const selectedSummary: TripSummary | undefined = summaries.find(
    (item) => item.jobCode === selectedCode,
  );

  return (
    <Flex vertical gap={24}>
      {contextHolder}
      <PageHeader title={title} summary={summary} />
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
      {audience === 'staff' && summariesQuery.data && summaries.length > 0 && (
        <TripBoard
          data={summariesQuery.data}
          loading={summariesQuery.isFetching}
          selectedCode={selectedCode}
          onSelect={(value) => {
            setCode(value);
            setPartId(undefined);
            setStopId(undefined);
          }}
          onPageChange={pageChange}
        />
      )}
      {summaries.length > 0 && (
        <>
          {audience !== 'staff' && (
            <Flex wrap align="center" justify="space-between" gap={12}>
              <Select
                aria-label="Select trip"
                value={selectedCode}
                onChange={(value) => {
                  setCode(value);
                  setPartId(undefined);
                  setStopId(undefined);
                }}
                options={summaries.map((item) => ({
                  value: item.jobCode,
                  // The escort's row is a trip: its TRP code and every job on the trailer.
                  label: `${item.tripCode ? `${item.tripCode} · ${item.jobCodes.join(', ')}` : item.jobCode} · ${item.origin ?? 'Origin'} → ${item.destination ?? 'Destination'}`,
                }))}
                className="min-w-72 flex-1"
              />
              {summariesQuery.data && summariesQuery.data.totalPages > 1 && (
                <Flex align="center" gap={8}>
                  <Button
                    size="sm"
                    disabled={summariesQuery.data.first}
                    onClick={() => pageChange(page - 1)}
                  >
                    Previous
                  </Button>
                  <span className="type-body-s text-ink-3">
                    Page {page + 1} of {summariesQuery.data.totalPages}
                  </span>
                  <Button
                    size="sm"
                    disabled={summariesQuery.data.last}
                    onClick={() => pageChange(page + 1)}
                  >
                    Next
                  </Button>
                </Flex>
              )}
            </Flex>
          )}
          {selectedSummary && (
            <Panel
              title={
                selectedSummary.tripCode
                  ? `${selectedSummary.tripCode} · ${selectedSummary.jobCodes.join(', ')}`
                  : trip?.tripCode
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
          {editable &&
            audience === 'staff' &&
            trip &&
            trip.tripStatus === TripStatusEnum.DELIVERED &&
            !trip.handover?.handedOverAt && (
              <HandoverPanel trip={trip} code={selectedCode} tripId={shownPart} />
            )}
          {audience === 'customer' && trip && <HandoverAnswer trip={trip} />}
          {trip && <HandoverRecord trip={trip} />}
          {editable && trip && (
            <Panel title="Update progress by checkpoint">
              {!trip.clearanceReady && (
                <Callout className="mb-4" tone="bad" title="Departure locked">
                  Departure can be recorded once the transport specialist clears the dossier.
                </Callout>
              )}
              <Row gutter={[12, 12]}>
                <Col xs={24} md={12}>
                  <Flex component="label" vertical gap={8} className="type-body-s">
                    Checkpoint
                    <Select
                      value={stopId}
                      onChange={setStopId}
                      allowClear
                      placeholder="Trip-wide update"
                      options={trip.stops.map((stop) => ({
                        value: stop.id,
                        label: stop.jobCode ? `${stop.name} · ${stop.jobCode}` : stop.name,
                      }))}
                    />
                  </Flex>
                </Col>
                <Col xs={24} md={12}>
                  <Flex component="label" vertical gap={8} className="type-body-s">
                    Checkpoint status
                    <Select
                      value={kind}
                      onChange={setKind}
                      options={checkpointKinds.map((value) => ({
                        value,
                        label: eventLabels[value],
                      }))}
                    />
                  </Flex>
                </Col>
                <Col xs={24} md={12}>
                  <Flex component="label" vertical gap={8} className="type-body-s">
                    Recorded time
                    <DatePicker
                      showTime={{ format: 'HH:mm' }}
                      format="D MMM YYYY, HH:mm"
                      allowClear={false}
                      value={occurredAt}
                      disabledDate={(day) => day.isAfter(dayjs(), 'day')}
                      onChange={(value) => value && setOccurredAt(value)}
                    />
                  </Flex>
                </Col>
                <Col xs={24} md={12}>
                  <Flex component="label" vertical gap={8} className="type-body-s">
                    Update note
                    <Input
                      value={text}
                      onChange={(event) => setText(event.target.value)}
                      maxLength={500}
                      placeholder="What happened at this checkpoint?"
                    />
                  </Flex>
                </Col>
              </Row>
              {/* The office view has no gold action; it only records (DESIGN.md, Trip tab). */}
              <div className="mt-4">
                <Flex wrap justify="end" gap={8}>
                  <Button
                    disabled={
                      mutation.isPending ||
                      ((kind === TripRecordKindEnum.DEPARTED ||
                        kind === TripRecordKindEnum.FLIGHT_DEPARTED) &&
                        !trip.clearanceReady)
                    }
                    onClick={saveCheckpoint}
                  >
                    {mutation.isPending ? 'Saving…' : 'Save checkpoint'}
                  </Button>
                </Flex>
              </div>
            </Panel>
          )}
          {trip && (
            <TripDetails
              trip={trip}
              audience={audience}
              onShowPart={(id) => {
                setPartId(id);
                setStopId(undefined);
              }}
              onShowJourney={() => {
                setPartId(undefined);
                setStopId(undefined);
              }}
            />
          )}
        </>
      )}
    </Flex>
  );
}
