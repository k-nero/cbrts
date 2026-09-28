import { useCallback, useState } from 'react';
import type { TableColumnsType, TableColumnType, TableProps } from 'antd';
import type { SorterResult } from 'antd/es/table/interface';

import type { SortState } from '../../queries';

/**
 * Server-side sort helpers shared by `CrudTable` and standalone `<Table>` pages
 * that manage their own query state. Every field marked sortable must resolve
 * to a JPA property path on the resource's entity, or Spring 500s on the sort
 * param. Spring splits camelCase to walk associations, so a joined column works
 * when the split matches a real path (`buildingName` → `building.name`) but not
 * otherwise (`ownerName` fails — User has no `name`). Verify before adding.
 */

/**
 * Spring sort field for a sortable column: its string `dataIndex` (which AntD
 * also reports back as `sorter.field`), falling back to a string `key`.
 */
export function sortFieldOf<T>(col: TableColumnType<T>): string | undefined {
    if (typeof col.dataIndex === 'string') {
        return col.dataIndex;
    }
    return typeof col.key === 'string' ? col.key : undefined;
}

/** Translate an AntD sorter result into our `SortState`, or clear it. */
export function sortStateOf<T>(sorter: SorterResult<T> | undefined): SortState | undefined {
    if (sorter === undefined || sorter.order === undefined || sorter.order === null) {
        return undefined;
    }
    const field = typeof sorter.field === 'string' ? sorter.field : undefined;
    if (field === undefined) {
        return undefined;
    }
    return { field, order: sorter.order };
}

/** Serialize a sort state into Spring Data's `sort=field,dir` value. */
export function sortToParam(sort: SortState | undefined): string | undefined {
    if (sort === undefined) {
        return undefined;
    }
    return `${sort.field},${sort.order === 'ascend' ? 'asc' : 'desc'}`;
}

/**
 * Mark the opted-in columns sortable and reflect the active sort back onto them
 * (controlled) so the header arrow stays in sync. A column is sortable if its
 * `dataIndex`/`key` is listed in `sortableFields` or it sets `sorter: true`.
 */
export function decorateSortable<T>(
    columns: TableColumnsType<T>,
    sortableFields: string[] | undefined,
    sort: SortState | undefined
): TableColumnsType<T> {
    return columns.map((col) => {
        const c = col as TableColumnType<T>;
        const field = sortFieldOf(c);
        const sortable =
            field !== undefined && (c.sorter === true || (sortableFields ?? []).includes(field));
        if (!sortable) {
            return col;
        }
        return {
            ...c,
            sorter: true,
            sortOrder: sort !== undefined && sort.field === field ? sort.order : null,
        };
    });
}

export interface ServerSort<T> {
    /** `field,dir` for the list params, or undefined when unsorted. */
    sortParam: string | undefined;
    /** Spread onto `<Table onChange>`; ignores pagination-only changes. */
    onChange: NonNullable<TableProps<T>['onChange']>;
    /** Decorate columns: mark `sortableFields` sortable + reflect current order. */
    apply: (columns: TableColumnsType<T>, sortableFields: string[]) => TableColumnsType<T>;
}

/**
 * Standalone-table twin of the sort wiring baked into `CrudTable`. A page owns
 * its own paged `useQuery`; this hook owns the sort state, hands back the
 * `field,dir` param to thread into the query, and decorates the columns.
 *
 * `onSortChange` fires whenever the sort changes — pass it a page-reset so a new
 * sort jumps back to the first page (mirrors `CrudTable`).
 */
export function useServerSort<T>(onSortChange?: () => void): ServerSort<T> {
    const [sort, setSort] = useState<SortState>();

    const onChange = useCallback<NonNullable<TableProps<T>['onChange']>>(
        (_pagination, _filters, sorter, extra) => {
            if (extra.action !== 'sort') {
                return;
            }
            const single = Array.isArray(sorter) ? sorter[0] : sorter;
            setSort(sortStateOf(single));
            onSortChange?.();
        },
        [onSortChange]
    );

    const apply = useCallback(
        (columns: TableColumnsType<T>, sortableFields: string[]) =>
            decorateSortable(columns, sortableFields, sort),
        [sort]
    );

    return { sortParam: sortToParam(sort), onChange, apply };
}
