import { useDraggable, useDroppable } from '@dnd-kit/core';

import type { Picked } from './LoadPlanTab';

import { StallTile } from '@/components/ui';
import type { JobHorse, LoadPlanStall } from '@/interfaces';

/** On a shared trip the tile names the job the horse travels under (US-F3-11). */
const stallMeta = (h: JobHorse) =>
  `${h.jobCode ? h.jobCode + ' · ' : ''}${h.sex} · ${h.weightKg} kg · ${h.temperament}`;

const stallType = (s: LoadPlanStall) => s.stallType.toLowerCase() as 'standard' | 'box' | 'climate';

/** One stall: a drop target, and the drag source of the horse standing in it. */
export function StallSlot({
  stall,
  selected,
  dragging,
  interactive,
  disabled,
  onClick,
}: {
  stall: LoadPlanStall;
  selected: Picked | null;
  dragging: Picked | null;
  /** False on a confirmed plan: the tile is read-only. */
  interactive: boolean;
  /** True while a move is pending: no new drag starts. */
  disabled: boolean;
  onClick: () => void;
}) {
  const horse = stall.horse ?? null;
  const drop = useDroppable({ id: stall.stallId, disabled: !interactive });
  const drag = useDraggable({
    id: horse ? `horse:${horse.id}` : `empty:${stall.stallId}`,
    data: horse ? ({ horse, fromStallId: stall.stallId } satisfies Picked) : undefined,
    disabled: !interactive || disabled || !horse,
  });

  const picked = dragging ?? selected;
  const isSource = picked?.fromStallId === stall.stallId;
  let state: 'empty' | 'occupied' | 'conflict' | 'target' = 'empty';
  let targetHint: string | undefined;
  if (dragging && drop.isOver && !isSource) {
    state = 'target';
    targetHint = !horse
      ? `Place ${dragging.horse.name} here`
      : dragging.fromStallId
        ? `Swap ${dragging.horse.name} and ${horse.name}`
        : `Place ${dragging.horse.name} here. ${horse.name} goes back to the list.`;
  } else if (stall.issue) {
    state = 'conflict';
  } else if (horse) {
    state = 'occupied';
  } else if (selected) {
    state = 'target';
    targetHint = `Place ${selected.horse.name} here`;
  }

  return (
    <div
      ref={(node) => {
        drop.setNodeRef(node);
        drag.setNodeRef(node);
      }}
      {...drag.listeners}
      className={drag.isDragging ? 'opacity-40' : undefined}
    >
      <StallTile
        type={stallType(stall)}
        state={state}
        stall={`Stall ${stall.positionNo}`}
        horse={horse?.name}
        meta={horse ? stallMeta(horse) : undefined}
        issue={stall.issue}
        targetHint={targetHint}
        onClick={interactive ? onClick : undefined}
      />
    </div>
  );
}
