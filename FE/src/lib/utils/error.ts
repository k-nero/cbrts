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
