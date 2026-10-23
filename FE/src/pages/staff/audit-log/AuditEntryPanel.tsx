import type { FC } from 'react';
import { Flex } from 'antd';

import { changeRows, fromLabel, recordedLabel, roleLabel, stampLabel } from './format';
import { Row } from './Row';

import { Button, Icon, Panel } from '@/components/ui';
import type { AuditEntry } from '@/interfaces';
import { useCustomRouter } from '@/router/route.hook';

type Props = { entry: AuditEntry; onClose: () => void };

/**
 * One entry opened beside the table (DESIGN.md, Audit log): the action, the stamp, what changed
 * as before → after, the reason as written, the linked record, and the entry number.
 */
const AuditEntryPanel: FC<Props> = ({ entry, onClose }) => {
  const router = useCustomRouter();
  const changes = changeRows(entry);
  const recorded = recordedLabel(entry);
  const who = entry.actorId
    ? `${entry.actorLabel}, ${roleLabel(entry.actorRole).toLowerCase()}`
    : entry.actorLabel;

  return (
    <Panel
      className="w-100 shrink-0 self-start"
      title={<span className="type-label-m text-ink-2">Entry</span>}
      extra={
        <button
          type="button"
          aria-label="Close the entry"
          onClick={onClose}
          className="focus-ring cursor-pointer rounded-sm p-1 text-ink-3 hover:text-ink"
        >
          <Icon name="x" size={16} />
        </button>
      }
    >
      <Flex vertical gap={20}>
        <Flex vertical gap={6}>
          <h3 className="type-h4 m-0 text-ink">{entry.summary}</h3>
          <span className="type-caption text-ink-3">{stampLabel(entry.occurredAt)}</span>
          <span className="type-body-s text-ink-2">{who}</span>
        </Flex>

        {changes.length > 0 && (
          <Flex vertical>
            <span className="type-label-m pb-1.5 text-ink">What changed</span>
            {changes.map((c) => (
              <div key={c.label} className="border-t border-line py-2.5">
                <Flex vertical gap={4}>
                  <span className="type-body-s text-ink-2">{c.label}</span>
                  <Flex component="span" wrap align="center" gap={8}>
                    <span className="type-body-s text-ink-3 line-through">{c.before}</span>
                    <Icon name="arrow-right" size={14} className="text-ink-3" />
                    <span className="type-label-s text-ink">{c.after}</span>
                  </Flex>
                </Flex>
              </div>
            ))}
          </Flex>
        )}

        {entry.reason && (
          <Flex vertical gap={8}>
            <span className="type-label-m text-ink">Reason, as written</span>
            <blockquote className="type-body-s m-0 rounded-md bg-sunken px-3.5 py-3 text-ink">
              “{entry.reason}”
            </blockquote>
          </Flex>
        )}

        <Flex vertical gap={8}>
          {entry.entityCode && (
            <Row label="On">
              <span className="type-data text-ink">{entry.entityCode}</span>
            </Row>
          )}
          <Row label="Action">
            <span className="type-caption text-ink">{entry.action}</span>
          </Row>
          <Row label="From">
            <span className="type-label-s text-ink">
              {fromLabel(entry)}
              {recorded && <span className="type-body-s text-ink-3"> · {recorded}</span>}
            </span>
          </Row>
          <Row label="Entry">
            <span className="type-caption text-ink-2">{entry.id}</span>
          </Row>
        </Flex>

        {entry.jobId && (
          <div>
            <Button
              variant="ghost"
              size="sm"
              trailingIcon="arrow-right"
              onClick={() =>
                router.push(router.paths.get('job-detail', { pathParams: [entry.jobId!] }))
              }
            >
              Open {entry.entityCode}
            </Button>
          </div>
        )}

        <p className="type-body-s m-0 text-ink-3">
          This entry can’t be edited or deleted. A correction is a new entry that points back to it.
        </p>
      </Flex>
    </Panel>
  );
};

export default AuditEntryPanel;
