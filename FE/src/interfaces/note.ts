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
  checklistItemName?: string;
  checklistItemDueDate?: string;
  checklistItemWarning?: string;
  topic: 'DOCUMENTS' | 'DATES_PRICE_CHANGES' | 'THE_TRIP';
  routedRole: string;
  subject: string;
  body: string;
  createdById: string;
  createdByName: string;
  createdAt: string;
  replyDueAt: string;
  status: 'OPEN' | 'RESOLVED' | 'ANSWERED';
  dueToday?: boolean;
  isDueToday?: boolean;
  overdue?: boolean;
  isOverdue?: boolean;
  attachedFileName?: string;
  attachedFileSize?: string;
  replies?: NoteReply[];
}

export interface CreateNoteReplyRequest {
  body: string;
  moveDueDateTo?: string;
  moveDueDateReason?: string;
}
