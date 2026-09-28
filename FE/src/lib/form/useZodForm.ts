import { type FieldValues, type Resolver, useForm, type UseFormProps } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ZodType } from 'zod';

/**
 * Thin wrapper around react-hook-form's `useForm` that wires a zod schema as
 * both the validation resolver and the inferred form-value type. The schema is
 * the single source of truth: field values are the schema's *input* type (what
 * the inputs hold), and `handleSubmit` hands you the *output* type
 * (post-validation/transform), so you never hand-write a `*FormValues`
 * interface again.
 *
 * The resolver cast bridges zod v4's generic variance, which resolver v5's
 * overloads don't infer cleanly through a wrapper — the public signature stays
 * fully typed.
 */
export function useZodForm<TOut extends FieldValues, TIn extends FieldValues = TOut>(
    schema: ZodType<TOut, TIn>,
    options?: Omit<UseFormProps<TIn, unknown, TOut>, 'resolver'>
) {
    return useForm<TIn, unknown, TOut>({
        mode: 'onTouched',
        ...options,
        resolver: zodResolver(schema) as Resolver<TIn, unknown, TOut>,
    });
}
