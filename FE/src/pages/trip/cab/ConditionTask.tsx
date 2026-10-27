import { type FC, type ReactNode, useState } from 'react';
import dayjs from 'dayjs';

import { CabDock } from './CabDock';
import { CabLayout } from './CabLayout';
import { type CabPosition, durText, lastRecord, recordStop } from './cabState';
import { CustomerSeesPanel } from './CustomerSeesPanel';
import { HorseConditionRow } from './HorseConditionRow';
import { NextStopPanel } from './NextStopPanel';
import { type Observation, emptyObservation } from './observation';
import { QuotedRecordPanel } from './QuotedRecordPanel';
import { RecordedAt } from './RecordedAt';
import { TaskHead } from './TaskHead';
import { useCabRecord } from './useCabRecord';

import { Button, Panel } from '@/components/ui';
import type { TripView } from '@/interfaces';
import { HorseConditionEnum, RouteStopKindEnum, TripRecordKindEnum } from '@/interfaces';
import { formatTime, ict } from '@/lib/utils';

type Props = {
  trip: TripView;
  tripCode?: string;
  position: CabPosition;
  /** Back to the checkpoint, when the condition log wasn't the stop's task. */
  onBack?: () => void;
  extra?: ReactNode;
};

const WORD = { SOUND: 'sound', WATCH: 'on watch', CONCERN: 'of concern' } as const;

/** Each horse's condition at a stop: the word, drinking and eating, a note and photos. */
export const ConditionTask: FC<Props> = ({ trip, tripCode, position, onBack, extra }) => {
  const [byHorse, setByHorse] = useState<Record<string, Observation>>({});
  const [appliedAt, setAppliedAt] = useState<string>();
  const [at, setAt] = useState(dayjs);
  const [changingTime, setChangingTime] = useState(false);
  const { save, saving } = useCabRecord(trip.jobCode, tripCode);

  const observation = (id: string) => byHorse[id] ?? emptyObservation();
  const update = (id: string, change: Partial<Observation>) =>
    setByHorse((current) => ({ ...current, [id]: { ...observation(id), ...change } }));
  const allSound = () => {
    setByHorse((current) =>
      Object.fromEntries(
        trip.horses.map((horse) => [
          horse.id,
          {
            ...(current[horse.id] ?? emptyObservation()),
            condition: HorseConditionEnum.SOUND,
            drinking: true,
            eating: true,
          },
        ]),
      ),
    );
    setAppliedAt(new Date().toISOString());
  };

  const observed = trip.horses
    .map((horse) => ({ horse, observation: observation(horse.id) }))
    .filter(({ observation }) => observation.condition !== null);
  const notChecked = trip.horses.filter((horse) => !observation(horse.id).condition);
  const counts = Object.values(HorseConditionEnum)
    .map((word) => [word, observed.filter((o) => o.observation.condition === word).length] as const)
    .filter(([, n]) => n > 0)
    .map(([word, n]) => `${n} ${WORD[word]}`);

  const stop = position.at >= 0 ? trip.stops[position.at] : undefined;
  const arrived = position.at >= 0 ? position.marks[position.at] : null;
  const next = position.next >= 0 ? trip.stops[position.next] : undefined;
  const differs = observed
    .filter(({ observation }) => observation.condition !== HorseConditionEnum.SOUND)
    .map(({ horse }) => horse.name);
  // At a welfare stop the dock says when to leave: arrival plus the planned stay.
  const leaveBy =
    stop?.kind === RouteStopKindEnum.WELFARE && arrived && stop.plannedStayMin
      ? ict(arrived.at).add(stop.plannedStayMin, 'minute')
      : null;
  const leaveIn = leaveBy ? leaveBy.diff(ict(new Date().toISOString()), 'minute') : null;
  const previous = lastRecord(trip, TripRecordKindEnum.CONDITION_CHECK);

  const record = async () => {
    const saved = await save(
      {
        routeStopId: recordStop(trip, position, TripRecordKindEnum.CONDITION_CHECK),
        kind: TripRecordKindEnum.CONDITION_CHECK,
        at,
        observed,
      },
      `Condition log saved for ${observed.length} ${observed.length === 1 ? 'horse' : 'horses'}.`,
    );
    if (saved) {
      setByHorse({});
      setAppliedAt(undefined);
      setAt(dayjs());
      setChangingTime(false);
      onBack?.();
    }
  };

  const task = (
    <Panel flush>
      <TaskHead
        title="Condition of each horse"
        sub="Check each horse in its stall before you leave. Watch or Concern tells the office which horse to follow."
        extra={
          onBack && (
            <Button variant="ghost" leadingIcon="arrow-left" onClick={onBack}>
              Back to the checkpoint
            </Button>
          )
        }
      />
      <div className="flex flex-wrap items-center gap-4 px-6 pb-[18px]">
        <Button leadingIcon="check" className="h-[52px]" onClick={allSound}>
          All sound · drinking · eating
        </Button>
        <span className="type-body-s text-ink-2">
          {appliedAt
            ? `Applied at ${formatTime(appliedAt)}. Then change only the horse that differs${
                differs.length ? `: ${differs.join(', ')}` : ''
              }.`
            : 'Sets every horse, then change only the one that differs.'}
        </span>
      </div>
      {trip.horses.map((horse) => (
        <HorseConditionRow
          key={horse.id}
          horse={horse}
          observation={observation(horse.id)}
          onChange={(change) => update(horse.id, change)}
        />
      ))}
      {changingTime && (
        <div className="border-t border-line px-6 py-4">
          <RecordedAt value={at} onChange={setAt} label="Checked at" />
        </div>
      )}
    </Panel>
  );

  const side = (
    <>
      {next && <NextStopPanel stop={next} />}
      {previous && (
        <QuotedRecordPanel
          title={`Last check · ${formatTime(previous.occurredAt)}${
            previous.checkpointName ? ` at ${previous.checkpointName}` : ''
          }`}
          record={previous}
          fallback={previous.conditions
            .map((c) => `${c.horseName}: ${WORD[c.condition]}`)
            .join(' · ')}
        />
      )}
      <CustomerSeesPanel>
        Each horse’s word and your note, under “Latest condition log”. They read the word you chose.
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
            leaveBy && leaveIn !== null
              ? `${leaveIn >= 0 ? `Leave in ${durText(leaveIn)}` : `Leave now, ${durText(leaveIn)} over`} · by ${leaveBy.format('HH:mm')}`
              : counts.length
                ? counts.join(', ')
                : 'No horse checked yet'
          }
          sub={[
            // The counts go here only when the summary is the time to leave.
            leaveBy && counts.length ? `${counts.join(', ')}.` : null,
            notChecked.length && observed.length
              ? `Not checked: ${notChecked.map((h) => h.name).join(', ')}.`
              : null,
            'Sent as soon as you save; save again if the signal drops.',
          ]
            .filter(Boolean)
            .join(' ')}
          secondary={{ label: 'Change time', onClick: () => setChangingTime(true) }}
          action={{
            label: saving ? 'Saving…' : 'Save condition log',
            onClick: record,
            disabled: observed.length === 0 || saving,
          }}
        />
      }
    />
  );
};
