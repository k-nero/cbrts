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
