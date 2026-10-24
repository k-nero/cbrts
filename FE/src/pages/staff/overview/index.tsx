import type { FC } from 'react';
import { Flex, Skeleton } from 'antd';

import { ClearanceAtRisk } from './ClearanceAtRisk';
import { OverviewTile } from './OverviewTile';
import { ReviewQueuePreview } from './ReviewQueuePreview';
import { RevenuePanel } from './RevenuePanel';

import PageHeader from '@/components/PageHeader';
import { useOverview } from '@/hooks/overview';
import { daysUntil, formatDate, formatDayTime, timeAgo } from '@/lib/utils';

/**
 * Overview (US-R-01): the logistics manager's start of the day. Five tiles count what needs attention, each naming
 * the case that matters most and opening the list behind it; below, the oldest requests waiting for review and the
 * blocked jobs leaving soonest.
 */
const OverviewPage: FC = () => {
  const { data: o } = useOverview();
  if (!o) return <Skeleton active paragraph={{ rows: 10 }} />;

  const expiresIn = o.nextToExpire ? daysUntil(o.nextToExpire.validUntil, o.asOf) : null;
  const oldest = o.reviewQueue[0];
  return (
    <Flex vertical gap={28}>
      <PageHeader
        title="Overview"
        summary={`What needs you on ${formatDate(o.asOf)}. Each figure opens the list behind it.`}
      />
      <div className="grid grid-cols-5 gap-4">
        <OverviewTile
          figure={o.awaitingReview}
          label="Awaiting review"
          tone="neutral"
          lead={
            oldest
              ? `${oldest.code} waiting ${timeAgo(oldest.waitingSince, o.asOf).replace(' ago', '')}`
              : 'Nothing waiting'
          }
          to="/staff/requests"
        />
        <OverviewTile
          figure={o.quotesOut}
          label="Quotes out"
          tone={expiresIn !== null && expiresIn <= 2 ? 'warn' : 'neutral'}
          lead={
            o.nextToExpire
              ? `${o.nextToExpire.quotationCode} expires ${formatDate(o.nextToExpire.validUntil)}`
              : 'None waiting for a customer'
          }
          to="/staff/requests?view=quotes"
        />
        <OverviewTile
          figure={o.jobsBlocked}
          label="Jobs blocked"
          tone={o.jobsBlocked > 0 ? 'bad' : 'neutral'}
          lead={
            o.clearanceAtRisk[0]
              ? `${o.clearanceAtRisk[0].code}: ${o.clearanceAtRisk[0].blockingReason ?? 'clearance pending'}`
              : 'Every dossier cleared'
          }
          to="/staff/jobs?filter=BLOCKED"
        />
        <OverviewTile
          figure={o.incidentsOpen}
          label={o.incidentsOpen === 1 ? 'Incident open' : 'Incidents open'}
          tone={o.incidentsOpen > 0 ? 'warn' : 'neutral'}
          lead={
            o.newestIncident
              ? `${o.newestIncident.kindLabel}, ${o.newestIncident.jobCode}`
              : 'None open'
          }
          to="/staff/incidents"
        />
        <OverviewTile
          figure={o.departingThisWeek}
          label="Departing this week"
          tone="neutral"
          lead={
            o.nextDeparture?.plannedDepartureAt
              ? `${o.nextDeparture.code} leaves ${formatDayTime(o.nextDeparture.plannedDepartureAt)}`
              : 'No departure in 7 days'
          }
          to="/staff/jobs?filter=THIS_WEEK"
        />
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_360px] items-start gap-6">
        <ReviewQueuePreview rows={o.reviewQueue} total={o.awaitingReview} asOf={o.asOf} />
        <ClearanceAtRisk jobs={o.clearanceAtRisk} total={o.jobsBlocked} />
      </div>
      <RevenuePanel />
    </Flex>
  );
};

export default OverviewPage;
