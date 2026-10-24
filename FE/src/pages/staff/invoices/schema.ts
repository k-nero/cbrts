import { z } from 'zod';

/** An estimated line's actual quantity; a change needs the reason, which the customer reads. */
export const actualSchema = (quoted: number) =>
  z
    .object({
      quantity: z
        .number({ error: 'Enter the actual quantity.' })
        .min(0, "It can't be negative.")
        .max(99_999_999, 'That is more than a line can hold.'),
      note: z.string().trim().max(300, 'At most 300 characters.'),
    })
    .superRefine((v, ctx) => {
      if (v.quantity !== quoted && !v.note)
        ctx.addIssue({
          code: 'custom',
          path: ['note'],
          message: 'Say why it differs from the quotation; the customer reads it.',
        });
    });
export type ActualForm = { quantity: number; note: string };

/** A payment received, recorded by hand. */
export const paymentSchema = (due: number) =>
  z.object({
    amount: z
      .number({ error: 'Enter the amount received.' })
      .gt(0, 'Enter the amount received.')
      .max(due, `At most what is owed, ${due.toFixed(2)}.`),
    method: z.object(
      { label: z.string(), value: z.enum(['BANK_TRANSFER', 'CARD']) },
      { error: 'Choose how it was paid.' },
    ),
    reference: z.string().trim().max(100, 'At most 100 characters.'),
    receivedOn: z
      .string({ error: 'Choose the day it was received.' })
      .min(1, 'Choose the day it was received.'),
  });
export type PaymentForm = {
  amount: number;
  method: { label: string; value: 'BANK_TRANSFER' | 'CARD' };
  reference: string;
  receivedOn: string;
};
