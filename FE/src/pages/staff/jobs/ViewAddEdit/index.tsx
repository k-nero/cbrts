import { type ReactNode, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Skeleton, Tabs, type TabsProps } from 'antd';

import PageHeader from '@/components/PageHeader.tsx';
import { ClearanceGate, StageMark } from '@/components/ui';
import { useJobDetail } from '@/hooks/useJob';
import type { JobDetail } from '@/interfaces';

import { AuthoritiesTab } from './AuthoritiesTab';
import { LoadPlanTab } from './LoadPlanTab';
import { RouteTab } from './RouteTab';

/** A job's tabs, in the order the job moves, each with the role that owns it (DESIGN.md, job page). */
const TABS: { key: string; label: string; owner: string; render: (job: JobDetail) => ReactNode }[] =
  [
    {
      key: 'load-plan',
      label: 'Load plan',
      owner: 'Fleet & route coordinator',
      render: (job) => <LoadPlanTab job={job} />,
    },
    {
      key: 'route',
      label: 'Route',
      owner: 'Fleet & route coordinator',
      render: (job) => <RouteTab job={job} />,
    },
    {
      key: 'clearance',
      label: 'Clearance',
      owner: 'Transport specialist',
      render: (job) => (
        <Placeholder title="Clearance Checklist">
          Owned by transport specialist.{' '}
          {job.clearanceGateSummary || 'Clearance documents and permits'}.
        </Placeholder>
      ),
    },
    {
      key: 'authorities',
      label: 'Authorities',
      owner: 'Transport specialist',
      render: (job) => <AuthoritiesTab job={job} />,
    },
    {
      key: 'trip',
      label: 'Trip',
      owner: 'Escort (driver / groom)',
      render: () => (
        <Placeholder title="Trip Journey Log">
          Recorded by escort crew. Checkpoints and condition checks from the cab tablet.
        </Placeholder>
      ),
    },
  ];

/** A tab whose content isn't built on this page yet. */
const Placeholder = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="rounded-lg border border-line bg-card p-8 text-center">
    <h4 className="type-h4 text-ink">{title}</h4>
    <p className="type-body-s mt-1 text-ink-3">{children}</p>
  </div>
);

const STAGE_MAP: Record<
  string,
  'Request' | 'Quotation' | 'Approval' | 'Documents' | 'Clearance' | 'Trip' | 'Handover'
> = {
  REQUEST: 'Request',
  QUOTATION: 'Quotation',
  APPROVAL: 'Approval',
  DOCUMENTS: 'Documents',
  CLEARANCE: 'Clearance',
  TRIP: 'Trip',
  HANDOVER: 'Handover',
  CLOSED: 'Handover',
};

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  // The open tab lives in the URL (?tab=route), so a refresh or a shared link opens the same tab.
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = TABS.find((tab) => tab.key === searchParams.get('tab')) ?? TABS[0];

  // A failed load (404 included) goes to the error boundary; until the job arrives, the page is a skeleton.
  const { data: job } = useJobDetail(id || '');

  const items = useMemo<TabsProps['items']>(
    () =>
      job ? TABS.map(({ key, label, render }) => ({ key, label, children: render(job) })) : [],
    [job],
  );

  if (!job) {
    return <Skeleton active paragraph={{ rows: 8 }} />;
  }

  const departureDateStr = job.plannedDepartureAt
    ? new Date(job.plannedDepartureAt).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Not scheduled';

  const trailerCode = job.loadPlan?.vehicleCode ? `trailer ${job.loadPlan.vehicleCode}` : 'vehicle';
  const metaText = `${job.horses?.length || 0} horses · ${trailerCode} · departs ${departureDateStr}`;

  return (
    <div className="flex flex-col gap-6 p-4">
      {/* Header section (Figma jobHead) */}
      <div className="flex flex-col gap-4">
        <PageHeader
          title={`${job.originCity} → ${job.destinationCity}`}
          summary={
            <div className="flex items-center gap-3">
              <p className="type-chip text-ink-3 bg-muted px-2 py-0.5 rounded-sm">{job.code}</p>
              <p className="type-body-m text-ink-2">{metaText}</p>
            </div>
          }
          right={<StageMark stage={STAGE_MAP[job.stage] || 'Approval'} />}
        />

        {/* Clearance gate component */}
        <ClearanceGate
          state={job.clearanceGateState === 'Clear' ? 'clear' : 'locked'}
        ></ClearanceGate>
      </div>

      <Tabs
        activeKey={activeTab.key}
        onChange={(key) => setSearchParams({ tab: key }, { replace: true })}
        items={items}
        // Unmount a tab when it's left, as before, so its forms start fresh on return.
        destroyOnHidden
        tabBarExtraContent={
          <span className="hidden items-center gap-2 sm:flex">
            <span className="type-body-s text-ink-3">Owner:</span>
            <span className="type-label-s font-medium text-ink">{activeTab.owner}</span>
          </span>
        }
      />
    </div>
  );
}
