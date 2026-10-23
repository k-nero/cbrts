export interface NoteReply {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  body: string;
  createdAt: string;
}

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
  topic: 'DOCUMENTS' | 'DATES_PRICE_CHANGES' | 'THE_TRIP';
  routedRole: string;
  subject: string;
  body: string;
  createdById: string;
  createdByName: string;
  createdAt: string;
  replyDueAt: string | null;
  status: 'OPEN' | 'RESOLVED' | 'ANSWERED';
  dueToday: boolean;
  overdue: boolean;
  attachedFileName?: string | null;
  attachedFileSize?: string | null;
  replies?: NoteReply[];
}

export interface CreateNoteReplyRequest {
  body: string;
  moveDueDateTo?: string;
  /** Shown to the customer with the moved date. */
  reasonForMove?: string;
}
