import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { ClearanceGate, Icon, StageMark } from '@/components/ui';
import { useJobDetail } from '@/hooks/useJob';

import { LoadPlanTab } from './LoadPlanTab';
import { RouteTab } from './RouteTab';

const TABS = [
  { id: 'load-plan', label: 'Load plan', owner: 'Fleet & route coordinator' },
  { id: 'route', label: 'Route', owner: 'Fleet & route coordinator' },
  { id: 'clearance', label: 'Clearance', owner: 'Transport specialist' },
  { id: 'authorities', label: 'Authorities', owner: 'Transport specialist' },
  { id: 'trip', label: 'Trip', owner: 'Escort (driver / groom)' },
] as const;

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
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>('load-plan');

  const { data: job, isLoading, isError, error } = useJobDetail(id || '');

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <span className="type-body-s text-ink-3">Loading job details...</span>
      </div>
    );
  }

  if (isError || !job) {
    return (
      <div className="p-8">
        <div className="rounded-lg border border-bad/30 bg-bad-soft p-6">
          <p className="type-label-m text-bad">Failed to load job</p>
          <p className="type-body-s text-bad mt-1">
            {(error as Error)?.message || 'Job not found'}
          </p>
          <button
            type="button"
            onClick={() => navigate('/staff/jobs')}
            className="type-label-s text-bad underline mt-4 cursor-pointer block"
          >
            Back to jobs
          </button>
        </div>
      </div>
    );
  }

  const activeTabMeta = TABS.find((t) => t.id === activeTab) || TABS[0];
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
    <div className="flex flex-col gap-6 p-8">
      {/* Breadcrumb back */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => navigate('/staff/jobs')}
          className="flex items-center gap-1.5 text-ink-3 hover:text-ink cursor-pointer"
        >
          <Icon name="arrow-left" size={16} />
          <span className="type-label-s">Jobs</span>
        </button>
        <span className="text-ink-3">/</span>
        <span className="type-mono-label text-ink">{job.code}</span>
        <span className="text-ink-3">/</span>
        <span className="type-label-s text-ink-2">{activeTabMeta.label}</span>
      </div>

      {/* Header section (Figma jobHead) */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <h1 className="type-h1 text-ink">
                {job.originCity} → {job.destinationCity}
              </h1>
              <span className="type-mono-chip text-ink-3 bg-muted px-2 py-0.5 rounded-sm">
                {job.code}
              </span>
            </div>
            <p className="type-body-s text-ink-2">{metaText}</p>
          </div>

          <StageMark stage={STAGE_MAP[job.stage] || 'Approval'} />
        </div>

        {/* Clearance gate component */}
        <ClearanceGate state={job.clearanceGateState === 'Clear' ? 'clear' : 'locked'}>
          {job.clearanceGateSummary}
        </ClearanceGate>

        {/* Tabs with Owner tag */}
        <div className="flex items-center justify-between border-b border-line">
          <div className="flex items-center gap-8">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`focus-ring relative py-3 cursor-pointer text-sm font-medium transition-colors ${
                    isActive ? 'text-ink font-semibold' : 'text-ink-3 hover:text-ink-2'
                  }`}
                >
                  {tab.label}
                  {isActive && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-ink" />}
                </button>
              );
            })}
          </div>

          <div className="hidden sm:flex items-center gap-2 py-3">
            <span className="type-body-s text-ink-3">Owner:</span>
            <span className="type-label-s text-ink font-medium">{activeTabMeta.owner}</span>
          </div>
        </div>
      </div>

      {/* Tab Panels */}
      {activeTab === 'load-plan' && <LoadPlanTab job={job} />}
      {activeTab === 'route' && <RouteTab job={job} />}
      {activeTab === 'clearance' && (
        <div className="rounded-lg border border-line bg-card p-8 text-center">
          <h4 className="type-h4 text-ink">Clearance Checklist</h4>
          <p className="type-body-s text-ink-3 mt-1">
            Owned by transport specialist.{' '}
            {job.clearanceGateSummary || 'Clearance documents and permits'}.
          </p>
        </div>
      )}
      {activeTab === 'authorities' && (
        <div className="rounded-lg border border-line bg-card p-8 text-center">
          <h4 className="type-h4 text-ink">Authority Filings</h4>
          <p className="type-body-s text-ink-3 mt-1">
            Owned by transport specialist. Export health certificates and import permits.
          </p>
        </div>
      )}
      {activeTab === 'trip' && (
        <div className="rounded-lg border border-line bg-card p-8 text-center">
          <h4 className="type-h4 text-ink">Trip Journey Log</h4>
          <p className="type-body-s text-ink-3 mt-1">
            Recorded by escort crew. Checkpoints and condition checks from the cab tablet.
          </p>
        </div>
      )}
    </div>
  );
}
