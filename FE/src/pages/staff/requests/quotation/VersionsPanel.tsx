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
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {quotation.versions.map((v) => {
        const shown = v.versionNo === quotation.versionNo;
        return (
          <li
            key={v.versionNo}
            aria-current={shown ? 'true' : undefined}
            className={cx(
              'flex flex-col gap-1 rounded-md border px-3 py-2',
              shown ? 'border-line-strong bg-sunken' : 'border-line',
            )}
          >
            <span className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-3">
                <span className="type-data text-ink">{`v${v.versionNo}`}</span>
                <VersionChip status={v.status} />
              </span>
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
            </span>
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
          </li>
        );
      })}
    </ul>
  </Panel>
);
