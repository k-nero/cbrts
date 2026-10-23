import { Flex } from 'antd';

import { Button } from '@/components/ui';
import { rowActionLabels } from '@/lib/utils';

/** Row actions shown only while a draft is open. */
export type RowActions<T> = { onEdit: (row: T) => void; onRemove: (row: T) => void } | null;

export const actionsColumn = <T extends object>(
  actions: RowActions<T>,
  label: (row: T) => string,
) =>
  actions
    ? [
        {
          key: 'actions',
          width: 150,
          align: 'right' as const,
          render: (_: unknown, row: T) => (
            <Flex component="span" justify="end" gap={4}>
              <Button
                size="sm"
                variant="ghost"
                aria-label={rowActionLabels(label(row)).edit}
                onClick={() => actions.onEdit(row)}
              >
                Edit
              </Button>
              <Button
                size="sm"
                variant="ghost"
                aria-label={rowActionLabels(label(row)).remove}
                onClick={() => actions.onRemove(row)}
              >
                Remove
              </Button>
            </Flex>
          ),
        },
      ]
    : [];
