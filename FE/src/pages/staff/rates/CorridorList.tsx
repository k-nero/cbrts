import type { FC } from 'react';
import { Flex } from 'antd';

import { Chip, Panel, cx } from '@/components/ui';
import type { RateCorridor } from '@/interfaces';
import { corridorShort } from '@/lib/utils';

type Props = {
  corridors: RateCorridor[];
  selectedId: string | null;
  versionNo: number | null;
  onSelect: (id: string) => void;
};

const GROUPS: { mode: RateCorridor['mode']; label: string; tag: string }[] = [
  { mode: 'AIR', label: 'Air', tag: 'AIR' },
  { mode: 'ROAD', label: 'Road', tag: 'RD' },
];

/** The corridors we run, grouped by mode, each with the rates it still lacks (DESIGN.md, Rate catalog). */
export const CorridorList: FC<Props> = ({ corridors, selectedId, versionNo, onSelect }) => (
  <Panel title="Corridors" flush>
    {corridors.length === 0 && (
      <p className="type-body-s m-0 px-6 py-3 text-ink-2">
        No corridors in the catalog yet. Corridors come from the route catalog.
      </p>
    )}
    {GROUPS.map((group) => {
      const rows = corridors.filter((c) => c.mode === group.mode);
      if (rows.length === 0) return null;
      return (
        <div key={group.mode} className="border-t border-line py-2 first:border-t-0">
          <Flex vertical>
            <span className="type-body-s px-6 py-1 text-ink-3">{group.label}</span>
            {rows.map((c) => {
              const selected = c.id === selectedId;
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-current={selected || undefined}
                  onClick={() => onSelect(c.id)}
                  className={cx(
                    'flex w-full cursor-pointer items-center gap-3 border-0 px-6 py-2 text-left',
                    selected ? 'bg-muted' : 'bg-transparent hover:bg-muted',
                  )}
                >
                  <span className="type-mono-label w-9 shrink-0 text-ink-3">{group.tag}</span>
                  <span className="type-data min-w-0 flex-1 truncate text-ink">
                    {corridorShort(c.code)}
                  </span>
                  {c.missingCount > 0 ? (
                    <Chip tone="bad">{`${c.missingCount} missing`}</Chip>
                  ) : (
                    versionNo != null && (
                      <span className="type-caption text-ink-3">{`v${versionNo}`}</span>
                    )
                  )}
                </button>
              );
            })}
          </Flex>
        </div>
      );
    })}
  </Panel>
);
