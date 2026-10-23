import { z } from 'zod';

/** The reply composer: the reply itself, and optionally a moved due date with the reason the customer sees. */
export const replySchema = z
  .object({
    body: z.string().trim().min(1, 'Write the reply to the customer.').max(2000),
    moveDueDate: z.boolean(),
    moveDueDateTo: z.string(),
    reasonForMove: z.string().trim().max(300),
  })
  .superRefine((v, ctx) => {
    if (!v.moveDueDate) return;
    if (!v.moveDueDateTo)
      ctx.addIssue({ code: 'custom', path: ['moveDueDateTo'], message: 'Pick the new due date.' });
    if (!v.reasonForMove)
      ctx.addIssue({
        code: 'custom',
        path: ['reasonForMove'],
        message: 'Say why the date moves; the customer sees this.',
      });
  });

export type ReplyForm = z.infer<typeof replySchema>;
