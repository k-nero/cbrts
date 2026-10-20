import client from '@/config/axios';
import type { CreateNoteReplyRequest, CustomerNote } from '@/interfaces';

export const customerNoteApi = {
  getNotes: () => client.get<CustomerNote[]>('/staff/customer-notes'),
  getNote: (id: string) => client.get<CustomerNote>(`/staff/customer-notes/${id}`),
  replyNote: (id: string, data: CreateNoteReplyRequest) =>
    client.post<CustomerNote>(`/staff/customer-notes/${id}/replies`, data),
};
