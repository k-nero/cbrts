import { type FC, type ReactNode, useState } from 'react';
import { Flex, Input } from 'antd';
import dayjs from 'dayjs';

import { CabDock } from './CabDock';
import { CabLayout } from './CabLayout';
import { CustomerSeesPanel } from './CustomerSeesPanel';
import { HorseConditionRow } from './HorseConditionRow';
import { type Observation, emptyObservation } from './observation';
import { RecordedAt } from './RecordedAt';
import { TaskHead } from './TaskHead';
import { Toggle48 } from './Toggle48';
import { useCabRecord } from './useCabRecord';

import { Panel } from '@/components/ui';
import type { TripView } from '@/interfaces';
import { HorseConditionEnum, TripRecordKindEnum } from '@/interfaces';
import { formatTime } from '@/lib/utils';

type Props = { trip: TripView; tripCode?: string; extra?: ReactNode };

/**
 * The handover at the destination (US-F6-01, DESIGN.md "Handover (escort)"): each horse's
 * condition as it comes off the trailer, what was handed over, and the receiver's name and
 * confirmation. It is recorded once; the gold action names the time it records.
 */
export const HandoverTask: FC<Props> = ({ trip, tripCode, extra }) => {
  const horses = trip.horses.filter((h) => h.jobCode === trip.jobCode);
  const [byHorse, setByHorse] = useState<Record<string, Observation>>({});
  const [items, setItems] = useState('');
  const [receiver, setReceiver] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [at, setAt] = useState(dayjs);
  const [changingTime, setChangingTime] = useState(false);
  const { save, saving } = useCabRecord(trip.jobCode, tripCode);

  const observation = (id: string) => byHorse[id] ?? emptyObservation();
  const update = (id: string, change: Partial<Observation>) =>
    setByHorse((current) => ({ ...current, [id]: { ...observation(id), ...change } }));

  const missing = horses.filter((h) => !observation(h.id).condition).map((h) => h.name);
  const name = receiver.trim();
  const ready = missing.length === 0 && name !== '' && confirmed;
  const time = formatTime(at.toISOString());
  const sound = horses.filter((h) => observation(h.id).condition === HorseConditionEnum.SOUND);
  const delivered = trip.stops.at(-1);

  const record = () =>
    save(
      {
        routeStopId: null,
        kind: TripRecordKindEnum.HANDED_OVER,
        at,
        text: items.trim() || undefined,
        receiverName: name,
        receiverConfirmed: confirmed,
        observed: horses.map((horse) => ({ horse, observation: observation(horse.id) })),
      },
      `Handover recorded: ${name} received ${trip.jobCode}.`,
    );

  const task = (
    <Panel flush>
      <TaskHead
        title="Hand over the horses"
        sub={`Record each horse as it comes off the trailer, then the receiver confirms on this tablet.${
          trip.handover?.deliveredAt && delivered
            ? ` Arrived ${formatTime(trip.handover.deliveredAt)} at ${delivered.name}.`
            : ''
        }`}
      />
      {horses.map((horse) => (
        <HorseConditionRow
          key={horse.id}
          horse={horse}
          feeding={false}
          observation={observation(horse.id)}
          onChange={(change) => update(horse.id, change)}
        />
      ))}
      <div className="flex flex-col gap-2 border-t border-line px-6 py-[18px]">
        <span className="type-label-m text-ink-2">Handed over</span>
        <Input.TextArea
          size="large"
          value={items}
          maxLength={500}
          autoSize={{ minRows: 1, maxRows: 4 }}
          placeholder="Passports, head collars, feed for two days"
          onChange={(event) => setItems(event.target.value)}
        />
      </div>
      <div className="flex flex-col gap-3 border-t border-line px-6 pt-[18px] pb-6">
        <Flex vertical gap={8}>
          <span className="type-label-m text-ink-2">Received by</span>
          <Input
            size="large"
            value={receiver}
            maxLength={120}
            placeholder="Name and role, as on the delivery order"
            onChange={(event) => setReceiver(event.target.value)}
            className="h-12"
          />
        </Flex>
        <Toggle48
          label={`${name || 'The receiver'} confirms ${horses.length === 1 ? 'this horse' : `these ${horses.length} horses`} in the condition above`}
          checked={confirmed}
          onChange={setConfirmed}
        />
        {changingTime && <RecordedAt value={at} onChange={setAt} label="Handed over at" />}
      </div>
    </Panel>
  );

  const side = (
    <>
      <Panel title="What happens next">
        <p className="type-body-s m-0 text-ink-2">
          The customer confirms the handover and each horse’s condition, or reports a problem. If
          they don’t reply within 2 days, the handover is taken as accepted on this record.
        </p>
      </Panel>
      <CustomerSeesPanel>
        Your condition words and notes under “Arrival condition”, with the receiver’s name and the
        time they confirmed.
      </CustomerSeesPanel>
    </>
  );

  return (
    <CabLayout
      task={task}
      side={side}
      extra={extra}
      dock={
        <CabDock
          summary={
            missing.length
              ? `Still to record: ${missing.join(', ')}`
              : `${sound.length} of ${horses.length} sound${name ? ` · received by ${name}` : ''}`
          }
          sub={
            ready
              ? 'Recorded once and never changed. Sent as soon as you save.'
              : 'Every horse’s condition, the receiver’s name and their confirmation are needed.'
          }
          secondary={{ label: 'Change time', onClick: () => setChangingTime(true) }}
          action={{
            label: saving ? 'Saving…' : `Record handover at ${time}`,
            onClick: record,
            disabled: !ready || saving,
          }}
        />
      }
    />
  );
};
