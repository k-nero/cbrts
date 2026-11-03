import type { UploadFile } from 'antd';

import type { HorseCondition } from '@/interfaces';

/** One horse at a stop, as the escort fills it in. */
export type Observation = {
  condition: HorseCondition | null;
  drinking: boolean | null;
  eating: boolean | null;
  note: string;
  photos: UploadFile[];
};

export const emptyObservation = (): Observation => ({
  condition: null,
  drinking: null,
  eating: null,
  note: '',
  photos: [],
});
