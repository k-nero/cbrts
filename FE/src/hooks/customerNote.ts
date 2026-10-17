import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { customerNoteApi } from '@/apis/customerNote';
import { queryKeys } from '@/constant/query';
import type { CreateNoteReplyRequest, CustomerNote } from '@/interfaces';

/**
 * Open customer notes routed to the current staff role.
 */
export const useCustomerNotes = () => {
  return useQuery({
    queryKey: queryKeys.customerNotes.all(),
    queryFn: async (): Promise<CustomerNote[]> => {
      const res = await customerNoteApi.getNotes();
      return res.data;
    },
  });
};

/**
 * Details of a single customer note, including replies and linked context.
 */
export const useCustomerNote = (id: string | null | undefined) => {
  return useQuery({
    queryKey: queryKeys.customerNotes.detail(id ?? ''),
    queryFn: async (): Promise<CustomerNote | null> => {
      if (!id) return null;
      const res = await customerNoteApi.getNote(id);
      return res.data;
    },
    enabled: Boolean(id),
  });
};

/**
 * Reply to a customer note, optionally moving due date.
 */
export const useReplyCustomerNote = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateNoteReplyRequest }) =>
      customerNoteApi.replyNote(id, data),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.customerNotes.all() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.customerNotes.detail(variables.id) });
    },
  });
};
