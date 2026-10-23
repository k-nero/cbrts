import type { FC } from 'react';
import { Divider, Flex, message } from 'antd';
import dayjs from 'dayjs';

import { noteTime, TOPIC_LABEL } from './format';
import { ReplyComposer } from './ReplyComposer';

import { fileApi } from '@/apis/file';
import { Button, Callout, Chip, Icon, Panel } from '@/components/ui';
import { type CustomerNote, ROLE_LABEL, type RoleName } from '@/interfaces';
import { apiErrorMessage } from '@/lib/utils';

/**
 * The selected note (DESIGN.md, Notes on a request): the note quoted as written, its attachment,
 * the checklist item it concerns, the replies so far, and the reply composer.
 */
const NoteDetail: FC<{ note: CustomerNote }> = ({ note }) => {
  const itemDue = note.checklistItemDueDate
    ? ` · due ${dayjs(note.checklistItemDueDate).format('D MMM YYYY')}`
    : '';
  const replies = note.replies ?? [];
  const attachedFileId = note.attachedFileId;

  const [messageApi, messageHolder] = message.useMessage();
  const openAttachment = (fileId: string) => {
    fileApi.viewFile(fileId).catch((err: unknown) => {
      void messageApi.error(apiErrorMessage(err, 'The file could not be opened.'));
    });
  };

  return (
    <Panel
      title={
        <Flex vertical gap={4}>
          <h2 className="type-h4 m-0 text-ink">
            {`${note.clubName} · ${note.jobCode ?? note.requestCode ?? ''}`}
          </h2>
          <span className="type-caption text-ink-3">
            {`${noteTime(note.createdAt)} · from the request page`}
          </span>
        </Flex>
      }
      extra={<Chip tone="info">{TOPIC_LABEL[note.topic]}</Chip>}
    >
      {messageHolder}
      <Flex vertical gap={20}>
        <blockquote className="m-0 rounded-lg border border-line bg-sunken p-4">
          <p className="type-body-m m-0 font-serif italic text-ink">{`“${note.body}”`}</p>
        </blockquote>

        {attachedFileId && (
          <div className="rounded-lg border border-line bg-card px-4 py-3.5">
            <Flex align="center" gap={12}>
              <Icon name="file" size={18} className="text-ink-2" />
              <Flex vertical flex={1}>
                <span className="type-label-s text-ink">{note.attachedFileName}</span>
                {note.attachedFileSizeBytes != null && (
                  <span className="type-caption text-ink-3">
                    {`${(note.attachedFileSizeBytes / 1024).toFixed(1)} KB`}
                  </span>
                )}
              </Flex>
              <Button variant="ghost" size="sm" onClick={() => openAttachment(attachedFileId)}>
                Open
              </Button>
            </Flex>
          </div>
        )}

        {(note.checklistItemName || note.checklistItemWarning) && (
          <Callout
            tone="warn"
            title={
              note.checklistItemName
                ? `${note.checklistItemName}${itemDue}`
                : (note.checklistItemWarning ?? '')
            }
          >
            {note.checklistItemName ? note.checklistItemWarning : undefined}
          </Callout>
        )}

        {replies.length > 0 && (
          <Flex vertical gap={12}>
            <Divider className="m-0!" />
            <span className="type-label-m text-ink">Replies so far</span>
            {replies.map((r) => (
              <div key={r.id} className="ml-4 border-l-2 border-l-line pl-4">
                <Flex vertical gap={6}>
                  <Flex justify="space-between" gap={12}>
                    <span className="type-label-s text-ink">
                      {`${r.authorName}, ${ROLE_LABEL[r.authorRole as RoleName] ?? r.authorRole}`}
                    </span>
                    <span className="type-caption text-ink-3">{noteTime(r.createdAt)}</span>
                  </Flex>
                  <p className="type-body-s m-0 text-ink-2">{r.body}</p>
                </Flex>
              </div>
            ))}
          </Flex>
        )}

        <ReplyComposer key={note.id} note={note} />
      </Flex>
    </Panel>
  );
};

export default NoteDetail;
