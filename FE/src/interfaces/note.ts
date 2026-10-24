export interface NoteReply {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  body: string;
  createdAt: string;
}

/** What a note is about (BE NoteTopic); the topic decides who answers it. */
export type NoteTopic = 'DOCUMENTS' | 'DATES_PRICE_CHANGES' | 'TRIP' | 'OTHER';

export interface CustomerNote {
  id: string;
  clubId: string;
  clubName: string;
  requestId?: string;
  requestCode?: string;
  jobId?: string;
  jobCode?: string;
  checklistItemId?: string;
  checklistItemName?: string | null;
  checklistItemDueDate?: string | null;
  checklistItemWarning?: string | null;
  topic: NoteTopic;
  routedRole: string;
  subject: string;
  body: string;
  createdById: string;
  createdByName: string;
  createdAt: string;
  replyDueAt: string | null;
  status: 'OPEN' | 'ANSWERED' | 'CLOSED';
  dueToday: boolean;
  overdue: boolean;
  attachedFileId?: string | null;
  attachedFileName?: string | null;
  attachedFileSizeBytes?: number | null;
  replies?: NoteReply[];
}

export interface CreateNoteReplyRequest {
  body: string;
  moveDueDateTo?: string;
  /** Shown to the customer with the moved date. */
  reasonForMove?: string;
}

/** A customer's note on one of their requests (POST /customer/requests/{id}/notes). */
export interface CreateCustomerNoteRequest {
  topic: NoteTopic;
  checklistItemId?: string;
  body: string;
  /** A file uploaded first through the file API. */
  attachedFileId?: string;
}
