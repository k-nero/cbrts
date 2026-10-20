import { FC } from 'react';
import { useNavigate } from 'react-router-dom';

import Table from '@/components/table';
import type { UseCrudResourceResult } from '@/hooks/crud.ts';
import { JobSummary } from '@/interfaces';
import { useGeneratedJobColumn } from '@/pages/staff/jobs/useGeneratedColumn.tsx';

type Props = {
  crud: UseCrudResourceResult<JobSummary, never>;
  /** "No jobs match the search" vs "no jobs in this view", for the empty table. */
  searching: boolean;
};

/** The Jobs table: a row opens the job; Job and Departure sort on the server. */
const JobList: FC<Props> = ({ crud, searching }) => {
  const navigate = useNavigate();
  const { listQuery, pageState, setPageState } = crud;
  const columns = useGeneratedJobColumn();
  return (
    <Table<JobSummary>
      id="jobs"
      rowKey="id"
      columns={columns}
      dataSource={listQuery.data?.content ?? []}
      // Spinner until the first page arrives, and while a new page or sort loads.
      loading={listQuery.isPending || listQuery.isFetching}
      onRefresh={() => void listQuery.refetch()}
      refreshing={listQuery.isFetching && !listQuery.isPending}
      onRow={(job) => ({
        onClick: () => navigate(`/staff/jobs/${job.id}`),
        className: 'cursor-pointer',
      })}
      // Controlled, so the header highlight follows the page's sort and "Reset order" clears it.
      sorter={
        pageState.sort ? { columnKey: pageState.sort.field, order: pageState.sort.order } : null
      }
      pagination={{
        current: pageState.number + 1,
        pageSize: pageState.size,
        total: listQuery.data?.totalElements ?? 0,
        showTotal: (total, [from, to]) =>
          `${from}–${to} of ${total} ${total === 1 ? 'job' : 'jobs'}`,
      }}
      locale={{
        emptyText: searching
          ? 'No jobs match the search. Clear it or try another code.'
          : 'No transport jobs in this view.',
      }}
      onChange={(pagination, _filters, sorter) => {
        const s = Array.isArray(sorter) ? sorter[0] : sorter;
        setPageState({
          number: (pagination.current ?? 1) - 1,
          size: pagination.pageSize ?? pageState.size,
          sort: s?.order ? { field: String(s.columnKey), order: s.order } : undefined,
        });
      }}
    />
  );
};

export default JobList;
