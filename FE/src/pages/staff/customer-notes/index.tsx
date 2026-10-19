import { useState, useMemo, type FC } from 'react';
import { Button, Chip, Panel, Icon, cx } from '@/components/ui';
import { useCustomerNotes, useReplyCustomerNote } from '@/hooks/customerNote';
import type { CustomerNote } from '@/interfaces';

export const CustomerNotesPage: FC = () => {
  const { data: notes = [], isLoading, isError } = useCustomerNotes();
  const replyMutation = useReplyCustomerNote();

  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [moveDueDate, setMoveDueDate] = useState(false);
  const [newDueDate, setNewDueDate] = useState('2026-10-02');
  const [moveDueDateReason, setMoveDueDateReason] = useState(
    'The insurer issues on 1 Oct; clearance is 12 Oct, so there is room.',
  );
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Default to first note if not selected
  const activeNote = useMemo(() => {
    if (!notes.length) return null;
    if (selectedNoteId) {
      const found = notes.find((n) => n.id === selectedNoteId);
      if (found) return found;
    }
    return notes[0];
  }, [notes, selectedNoteId]);

  const dueTodayCount = useMemo(() => {
    return notes.filter((n) => n.dueToday || n.isDueToday || n.overdue || n.isOverdue).length;
  }, [notes]);

  const handleSelectNote = (note: CustomerNote) => {
    setSelectedNoteId(note.id);
    setReplyText('');
    setMoveDueDate(false);
  };

  const handleSendReply = async () => {
    if (!activeNote || !replyText.trim()) return;

    try {
      await replyMutation.mutateAsync({
        id: activeNote.id,
        data: {
          body: replyText.trim(),
          moveDueDateTo: moveDueDate ? newDueDate : undefined,
          moveDueDateReason: moveDueDate ? moveDueDateReason : undefined,
        },
      });
      setReplyText('');
      setSuccessToast('Reply sent to customer and recorded on job.');
      setTimeout(() => setSuccessToast(null), 4000);
    } catch {
      // Error handled by query / error boundary
    }
  };

  const formatNoteDate = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-6">
      {/* Top Header */}
      <header className="flex flex-col gap-2 border-b border-line pb-5">
        <div className="flex items-center gap-3">
          <h1 className="type-h2 m-0 text-ink">Customer notes</h1>
          {dueTodayCount > 0 && <Chip tone="warn">{dueTodayCount} due today</Chip>}
        </div>
        <p className="type-body-s m-0 text-ink-secondary">
          Notes customers left on their requests, routed to you by topic. Reply within 1 business
          day.
        </p>
      </header>

      {successToast && (
        <div className="flex items-center gap-2 rounded-lg border border-ok-border bg-ok-bg p-3.5 text-ok-fg">
          <Icon name="check" size={18} />
          <span className="type-body-s font-medium">{successToast}</span>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center p-16 text-ink-tertiary">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gold border-t-transparent" />
          <span className="ml-3 type-body-m">Loading customer notes...</span>
        </div>
      ) : isError ? (
        <div className="rounded-lg border border-bad-border bg-bad-bg p-6 text-bad-fg">
          <h4 className="type-h4 m-0">Failed to load customer notes</h4>
          <p className="type-body-s mt-1">Please check your network or try refreshing.</p>
        </div>
      ) : notes.length === 0 ? (
        <div className="rounded-lg border border-line bg-card p-12 text-center text-ink-secondary">
          <Icon name="file" size={32} className="mx-auto mb-2 text-ink-tertiary" />
          <p className="type-body-m">No customer notes in your queue right now.</p>
        </div>
      ) : (
        /* 2-column Master-Detail Layout */
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column: Note list */}
          <div className="lg:col-span-5">
            <Panel
              flush
              title={`Open · ${notes.length}`}
              extra={<span className="type-caption text-ink-tertiary">Oldest first</span>}
            >
              <div className="divide-y divide-line">
                {notes.map((note) => {
                  const isSelected = activeNote?.id === note.id;
                  return (
                    <button
                      key={note.id}
                      type="button"
                      onClick={() => handleSelectNote(note)}
                      className={cx(
                        'w-full text-left p-4.5 transition-colors flex flex-col gap-1.5 focus:outline-none',
                        isSelected
                          ? 'bg-[var(--surface-raised)] border-l-4 border-l-gold shadow-xs'
                          : 'hover:bg-sunken/60',
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="type-label-s font-semibold text-ink truncate">
                          {note.clubName}
                        </span>
                        {note.dueToday || note.isDueToday || note.overdue || note.isOverdue ? (
                          <span className="type-mono-caption text-right text-warn-fg font-medium">
                            Reply today
                          </span>
                        ) : (
                          <span className="type-mono-caption text-right text-ink-tertiary">
                            In 1 day
                          </span>
                        )}
                      </div>

                      <div className="type-body-s line-clamp-2 text-ink-secondary font-medium">
                        {note.subject}
                      </div>

                      <div className="type-mono-caption flex items-center justify-between text-ink-tertiary pt-0.5">
                        <span>{note.jobCode || note.requestCode}</span>
                        <span>{formatNoteDate(note.createdAt)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </Panel>
          </div>

          {/* Right Column: Selected Note Detail & Composer */}
          <div className="lg:col-span-7">
            {activeNote && (
              <Panel flush className="flex flex-col">
                {/* Note Detail Header */}
                <div className="border-b border-line p-6 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="type-h4 m-0 text-ink">
                      {activeNote.clubName} · {activeNote.jobCode || activeNote.requestCode}
                    </h3>
                    <div className="type-caption mt-1 text-ink-tertiary">
                      {formatNoteDate(activeNote.createdAt)} · from the request page
                    </div>
                  </div>
                  <Chip tone="info">
                    {activeNote.topic === 'DOCUMENTS'
                      ? 'Documents'
                      : activeNote.topic === 'DATES_PRICE_CHANGES'
                        ? 'Dates, price'
                        : 'The trip'}
                  </Chip>
                </div>

                <div className="p-6 flex flex-col gap-6">
                  {/* Customer Question Quote */}
                  <div className="rounded-lg border-l-4 border-l-gold/60 bg-sunken/60 p-4">
                    <p className="type-body-m m-0 font-serif italic text-ink">
                      “{activeNote.body}”
                    </p>
                  </div>

                  {/* Attached File Row */}
                  {activeNote.attachedFileName && (
                    <div className="flex items-center justify-between rounded-lg border border-line bg-card p-3.5 px-4 shadow-xs">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-sunken text-ink-secondary">
                          <Icon name="file" size={18} />
                        </div>
                        <div>
                          <div className="type-label-s text-ink font-medium">
                            {activeNote.attachedFileName}
                          </div>
                          <div className="type-mono-caption text-ink-tertiary">
                            {activeNote.attachedFileSize || 'PDF · 84 KB'}
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        Open
                      </Button>
                    </div>
                  )}

                  {/* Linked Checklist Item (Sunken panel) */}
                  {activeNote.checklistItemName && (
                    <div className="flex items-start gap-3.5 rounded-lg border border-line bg-sunken p-4">
                      <Chip tone="warn" className="shrink-0 mt-0.5">
                        {activeNote.checklistItemWarning ? 'Expires in transit' : 'Action needed'}
                      </Chip>
                      <div className="flex flex-col gap-1">
                        <div className="type-label-s text-ink font-medium">
                          {activeNote.checklistItemName}
                          {activeNote.checklistItemDueDate &&
                            ` · due ${activeNote.checklistItemDueDate}`}
                        </div>
                        <div className="type-body-s text-ink-secondary">
                          {activeNote.checklistItemWarning ||
                            'Clearance is planned for 12 Oct 2026. Extension must be received before clearance.'}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Earlier Replies on this note */}
                  {activeNote.replies && activeNote.replies.length > 0 && (
                    <div className="flex flex-col gap-3 border-t border-line pt-4">
                      <h4 className="type-label-m m-0 text-ink">Previous replies</h4>
                      {activeNote.replies.map((reply) => (
                        <div
                          key={reply.id}
                          className="flex flex-col gap-1.5 rounded-lg border border-line bg-sunken/40 p-4"
                        >
                          <div className="flex items-center justify-between text-ink-tertiary type-caption">
                            <span className="font-medium text-ink">
                              {reply.authorName} ({reply.authorRole})
                            </span>
                            <span className="type-mono-caption">
                              {formatNoteDate(reply.createdAt)}
                            </span>
                          </div>
                          <p className="type-body-s m-0 text-ink-secondary">{reply.body}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Reply Composer Panel */}
                  <div className="flex flex-col gap-4 rounded-xl border border-line-strong bg-card p-5 shadow-sm">
                    <div className="type-label-m font-semibold text-ink">Reply</div>

                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="reply-textarea" className="type-label-s text-ink-secondary">
                        Reply to {activeNote.clubName}
                      </label>
                      <textarea
                        id="reply-textarea"
                        rows={3}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder={`1 Oct is fine. I've moved the due date to 2 Oct; upload the extension when PVI sends it...`}
                        className="w-full rounded-lg border border-line bg-sunken p-3 type-body-s text-ink focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
                      />
                      <span className="type-caption text-ink-tertiary">
                        Sent as written; it also appears on the request page.
                      </span>
                    </div>

                    {/* Move Due Date Checkbox Option */}
                    <div className="flex flex-col gap-2 rounded-lg bg-sunken/60 p-3.5 border border-line">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={moveDueDate}
                          onChange={(e) => setMoveDueDate(e.target.checked)}
                          className="h-4 w-4 rounded border-line text-gold focus:ring-gold"
                        />
                        <span className="type-label-s text-ink font-medium">
                          Move the due date to 2 Oct 2026
                        </span>
                      </label>

                      {moveDueDate && (
                        <div className="mt-2 flex flex-col gap-2 pl-6">
                          <div className="flex items-center gap-2">
                            <span className="type-caption text-ink-secondary">New due date:</span>
                            <input
                              type="date"
                              value={newDueDate}
                              onChange={(e) => setNewDueDate(e.target.value)}
                              className="rounded border border-line bg-card px-2 py-1 type-mono-caption text-ink"
                            />
                          </div>
                          <div className="type-caption text-ink-secondary">
                            Reason shown to customer:
                          </div>
                          <input
                            type="text"
                            value={moveDueDateReason}
                            onChange={(e) => setMoveDueDateReason(e.target.value)}
                            className="rounded border border-line bg-card p-2 type-body-s text-ink"
                          />
                        </div>
                      )}
                    </div>

                    {/* Send Reply Button */}
                    <Button
                      variant="primary"
                      size="md"
                      trailingIcon="arrow-right"
                      disabled={!replyText.trim() || replyMutation.isPending}
                      onClick={handleSendReply}
                      block
                    >
                      {replyMutation.isPending ? 'Sending...' : 'Send reply'}
                    </Button>

                    <div className="type-caption text-center text-ink-tertiary">
                      Yến, logistics manager, can read every note and reply.
                    </div>
                  </div>
                </div>
              </Panel>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerNotesPage;
