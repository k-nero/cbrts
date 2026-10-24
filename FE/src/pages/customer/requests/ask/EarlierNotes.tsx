import type { FC } from 'react';
import { Flex } from 'antd';
import dayjs from 'dayjs';

import { Panel } from '@/components/ui';
import { type CustomerNote, ROLE_LABEL, type RoleName } from '@/interfaces';
import { TOPIC_LABEL } from '@/pages/staff/customer-notes/format';

/** "21 Sep · 14:02". */
const stamp = (iso: string) => dayjs(iso).format('D MMM · HH:mm');

/**
 * Earlier notes on this request (DESIGN.md, Notes on a request): every note stays on the request, each reply
 * indented under its note with a left rule. Never a free chat: only staff reply.
 */
export const EarlierNotes: FC<{ notes: CustomerNote[] }> = ({ notes }) => (
  <Panel title="Earlier notes on this request">
    {notes.length === 0 ? (
      <p className="type-body-s m-0 text-ink-3">
        Nothing asked yet. Your notes and the replies stay here.
      </p>
    ) : (
      <Flex vertical gap={12}>
        {notes.map((note) => (
          <Flex key={note.id} vertical gap={10} className="border-t border-line pt-3">
            <Flex vertical gap={4}>
              <span className="type-caption text-ink-3">
                {`${stamp(note.createdAt)} · You · ${TOPIC_LABEL[note.topic]}`}
              </span>
              <p className="type-body-s m-0 whitespace-pre-line text-ink">{note.body}</p>
              {note.attachedFileName && (
                <span className="type-caption text-ink-3">{`Attached: ${note.attachedFileName}`}</span>
              )}
            </Flex>
            {(note.replies ?? []).map((r) => (
              <Flex key={r.id} vertical gap={4} className="border-l border-line-strong pl-3.5">
                <span className="type-caption text-ink-3">
                  {`${stamp(r.createdAt)} · ${r.authorName}, ${(ROLE_LABEL[r.authorRole as RoleName] ?? r.authorRole).toLowerCase()}`}
                </span>
                <p className="type-body-s m-0 whitespace-pre-line text-ink-2">{r.body}</p>
              </Flex>
            ))}
            {note.status === 'OPEN' && (note.replies ?? []).length === 0 && (
              <span className="type-caption text-ink-3">
                {note.replyDueAt
                  ? `Waiting for a reply · by ${dayjs(note.replyDueAt).format('ddd D MMM')}`
                  : 'Waiting for a reply'}
              </span>
            )}
          </Flex>
        ))}
      </Flex>
    )}
  </Panel>
);
