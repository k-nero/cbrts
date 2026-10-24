import { useState } from 'react';
import { Flex } from 'antd';
import { useNavigate } from 'react-router-dom';

import { useGeneratedIncidentColumn } from './useGeneratedColumn';

import PageHeader from '@/components/PageHeader';
import Table from '@/components/table';
import { Tabs } from '@/components/ui';
import { useIncidentList } from '@/hooks/incident';
import type { IncidentStatus, IncidentSummary } from '@/interfaces';
import { IncidentStatusEnum } from '@/interfaces';

type View = IncidentStatus | 'ALL';

const TABS: { key: View; label: string }[] = [
  { key: IncidentStatusEnum.OPEN, label: 'Open' },
  { key: IncidentStatusEnum.DECIDED, label: 'Decided' },
  { key: IncidentStatusEnum.RESOLVED, label: 'Resolved' },
  { key: 'ALL', label: 'All' },
];

/** Incidents (Flow 5): what went wrong on the road, newest first; the logistics manager owns each one. */
export default function IncidentsPage() {
  const navigate = useNavigate();
  const [view, setView] = useState<View>(IncidentStatusEnum.OPEN);
  const crud = useIncidentList(view === 'ALL' ? undefined : view);
  const { listQuery, pageState, setPageState } = crud;
  const columns = useGeneratedIncidentColumn();
  const total = listQuery.data?.totalElements;

  return (
    <Flex vertical gap={28}>
      <PageHeader
        title="Incidents"
        summary="Emergencies reported from the cab, and what was decided for each."
      />
      <Flex vertical gap={16}>
        <Tabs
          label="Incident views"
          activeKey={view}
          onChange={(key) => {
            setView(key);
            setPageState((p) => ({ ...p, number: 0 }));
          }}
          items={TABS}
        />
        <Flex gap={8} align="center" style={{ minHeight: 32 }}>
          <span className="type-label-s text-ink">
            {total === undefined
              ? 'Incidents'
              : `${total} ${total === 1 ? 'incident' : 'incidents'}`}
          </span>
          <span className="type-body-s text-ink-3">Newest first</span>
        </Flex>
        {/* Loading is the table's own spinner; a failed load goes to the error boundary. */}
        <Table<IncidentSummary>
          id="incidents"
          rowKey="id"
          columns={columns}
          dataSource={listQuery.data?.content ?? []}
          loading={listQuery.isPending || listQuery.isFetching}
          onRefresh={() => void listQuery.refetch()}
          refreshing={listQuery.isFetching && !listQuery.isPending}
          onRow={(incident) => ({
            onClick: () => navigate(`/staff/incidents/${incident.id}`),
            className: 'cursor-pointer',
          })}
          pagination={{
            current: pageState.number + 1,
            pageSize: pageState.size,
            total: listQuery.data?.totalElements ?? 0,
            showTotal: (all, [from, to]) =>
              `${from}–${to} of ${all} ${all === 1 ? 'incident' : 'incidents'}`,
          }}
          locale={{ emptyText: 'No incidents in this view.' }}
          onChange={(pagination) =>
            setPageState((p) => ({
              ...p,
              number: (pagination.current ?? 1) - 1,
              size: pagination.pageSize ?? p.size,
            }))
          }
        />
      </Flex>
    </Flex>
  );
}
