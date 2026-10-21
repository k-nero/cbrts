import { z } from 'zod';

export const PASSWORD_MIN = 12;

export const registerSchema = z
  .object({
    clubName: z.string().trim().min(1, 'Enter the club or owner name.'),
    country: z.object({ label: z.string(), value: z.string() }).nullable(),
    lastName: z.string().trim().min(1, 'Enter your family name.'),
    firstName: z.string().trim().min(1, 'Enter your given name.'),
    email: z.email('Enter the email you’ll sign in with.'),
    phone: z.string().trim().max(20, 'At most 20 characters.'),
    password: z.string(),
    terms: z.boolean(),
  })
  .superRefine((val, ctx) => {
    if (val.country === null) {
      ctx.addIssue({ code: 'custom', path: ['country'], message: 'Pick the club’s country.' });
    }
    // Name the rule and the value (DESIGN.md, Access).
    if (val.password.length < PASSWORD_MIN) {
      ctx.addIssue({
        code: 'custom',
        path: ['password'],
        message: `At least ${PASSWORD_MIN} characters. Yours has ${val.password.length}.`,
      });
    }
    if (!val.terms) {
      ctx.addIssue({ code: 'custom', path: ['terms'], message: 'Agree to the terms to continue.' });
    }
  });

export type RegisterForm = z.infer<typeof registerSchema>;
