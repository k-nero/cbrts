// Email and password are asked only when creating; an existing account keeps both.
import { z } from 'zod';

const roleOption = z.object({ label: z.string(), value: z.string() }, 'Pick a role.');
export const schema = z
  .object({
    isCreate: z.boolean(),
    email: z.string(),
    password: z.string(),
    firstName: z.string().min(1, 'Enter the given name.'),
    lastName: z.string().min(1, 'Enter the family name.'),
    phone: z.string(),
    role: roleOption.nullable(),
  })
  .superRefine((val, ctx) => {
    if (val.role === null)
      ctx.addIssue({ code: 'custom', path: ['role'], message: 'Pick a role.' });
    if (!val.isCreate) return;
    if (!z.email().safeParse(val.email).success) {
      ctx.addIssue({ code: 'custom', path: ['email'], message: 'Enter a valid email.' });
    }
    if (val.password.length < 12) {
      ctx.addIssue({
        code: 'custom',
        path: ['password'],
        message: `Yours has ${val.password.length}.`,
      });
    }
  });
export type UserForm = z.infer<typeof schema>;
