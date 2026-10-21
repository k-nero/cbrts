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
            <span className="flex justify-end gap-1">
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
            </span>
          ),
        },
      ]
    : [];
