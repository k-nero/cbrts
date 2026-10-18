import type { AxiosError } from 'axios';

import type { ApiError } from '@/interfaces';

/**
 * The message to show for a failed request: the server's ApiError message (which names the rule,
 * the value found and the fix), else the transport error, else the given fallback.
 */
export const apiErrorMessage = (error: unknown, fallback: string): string => {
  const data = (error as AxiosError<Partial<ApiError>> | undefined)?.response?.data;
  if (data?.message) return data.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};

/**
 * Where a refusal goes on a form. A 400 "Validation Failed" maps each `details` line ("heightHh: must
 * not be null") onto its field; a code listed in `fieldsByCode` (HORSE_NAME_TAKEN → name) puts the
 * server's sentence on that field; everything else is one sentence for the form, the server's own,
 * or `fallback` when there is no ApiError body (the network is down).
 */
export const apiErrorView = (
  error: unknown,
  fieldsByCode: Record<string, string>,
  fallback: string,
): { fields: Record<string, string>; form: string | null } => {
  const data = (error as AxiosError<Partial<ApiError>> | undefined)?.response?.data;
  if (!data || typeof data !== 'object' || !data.message) {
    return { fields: {}, form: fallback };
  }
  if (data.error === 'Validation Failed' && data.details?.length) {
    const fields: Record<string, string> = {};
    for (const line of data.details) {
      const at = line.indexOf(':');
      if (at > 0) fields[line.slice(0, at).trim()] = line.slice(at + 1).trim();
    }
    return { fields, form: null };
  }
  const field = data.error ? fieldsByCode[data.error] : undefined;
  if (field) return { fields: { [field]: data.message }, form: null };
  return { fields: {}, form: data.message };
};

/**
 * A refusal laid out for a form that shows only `shownFields`: messages for fields it doesn't show
 * (a locked identity, say) join the form-level message, so nothing is lost; `focus` is the first shown
 * field with a message, so the form can bring it into view.
 */
export const formRefusal = (
  view: { fields: Record<string, string>; form: string | null },
  shownFields: string[],
): { fields: Record<string, string>; form: string | null; focus: string | null } => {
  const fields: Record<string, string> = {};
  const unshown: string[] = [];
  for (const [field, message] of Object.entries(view.fields)) {
    if (shownFields.includes(field)) fields[field] = message;
    else unshown.push(`${field}: ${message}`);
  }
  const form = [view.form, ...unshown].filter(Boolean).join('; ') || null;
  const focus = shownFields.find((field) => field in fields) ?? null;
  return { fields, form, focus };
};
