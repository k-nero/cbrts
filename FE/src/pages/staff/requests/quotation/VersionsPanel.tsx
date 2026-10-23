import { Flex } from 'antd';
import type { FC } from 'react';

import { VersionChip } from './VersionChip';

import { Button, cx, Panel } from '@/components/ui';
import type { QuotationDraft } from '@/interfaces';
import { formatDate, money } from '@/lib/utils';

/** Every version of the quotation, newest first; Open shows one. */
export const VersionsPanel: FC<{
  quotation: QuotationDraft;
  onPick: (versionNo: number) => void;
}> = ({ quotation, onPick }) => (
  <Panel title="Versions">
    <Flex component="ul" vertical gap={8} className="list-none">
      {quotation.versions.map((v) => {
        const shown = v.versionNo === quotation.versionNo;
        return (
          <li
            key={v.versionNo}
            aria-current={shown ? 'true' : undefined}
            className={cx(
              'rounded-md border px-3 py-2',
              shown ? 'border-line-strong bg-sunken' : 'border-line',
            )}
          >
            <Flex vertical gap={4}>
              <Flex component="span" gap={12} align="center" justify="space-between">
                <Flex component="span" gap={12} align="center">
                  <span className="type-data text-ink">{`v${v.versionNo}`}</span>
                  <VersionChip status={v.status} />
                </Flex>
                {!shown && (
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`Open version ${v.versionNo}`}
                    onClick={() => onPick(v.versionNo)}
                  >
                    Open
                  </Button>
                )}
              </Flex>
              <span className="type-body-s text-ink-2">
                {[
                  v.total == null ? null : money(v.total, quotation.currency),
                  v.issuedAt ? `issued ${formatDate(v.issuedAt)}` : 'draft',
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
              {v.supersededReason && (
                <span className="type-body-s text-ink-3">{`Superseded. ${v.supersededReason}`}</span>
              )}
            </Flex>
          </li>
        );
      })}
    </Flex>
  </Panel>
);
