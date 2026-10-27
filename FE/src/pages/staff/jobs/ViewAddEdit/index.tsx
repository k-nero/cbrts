import { type ReactNode, useEffect, useMemo } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Flex, Skeleton, Tabs, type TabsProps } from 'antd';

import PageHeader from '@/components/PageHeader.tsx';
import { Callout, ClearanceGate, StageMark } from '@/components/ui';
import { JobTripContext, useJobDetail } from '@/hooks/useJob';
import type { JobDetail } from '@/interfaces';

import { AuthoritiesTab } from './AuthoritiesTab';
import { ClearanceTab } from './ClearanceTab';
import { TripTab } from './TripTab';

/**
 * A job's tabs, each with the role that owns it (DESIGN.md, job page): the Trip tab plans the trip
 * chosen on its journey rail (US-F3-21); Clearance and Authorities cover the whole job.
 */
const TABS: { key: string; label: string; owner: string; render: (job: JobDetail) => ReactNode }[] =
  [
    {
      key: 'trip',
      label: 'Trip',
      owner: 'Fleet & route coordinator',
      render: (job) => <TripTab job={job} />,
    },
    {
      key: 'clearance',
      label: 'Clearance',
      owner: 'Transport specialist',
      render: (job) => <ClearanceTab job={job} />,
    },
    {
      key: 'authorities',
      label: 'Authorities',
      owner: 'Transport specialist',
      render: (job) => <AuthoritiesTab job={job} />,
    },
  ];

/** Links from before the Trip tab (notifications, emails) open it on the view they named. */
const OLD_TABS: Record<string, 'load-plan' | 'route'> = {
  'load-plan': 'load-plan',
  route: 'route',
};

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
  // The trip of the job's journey the tabs plan (US-F3-16) lives in the URL too (?trip=…).
  const [searchParams] = useSearchParams();
  return (
    <JobTripContext value={searchParams.get('trip') ?? undefined}>
      <JobWorkspace />
    </JobTripContext>
  );
}

function JobWorkspace() {
  const { id } = useParams<{ id: string }>();
  // The open tab lives in the URL (?tab=route), so a refresh or a shared link opens the same tab.
  const [searchParams, setSearchParams] = useSearchParams();
  const asked = searchParams.get('tab');
  const oldView = asked ? OLD_TABS[asked] : undefined;
  useEffect(() => {
    if (!oldView) return;
    const trip = searchParams.get('trip');
    setSearchParams({ tab: 'trip', view: oldView, ...(trip ? { trip } : {}) }, { replace: true });
  }, [oldView, searchParams, setSearchParams]);
  const activeTab = TABS.find((tab) => tab.key === (oldView ? 'trip' : asked)) ?? TABS[0];

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

  const trailerCodes = job.loadPlan?.vehicles.map((v) => v.vehicleCode) ?? [];
  const trailerCode =
    trailerCodes.length === 0
      ? 'vehicle'
      : `${trailerCodes.length === 1 ? 'trailer' : 'trailers'} ${trailerCodes.join(', ')}`;
  const metaText = `${job.horses?.length || 0} horses · ${trailerCode} · departs ${departureDateStr}`;
  // The job keeps its own price and invoices; the trip's other jobs are one click away (US-F3-14).
  const othersOnTrip = (job.tripJobs?.length ?? 1) - 1;

  const tabsView = (
    <Tabs
      activeKey={activeTab.key}
      onChange={(key) => {
        // The chosen trip and view stay in the URL, so coming back to the Trip tab opens them again.
        const trip = searchParams.get('trip');
        const view = searchParams.get('view');
        setSearchParams(
          { tab: key, ...(trip ? { trip } : {}), ...(view ? { view } : {}) },
          { replace: true },
        );
      }}
      items={items}
      // Unmount a tab when it's left, as before, so its forms start fresh on return.
      destroyOnHidden
      tabBarExtraContent={
        <span className="hidden sm:block">
          <Flex component="span" gap={8} align="center">
            <span className="type-body-s text-ink-3">Owner:</span>
            <span className="type-label-s font-medium text-ink">{activeTab.owner}</span>
          </Flex>
        </span>
      }
    />
  );

  return (
    <div className="p-4">
      <Flex vertical gap={24}>
        {/* Header section (Figma jobHead) */}
        <Flex vertical gap={16}>
          <PageHeader
            title={`${job.originCity} → ${job.destinationCity}`}
            summary={
              <Flex wrap gap={12} align="center">
                <p className="type-chip text-ink-3 bg-muted px-2 py-0.5 rounded-sm">{job.code}</p>
                {job.tripCode && (
                  <p className="type-chip text-ink-3 bg-muted px-2 py-0.5 rounded-sm">
                    {job.tripCode}
                  </p>
                )}
                <p className="type-body-m text-ink-2">{metaText}</p>
                {othersOnTrip > 0 && (
                  <Link
                    to="?tab=trip&view=load-plan"
                    replace
                    className="type-body-m whitespace-nowrap text-ink! underline underline-offset-2"
                  >
                    Shared with {othersOnTrip} other {othersOnTrip === 1 ? 'job' : 'jobs'}
                  </Link>
                )}
              </Flex>
            }
            right={<StageMark stage={STAGE_MAP[job.stage] || 'Approval'} />}
          />

          {job.parts.length > 1 && !job.parts.some((part) => part.handsOn) && (
            <Callout tone="info" title={`${job.code} travels in ${job.parts.length} parts`}>
              {job.parts
                .map(
                  (part) =>
                    `${part.tripCode} (${part.status.toLowerCase().replace('_', ' ')}): ${[
                      ...part.horses,
                      ...part.leftInCare.map((h) => `${h} in care`),
                    ].join(', ')}`,
                )
                .join(' · ')}
              . The Trip tab plans {job.parts.find((p) => p.current)?.tripCode ?? job.tripCode}; the
              other part goes on as planned.
            </Callout>
          )}
          <ClearanceGate
            state={job.clearanceGateState === 'Clear' ? 'clear' : 'locked'}
          ></ClearanceGate>
        </Flex>

        {tabsView}
      </Flex>
    </div>
  );
}
