import client from '@/config/axios';
import type { CreateCustomerNoteRequest, CreateNoteReplyRequest, CustomerNote } from '@/interfaces';

export const customerNoteApi = {
  getNotes: () => client.get<CustomerNote[]>('/staff/customer-notes'),
  getNote: (id: string) => client.get<CustomerNote>(`/staff/customer-notes/${id}`),
  replyNote: (id: string, data: CreateNoteReplyRequest) =>
    client.post<CustomerNote>(`/staff/customer-notes/${id}/replies`, data),
  /** The customer's notes on one of their requests, with replies, oldest first. */
  getRequestNotes: (requestId: string) =>
    client.get<CustomerNote[]>(`/customer/requests/${requestId}/notes`),
  createRequestNote: (requestId: string, data: CreateCustomerNoteRequest) =>
    client.post<CustomerNote>(`/customer/requests/${requestId}/notes`, data),
};
