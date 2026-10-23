import { Chip } from '@/components/ui';
import type { JobHorse } from '@/interfaces';

/** The "To load" column is a drop target too: dropping a placed horse there unloads it. */
export const QUEUE_DROP_ID = 'queue';

/** A horse's sex, weight and breed; on a shared trip, the job it travels under first. */
export const horseMeta = (h: JobHorse) =>
  `${h.jobCode ? h.jobCode + ' · ' : ''}${h.sex || ''} · ${h.weightKg ? h.weightKg + ' kg' : ''} · ${h.breed || ''}`;

export const temperamentChip = (h: JobHorse) =>
  h.temperament ? (
    <Chip
      tone={h.temperament === 'AGGRESSIVE' ? 'bad' : h.temperament === 'NERVOUS' ? 'warn' : 'ok'}
    >
      {h.temperament}
    </Chip>
  ) : undefined;
