import { useState } from 'react';
import { DatePicker, Input, Select } from 'antd';
import dayjs from 'dayjs';

import { eventLabels } from './tripFormat';

import { Button, Callout } from '@/components/ui';
import type { TripRecordKind, TripView } from '@/interfaces';
import { TripRecordKindEnum } from '@/interfaces';

const eventKinds = Object.values(TripRecordKindEnum);
const checkpointKinds = eventKinds.filter((kind) => kind !== TripRecordKindEnum.CONDITION_CHECK);

export function CheckpointReportForm({
  trip,
  isPending,
  onSave,
}: {
  trip: TripView;
  isPending: boolean;
  onSave: (data: {
    routeStopId: string | null;
    kind: TripRecordKind;
    occurredAt: string;
    text?: string;
    receiverName?: string;
  }) => Promise<void>;
}) {
  const [stopId, setStopId] = useState<string>();
  const [kind, setKind] = useState<TripRecordKind>(TripRecordKindEnum.ARRIVED_AT_STOP);
  const [occurredAt, setOccurredAt] = useState<dayjs.Dayjs>(() => dayjs());
  const [text, setText] = useState('');
  const [receiverName, setReceiverName] = useState('');

  const handleSave = async () => {
    await onSave({
      routeStopId: stopId ?? null,
      kind,
      occurredAt: occurredAt.toISOString(),
      text: text.trim() || undefined,
      receiverName:
        kind === TripRecordKindEnum.HANDED_OVER ? receiverName.trim() || undefined : undefined,
    });
    setText('');
    setReceiverName('');
    setOccurredAt(dayjs());
  };

  const isDepartureBlocked =
    (kind === TripRecordKindEnum.DEPARTED || kind === TripRecordKindEnum.FLIGHT_DEPARTED) &&
    !trip.clearanceReady;
  const isHandoverIncomplete = kind === TripRecordKindEnum.HANDED_OVER && !receiverName.trim();

  return (
    <div className="flex flex-col gap-4">
      {!trip.clearanceReady && (
        <Callout tone="bad" title="Departure locked">
          Departure can be recorded once the transport specialist clears the dossier.
        </Callout>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        <label className="type-body-s flex flex-col gap-1">
          Checkpoint
          <Select
            value={stopId}
            onChange={setStopId}
            allowClear
            placeholder="Trip-wide update"
            options={trip.stops.map((stop) => ({ value: stop.id, label: stop.name }))}
          />
        </label>
        <label className="type-body-s flex flex-col gap-1">
          Checkpoint status
          <Select
            value={kind}
            onChange={setKind}
            options={checkpointKinds.map((value) => ({ value, label: eventLabels[value] }))}
          />
        </label>
        <label className="type-body-s flex flex-col gap-1">
          Recorded time
          <DatePicker
            showTime
            format="YYYY-MM-DD HH:mm"
            value={occurredAt}
            onChange={(val) => setOccurredAt(val ?? dayjs())}
            className="w-full"
          />
        </label>
        <label className="type-body-s flex flex-col gap-1">
          Update note
          <Input
            value={text}
            onChange={(event) => setText(event.target.value)}
            maxLength={500}
            placeholder="What happened at this checkpoint?"
          />
        </label>
        {kind === TripRecordKindEnum.HANDED_OVER && (
          <label className="type-body-s flex flex-col gap-1 md:col-span-2">
            Received by
            <Input
              value={receiverName}
              onChange={(event) => setReceiverName(event.target.value)}
              maxLength={120}
              placeholder="Name of the receiving person"
            />
          </label>
        )}
      </div>
      <div className="flex justify-end pt-2">
        <Button
          disabled={isPending || isDepartureBlocked || isHandoverIncomplete}
          onClick={handleSave}
        >
          {isPending ? 'Saving…' : 'Save checkpoint'}
        </Button>
      </div>
    </div>
  );
}
