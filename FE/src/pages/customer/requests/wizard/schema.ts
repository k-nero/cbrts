import { z } from 'zod';

import { windowMinutes, type WizardValues } from '@/lib/utils';

/** The shortest arrival window, as the backend's check (R-04) until the rate catalog carries it. */
const WINDOW_MIN_HOURS = 3;

/**
 * The wizard's form. A draft may be incomplete, so every field passes as it is; only the arrival
 * window is checked here, in the backend's own sentences, so a save is never refused for it.
 */
export const wizardSchema = z.custom<WizardValues>().superRefine((v, ctx) => {
  if (v.arrivalMode !== 'WINDOW') return;
  const from = v.windowFrom?.value;
  const until = v.windowUntil?.value;
  if (!v.arriveOn || !from || !until) {
    ctx.addIssue({
      code: 'custom',
      path: [!v.arriveOn ? 'arriveOn' : !from ? 'windowFrom' : 'windowUntil'],
      message: 'An arrival window needs both a start and an end.',
    });
    return;
  }
  const minutes = windowMinutes(from, until);
  if (minutes <= 0) {
    ctx.addIssue({
      code: 'custom',
      path: ['windowUntil'],
      message: 'The arrival window ends before it starts.',
    });
  } else if (minutes < WINDOW_MIN_HOURS * 60) {
    ctx.addIssue({
      code: 'custom',
      path: ['windowUntil'],
      message: `An arrival window is at least ${WINDOW_MIN_HOURS} hours; ${from}–${until} is shorter.`,
    });
  }
});
