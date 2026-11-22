import { z } from 'zod';

import type { CounterOfferRequest } from '@/interfaces';
import { money } from '@/lib/utils/quotation';

/** One line the club may tick: its key, its amount on this version, and whether it can be negotiated. */
export type NegotiableLine = { lineKey: string; amount: number; negotiable: boolean };

export type Ask = { ticked: boolean; price?: number | null; reason?: string };

export type NegotiateValues = { message: string; asks: Record<string, Ask | undefined> };

/**
 * The counter-offer form (spec 2026-11-23, Negotiate modal): at least one line ticked; each ticked line
 * with a price below its amount and a reason. The server checks the same again.
 */
export const makeNegotiateSchema = (lines: NegotiableLine[]) =>
  z
    .object({
      message: z.string().max(500, 'At most 500 characters.'),
      asks: z.record(
        z.string(),
        z
          .object({
            ticked: z.boolean(),
            price: z.number().nullish(),
            reason: z.string().max(300, 'At most 300 characters.').optional(),
          })
          .optional(),
      ),
    })
    .superRefine((v, ctx) => {
      const ticked = lines.filter((l) => l.negotiable && v.asks[l.lineKey]?.ticked);
      if (ticked.length === 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['asks'],
          message: "Tick at least one line you'd like cheaper.",
        });
        return;
      }
      for (const l of ticked) {
        const ask = v.asks[l.lineKey]!;
        if (ask.price == null) {
          ctx.addIssue({
            code: 'custom',
            path: ['asks', l.lineKey, 'price'],
            message: 'Enter the price you would pay.',
          });
        } else if (ask.price < 0 || ask.price >= l.amount) {
          ctx.addIssue({
            code: 'custom',
            path: ['asks', l.lineKey, 'price'],
            message: `Ask for less than ${money(l.amount)}.`,
          });
        }
        if (!ask.reason?.trim()) {
          ctx.addIssue({
            code: 'custom',
            path: ['asks', l.lineKey, 'reason'],
            message: 'Say why, for the logistics manager.',
          });
        }
      }
    });

/** The API body: only the ticked lines, reasons and the message trimmed, a blank message as null. */
export const toCounterOfferBody = (v: NegotiateValues, versionNo: number): CounterOfferRequest => ({
  versionNo,
  message: v.message.trim() || null,
  lines: Object.entries(v.asks)
    .filter(([, ask]) => ask?.ticked)
    .map(([lineKey, ask]) => ({
      lineKey,
      askedAmount: ask!.price as number,
      reason: (ask!.reason ?? '').trim(),
    })),
});
