import type { FC, ReactNode } from 'react';
import { Flex } from 'antd';

import { CabDock } from './CabDock';
import { CabLayout } from './CabLayout';
import { REST_EVERY_HOURS, durText, lastRecord } from './cabState';
import { CustomerSeesPanel } from './CustomerSeesPanel';
import { QuotedRecordPanel } from './QuotedRecordPanel';
import { TaskHead } from './TaskHead';

import { Button, Callout, Panel } from '@/components/ui';
import type { TripView } from '@/interfaces';
import { TripRecordKindEnum } from '@/interfaces';
import { formatTime, ict } from '@/lib/utils';

/** The operations desk (DESIGN.md, Footer); a placeholder until the real line is set. */
const DESK_PHONE = '+84 28 0000 0000';

/**
 * Held (DESIGN.md, Escort cab surface): the logistics manager decides, so there is no gold. The
 * escort sees who was alerted and when, the time on the trailer against the rest rule, and what to
 * do while waiting.
 */
export const HeldTask: FC<{ trip: TripView; onLogCondition: () => void; extra?: ReactNode }> = ({
  trip,
  onLogCondition,
  extra,
}) => {
  const hold = lastRecord(trip, TripRecordKindEnum.HELD);
  const loaded =
    lastRecord(trip, TripRecordKindEnum.LOADED) ?? lastRecord(trip, TripRecordKindEnum.DEPARTED);
  const where = hold?.checkpointName;
  const now = ict(new Date().toISOString());
  const unloadBy = loaded ? ict(loaded.occurredAt).add(REST_EVERY_HOURS, 'hour') : null;

  const task = (
    <Panel flush>
      <TaskHead
        title={where ? `Held at ${where}` : 'Held on the road'}
        sub={
          hold ? `You recorded the hold at ${formatTime(hold.occurredAt)}.` : 'The trip is held.'
        }
      />
      <div className="flex flex-col gap-[18px] px-6 pt-1 pb-6">
        <Callout
          tone="info"
          title={`The logistics manager was alerted${hold ? ` at ${formatTime(hold.occurredAt)}` : ''} and is deciding`}
        >
          They’ll choose between waiting, re-routing or returning, and call you. Stay where the
          trailer is safe. Unload only if a horse needs it.
        </Callout>
        {loaded && unloadBy && (
          <div className="flex items-center gap-6 rounded-lg border border-warn-line bg-warn-soft px-5 py-4">
            <span className="type-data-l text-warn">
              {durText(now.diff(ict(loaded.occurredAt), 'minute'))}
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="type-label-m text-ink">
                On the trailer since {formatTime(loaded.occurredAt)}
              </span>
              <span className="type-body-s text-ink-2">
                Unload to rest by {unloadBy.format('HH:mm')}: at least every {REST_EVERY_HOURS}{' '}
                hours.
              </span>
            </span>
          </div>
        )}
        <Flex wrap gap={12}>
          <Button leadingIcon="plus" className="h-14" onClick={onLogCondition}>
            Log water or a check
          </Button>
          <Button
            leadingIcon="phone"
            className="h-14"
            onClick={() => window.location.assign(`tel:${DESK_PHONE.replaceAll(' ', '')}`)}
          >
            Call the operations desk · {DESK_PHONE}
          </Button>
        </Flex>
      </div>
    </Panel>
  );

  const side = (
    <>
      {hold && (
        <QuotedRecordPanel
          title="What you recorded"
          record={hold}
          fallback="Held, without a note."
        />
      )}
      <CustomerSeesPanel>
        “Held{where ? ` at ${where}` : ''}
        {hold ? ` since ${formatTime(hold.occurredAt)}` : ''}”, and the office’s message once it
        decides. Never a guessed arrival time.
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
          summary="Waiting for the office’s decision"
          sub="Nothing to record until it decides; any water or checks you log go on the trip record."
        />
      }
    />
  );
};
