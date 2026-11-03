import type { FC } from 'react';
import { Select } from 'antd';
import { useIsMutating } from '@tanstack/react-query';

import { CabClock } from './CabClock';

import { Chip, Icon, StageMark, type Tone } from '@/components/ui';
import { useMe } from '@/hooks/auth';
import type { TripSummary } from '@/interfaces';

type Props = {
  trips: TripSummary[];
  /** The selected trip's row key (tripCode, else jobCode). */
  selected: string;
  onSelect: (key: string) => void;
  route: string;
  stage: 'Trip' | 'Handover';
  state: { tone: Tone; word: string };
};

export const tripKey = (row: TripSummary) => row.tripCode ?? row.jobCode;
const tripLabel = (row: TripSummary) =>
  row.tripCode ? `${row.tripCode} · ${row.jobCodes.join(', ')}` : row.jobCode;

/** Vietnamese names put the family name first: "Trần Văn Minh" → "TM". */
const initialsOf = (first: string, last: string) =>
  `${last.at(0) ?? ''}${first.split(' ').at(-1)?.at(0) ?? ''}`.toUpperCase();

/**
 * One line of context (DESIGN.md, Escort cab surface): the trip, its route and stage, the state
 * that matters now, whether everything is sent, the time and who is signed in.
 */
export const CabBar: FC<Props> = ({ trips, selected, onSelect, route, stage, state }) => {
  const me = useMe().data;
  const sending = useIsMutating() > 0;
  const current = trips.find((row) => tripKey(row) === selected);
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-lg border border-line bg-card px-6 py-3.5">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {trips.length > 1 ? (
          <Select
            aria-label="Your trips"
            variant="borderless"
            value={selected}
            onChange={onSelect}
            popupMatchSelectWidth={false}
            className="type-data -ml-3 shrink-0"
            options={trips.map((row) => ({
              value: tripKey(row),
              label: tripLabel(row),
            }))}
          />
        ) : (
          current && <span className="type-data text-ink-2">{tripLabel(current)}</span>
        )}
        <span className="type-h4 min-w-0 truncate text-ink" title={route}>
          {route}
        </span>
        <span className="shrink-0 whitespace-nowrap">
          <StageMark stage={stage} />
        </span>
        <Chip tone={state.tone}>{state.word}</Chip>
      </div>
      <span className="flex items-center gap-2">
        <Icon
          name={sending ? 'clock' : 'check'}
          size={18}
          className={sending ? 'text-warn' : 'text-ok'}
        />
        <span className={`type-label-s ${sending ? 'text-warn' : 'text-ink-2'}`}>
          {sending ? 'Sending…' : 'All records sent'}
        </span>
      </span>
      <CabClock />
      {me && (
        <span className="flex items-center gap-2.5">
          <span className="type-label-s grid size-9 place-items-center rounded-full bg-muted text-ink-2">
            {initialsOf(me.firstName, me.lastName)}
          </span>
          <span className="flex flex-col">
            <span className="type-label-s text-ink">{`${me.lastName} ${me.firstName}`}</span>
            <span className="type-body-s text-ink-3">Escort</span>
          </span>
        </span>
      )}
    </div>
  );
};
