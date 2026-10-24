import { Button, Flex, Input } from 'antd';
import { useSearchParams } from 'react-router-dom';

import JobList from './JobList';

import PageHeader from '@/components/PageHeader';
import { Tabs } from '@/components/ui';
import { useJobList } from '@/hooks/useJob';
import { type JobFilter, JobFilterEnum } from '@/interfaces';

const SUMMARY =
  'Approved transport jobs moving through clearance, load planning, routes and handover.';

const TABS: { key: JobFilter; label: string }[] = [
  { key: JobFilterEnum.ALL, label: 'All' },
  { key: JobFilterEnum.NEEDS_ME, label: 'Needs me' },
  { key: JobFilterEnum.BLOCKED, label: 'Blocked' },
  { key: JobFilterEnum.IN_TRANSIT, label: 'In transit' },
  { key: JobFilterEnum.THIS_WEEK, label: 'This week' },
  { key: JobFilterEnum.CLOSED, label: 'Closed' },
];

/** "Sorted by departure, earliest first" / "Sorted by job, A to Z". */
const sortNote = (field: string, order: 'ascend' | 'descend') =>
  field === 'plannedDepartureAt'
    ? `Sorted by departure, ${order === 'ascend' ? 'earliest' : 'latest'} first`
    : `Sorted by job, ${order === 'ascend' ? 'A to Z' : 'Z to A'}`;

/** Jobs (every staff role): the approved jobs, by tab, with the table kit Users & roles uses. */
export default function JobsPage() {
  // The tab is in the URL (?filter=BLOCKED), so the Overview's tiles open the list already filtered.
  const [params, setParams] = useSearchParams();
  const filter =
    TABS.find((t) => t.key === params.get('filter'))?.key ?? (JobFilterEnum.ALL as JobFilter);
  const setFilter = (key: JobFilter) => setParams(key === JobFilterEnum.ALL ? {} : { filter: key });
  const crud = useJobList(filter);
  const { listQuery, pageState, setPageState, search } = crud;
  const total = listQuery.data?.totalElements;
  const sort = pageState.sort;

  return (
    <Flex vertical gap={28}>
      <PageHeader title="Jobs" summary={SUMMARY} />

      <Flex vertical gap={16}>
        <Tabs
          label="Job views"
          activeKey={filter}
          onChange={(key) => {
            setFilter(key);
            setPageState((p) => ({ ...p, number: 0 }));
          }}
          items={TABS}
        />

        <Flex vertical gap={8}>
          <label htmlFor="jobs-search" className="type-label-s text-ink-2">
            Search
          </label>
          <Input.Search
            id="jobs-search"
            allowClear
            placeholder="Job code"
            style={{ width: 360 }}
            onSearch={crud.setSearch}
          />
        </Flex>

        <Flex gap={8} align="center" style={{ minHeight: 32 }}>
          <span className="type-label-s text-ink">
            {total === undefined ? 'Jobs' : `${total} ${total === 1 ? 'job' : 'jobs'}`}
          </span>
          <span className="type-body-s text-ink-3">
            {sort ? sortNote(sort.field, sort.order) : 'Order: by departure, earliest first'}
          </span>
          {sort && (
            <Button
              type="text"
              size="small"
              onClick={() => setPageState((p) => ({ ...p, number: 0, sort: undefined }))}
            >
              Reset order
            </Button>
          )}
        </Flex>

        {/* Loading is the table's own spinner; a failed load goes to the error boundary. */}
        <JobList crud={crud} searching={search.length > 0} />
      </Flex>
    </Flex>
  );
}
