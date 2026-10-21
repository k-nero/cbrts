import { useDroppable } from '@dnd-kit/core';
import { type ReactNode } from 'react';

import { QUEUE_DROP_ID } from './loadPlan';

import type { JobHorse } from '@/interfaces';

/** The "To load" list. While a placed horse is dragged it also takes the drop that unloads it. */
export function QueueColumn({
  count,
  unloading,
  disabled,
  children,
}: {
  count: number;
  unloading: JobHorse | null;
  disabled: boolean;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: QUEUE_DROP_ID, disabled });
  return (
    <div ref={setNodeRef} className="flex flex-col gap-3">
      <span className="type-label-s text-ink-2">To load · {count}</span>
      {unloading && (
        <div
          className={
            isOver
              ? 'rounded-md border border-dashed border-gold bg-gold-soft p-4 text-center'
              : 'rounded-md border border-dashed border-line-strong p-4 text-center'
          }
        >
          <span className={isOver ? 'type-label-s text-gold-ink' : 'type-body-s text-ink-3'}>
            Drop here to take {unloading.name} off the vehicle
          </span>
        </div>
      )}
      {children}
    </div>
  );
}
