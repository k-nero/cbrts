import { type ReactNode, useMemo } from 'react';
import {
    Button,
    Input,
    message,
    Popconfirm,
    Space,
    Table,
    type TableColumnsType,
    type TableProps,
} from 'antd';

import { decorateSortable, sortStateOf } from '../lib/table/sort';
import type { UseCrudResourceResult } from '../queries';
import TablePanel from './TablePanel';

export interface CrudTableProps<T extends { id: string }, Input> {
    title?: string;
    columns: TableColumnsType<T>;
    crud: UseCrudResourceResult<T, Input>;
    searchPlaceholder?: string;
    enableSearch?: boolean;
    onCreate?: () => void;
    onEdit?: (row: T) => void;
    enableDelete?: boolean;
    extraActions?: ReactNode;
    rowActions?: (row: T) => ReactNode;
    onRow?: TableProps<T>['onRow'];
    /**
     * Columns to make sortable, by their `dataIndex`/`key`. Sorting is
     * server-side, so each entry must resolve to a JPA property path on the
     * resource's entity, or the request 500s. Spring splits camelCase to walk
     * associations, so a joined column works when the split matches a real path
     * (`buildingName` → `building.name`) but not otherwise (`ownerName` fails —
     * User has no `name`; `actorName` fails — audit stores a bare UUID).
     * Verify against the entity before adding. A column may also opt in
     * directly with `sorter: true`.
     */
    sortableFields?: string[];
}

/**
 * Generic paged-CRUD table driven entirely by a `useCrudResource` result.
 * The parent owns the create/edit drawer (passes an `onEdit` callback); we
 * own pagination, search, loading, error toast, and the delete confirm.
 */
export default function CrudTable<T extends { id: string }, Input>({
    title,
    columns,
    crud,
    searchPlaceholder = 'Search…',
    enableSearch = true,
    onCreate,
    onEdit,
    enableDelete = true,
    extraActions,
    rowActions,
    onRow,
    sortableFields,
}: CrudTableProps<T, Input>) {
    const { pageState, setPageState, setSearch, listQuery, deleteMutation } = crud;

    const allColumns = useMemo<TableColumnsType<T>>(() => {
        const out: TableColumnsType<T> = [...columns];
        const wantsActions = onEdit !== undefined || enableDelete || rowActions !== undefined;
        if (wantsActions) {
            out.push({
                title: 'Actions',
                key: '_actions',
                width: 220,
                render: (_: unknown, record: T) => (
                    <Space>
                        {rowActions !== undefined ? rowActions(record) : null}
                        {onEdit !== undefined ? (
                            <Button size="small" onClick={() => onEdit(record)}>
                                Edit
                            </Button>
                        ) : null}
                        {enableDelete ? (
                            <Popconfirm
                                title="Delete this record?"
                                onConfirm={async () => {
                                    try {
                                        await deleteMutation.mutateAsync(record.id);
                                        void message.success('Deleted');
                                    } catch (err) {
                                        const detail = extractMessage(err);
                                        void message.error(detail);
                                    }
                                }}
                            >
                                <Button size="small" danger loading={deleteMutation.isPending}>
                                    Delete
                                </Button>
                            </Popconfirm>
                        ) : null}
                    </Space>
                ),
            });
        }
        return out;
    }, [columns, onEdit, enableDelete, rowActions, deleteMutation]);

    // Make the opted-in columns sortable and reflect the active server-side
    // sort back onto them so the header arrow stays in sync (controlled).
    const displayColumns = useMemo<TableColumnsType<T>>(
        () => decorateSortable(allColumns, sortableFields, pageState.sort),
        [allColumns, pageState.sort, sortableFields]
    );

    const page = listQuery.data;

    return (
        <TablePanel
            title={title}
            count={page?.totalElements}
            actions={
                <Space wrap>
                    {enableSearch ? (
                        <Input.Search
                            allowClear
                            placeholder={searchPlaceholder}
                            onSearch={(value) => setSearch(value)}
                            style={{ width: 280 }}
                        />
                    ) : null}
                    {extraActions}
                    {onCreate !== undefined ? (
                        <Button type="primary" onClick={onCreate}>
                            New
                        </Button>
                    ) : null}
                </Space>
            }
        >
            {listQuery.isError ? (
                <div className="border-b border-[#EF6B6B61] bg-[#EF6B6B1F] px-4 py-2 text-sm text-[#EF6B6B]">
                    {extractMessage(listQuery.error)}
                </div>
            ) : null}
            <Table<T>
                rowKey="id"
                loading={listQuery.isLoading || listQuery.isFetching}
                columns={displayColumns}
                dataSource={page?.content ?? []}
                {...(onRow ? { onRow } : {})}
                onChange={(_pagination, _filters, sorter, extra) => {
                    if (extra.action !== 'sort') {
                        return;
                    }
                    const single = Array.isArray(sorter) ? sorter[0] : sorter;
                    const next = sortStateOf(single);
                    // A new sort resets to the first page so the top rows show.
                    setPageState((prev) => ({ ...prev, number: 0, sort: next }));
                }}
                pagination={{
                    current: pageState.number + 1,
                    pageSize: pageState.size,
                    total: page?.totalElements ?? 0,
                    showSizeChanger: true,
                    onChange: (p, size) =>
                        setPageState((prev) => ({ ...prev, number: p - 1, size })),
                }}
            />
        </TablePanel>
    );
}

function extractMessage(err: unknown): string {
    if (typeof err === 'object' && err !== null && 'response' in err) {
        const data = (err as { response?: { data?: { message?: unknown } } }).response?.data
            ?.message;
        if (typeof data === 'string' && data.length > 0) {
            return data;
        }
    }
    if (err instanceof Error && err.message.length > 0) {
        return err.message;
    }
    return 'Something went wrong';
}
