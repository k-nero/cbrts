import { type FC, type ReactNode, useState } from 'react';
import { Flex, Input } from 'antd';
import dayjs from 'dayjs';

import { CabDock } from './CabDock';
import { CabLayout } from './CabLayout';
import { type CabPosition, outcomes, recordStop, stopKindLabel } from './cabState';
import { CustomerSeesPanel } from './CustomerSeesPanel';
import { NextStopPanel } from './NextStopPanel';
import { OnBoardPanel } from './OnBoardPanel';
import { RecordedAt } from './RecordedAt';
import { TaskHead } from './TaskHead';
import { useCabRecord } from './useCabRecord';

import { recordLabel } from '../tripFormat';

import { Button, OptionCard, Panel } from '@/components/ui';
import type { TripView } from '@/interfaces';
import { formatTime } from '@/lib/utils';

type Props = {
  trip: TripView;
  tripCode?: string;
  position: CabPosition;
  onLogCondition: () => void;
  extra?: ReactNode;
};

/** Record where the trip stands: the outcome at this stop (or arriving at the next), and when. */
export const CheckpointTask: FC<Props> = ({ trip, tripCode, position, onLogCondition, extra }) => {
  const options = outcomes(trip, position);
  const [picked, setPicked] = useState(options.find((o) => !o.blocked)?.kind);
  const [note, setNote] = useState('');
  const [at, setAt] = useState(dayjs);
  const [changingTime, setChangingTime] = useState(false);
  const { save, saving } = useCabRecord(trip.jobCode, tripCode);

  const outcome = options.find((o) => o.kind === picked && !o.blocked);
  const stop = position.at >= 0 ? trip.stops[position.at] : undefined;
  const mark = position.at >= 0 ? position.marks[position.at] : null;
  const next = position.next >= 0 ? trip.stops[position.next] : undefined;
  const time = formatTime(at.toISOString());
  const title = stop?.name ?? (next ? `On the way to ${next.name}` : 'On the road');
  const sub = stop
    ? [
        stopKindLabel(stop.kind),
        stop.details,
        mark ? `${recordLabel(mark.kind, stop.kind)} ${formatTime(mark.at)}.` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : 'Record each stop as you reach it; between stops the customer sees your last record.';

  const record = async () => {
    if (!outcome) return;
    const saved = await save(
      {
        routeStopId: recordStop(trip, position, outcome.kind),
        kind: outcome.kind,
        at,
        text: note.trim() || undefined,
      },
      `${outcome.title} recorded at ${time}.`,
    );
    if (saved) {
      setNote('');
      setAt(dayjs());
      setChangingTime(false);
    }
  };

  const task = (
    <Panel flush>
      <TaskHead
        title={title}
        sub={sub}
        extra={
          trip.horses.length > 0 && (
            <Button variant="ghost" leadingIcon="check" onClick={onLogCondition}>
              Log each horse’s condition
            </Button>
          )
        }
      />
      <div className="flex flex-col gap-5 px-6 pt-1 pb-6">
        <Flex vertical gap={10}>
          <span className="type-label-m text-ink-2">Outcome</span>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {options.map((option) => (
              <OptionCard
                key={option.kind}
                name="outcome"
                value={option.kind}
                selected={option.kind === picked}
                disabled={Boolean(option.blocked)}
                onChange={() => setPicked(option.kind)}
                icon={option.icon}
                title={option.title}
                description={option.description}
                meta={option.blocked ?? option.meta}
              />
            ))}
          </div>
        </Flex>
        {changingTime && <RecordedAt value={at} onChange={setAt} />}
        <Flex vertical gap={8}>
          <span className="type-label-m text-ink-2">Note (optional)</span>
          <Input.TextArea
            size="large"
            value={note}
            maxLength={500}
            autoSize={{ minRows: 1, maxRows: 4 }}
            placeholder="What happened here?"
            onChange={(event) => setNote(event.target.value)}
          />
        </Flex>
      </div>
    </Panel>
  );

  const side = (
    <>
      {next && <NextStopPanel stop={next} />}
      <OnBoardPanel trip={trip} />
      <CustomerSeesPanel>
        The last checkpoint you recorded, with its time. Between checkpoints they see that one,
        never an estimate.
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
          summary={outcome ? `${outcome.title} at ${time}` : 'Choose what happened'}
          sub="Sent as soon as you save. If the signal drops, save again: it is recorded once."
          secondary={{ label: 'Change time', onClick: () => setChangingTime(true) }}
          action={{
            label: saving
              ? 'Saving…'
              : outcome
                ? `Record: ${outcome.verb ?? outcome.title.toLowerCase()} at ${time}`
                : 'Record',
            onClick: record,
            disabled: !outcome || saving,
          }}
        />
      }
    />
  );
};
