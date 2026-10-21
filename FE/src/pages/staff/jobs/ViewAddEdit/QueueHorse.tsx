import { useDraggable } from '@dnd-kit/core';

import { horseMeta, temperamentChip } from './loadPlan';
import type { Picked } from './LoadPlanTab';

import { LoadItem } from '@/components/ui';
import type { JobHorse } from '@/interfaces';

/** A horse waiting to load: drag it onto a stall, or select it and choose one. */
export function QueueHorse({
  horse,
  selected,
  disabled,
  onSelect,
}: {
  horse: JobHorse;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({
    id: `horse:${horse.id}`,
    data: { horse, fromStallId: null } satisfies Picked,
    disabled,
  });
  return (
    <LoadItem
      ref={setNodeRef}
      {...listeners}
      aria-describedby={attributes['aria-describedby']}
      horse={horse.name}
      meta={horseMeta(horse)}
      selected={selected}
      onClick={onSelect}
      tag={temperamentChip(horse)}
      className={isDragging ? 'opacity-40' : undefined}
    />
  );
}
