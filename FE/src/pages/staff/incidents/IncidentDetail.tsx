import { Col, Flex, Row, Skeleton } from 'antd';
import { Link, useParams } from 'react-router-dom';

import { CloseIncident } from './CloseIncident';
import { IncidentDecided, IncidentDecision } from './IncidentDecision';
import { IncidentResolved } from './IncidentResolved';
import { INCIDENT_STATUS, openFor } from './incidentFormat';
import { IncidentOptions } from './IncidentOptions';

import PageHeader from '@/components/PageHeader';
import { HistoryPanel } from '@/components/request/HistoryPanel';
import { Chip, Panel } from '@/components/ui';
import { useIncident } from '@/hooks/incident';
import type { Incident } from '@/interfaces';
import { IncidentStatusEnum, RoleNameEnum } from '@/interfaces';
import { useAuthStore } from '@/stores/authStore';
import { formatTime } from '@/pages/trip/tripFormat';
import { Photo } from '@/pages/trip/Photo';

const sourceLabel: Record<Incident['source'], string> = {
  CAB: 'from the cab',
  CUSTOMER: 'by the customer',
  STAFF: 'by staff',
};

/** One fact of the incident: a label over its value. */
function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Flex vertical gap={2}>
      <span className="type-caption text-ink-3">{label}</span>
      <span className="type-body-m text-ink">{children}</span>
    </Flex>
  );
}

/**
 * An incident (Flow 5, DESIGN.md "Incident"): the report first, quoted as written with its time and author, then the
 * job it happened on; the right column holds how long it has been open and the people involved.
 */
export default function IncidentDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  // A failed load (404 included) goes to the error boundary; until it arrives, the page is a skeleton.
  const { data: incident } = useIncident(id);
  // Only the logistics manager decides (US-F5-03); the coordinator sees the proposal waiting.
  const isManager = (useAuthStore((state) => state.roles) as string[]).includes(
    RoleNameEnum.LOGISTICS_MANAGER,
  );
  if (!incident) return <Skeleton active paragraph={{ rows: 8 }} />;

  const status = INCIDENT_STATUS[incident.status];
  const decided = incident.status !== IncidentStatusEnum.OPEN && incident.decidedOptionId !== null;
  const proposed = incident.options.find((o) => o.id === incident.proposedOptionId);
  return (
    <Flex vertical gap={28}>
      <PageHeader
        title={`${incident.kindLabel} · ${incident.jobCode}`}
        summary={
          incident.status === IncidentStatusEnum.OPEN
            ? `Open for ${openFor(incident.openedAt)}, since ${formatTime(incident.openedAt)}`
            : incident.status === IncidentStatusEnum.RESOLVED && incident.resolvedAt
              ? `Opened ${formatTime(incident.openedAt)}, closed ${formatTime(incident.resolvedAt)}`
              : `Opened ${formatTime(incident.openedAt)}`
        }
        right={<Chip tone={status.tone}>{status.label}</Chip>}
      />
      <Row gutter={[24, 24]} align="top">
        <Col xs={24} lg={16}>
          <Flex vertical gap={24}>
            <Panel title="What was reported">
              <Flex vertical gap={16}>
                <blockquote className="type-body-l m-0 border-l-2 border-line-strong pl-4 text-ink">
                  {incident.summary}
                </blockquote>
                <p className="type-body-s m-0 text-ink-3">
                  {incident.reportedByName ?? 'Unknown'} {sourceLabel[incident.source]},{' '}
                  {formatTime(incident.openedAt)}
                </p>
                <Row gutter={[16, 16]}>
                  <Col xs={24} md={12}>
                    <Fact label="Where">{incident.location ?? 'Not given'}</Fact>
                  </Col>
                  <Col xs={24} md={12}>
                    <Fact label="Horse">{incident.horseName ?? 'Not about one horse'}</Fact>
                  </Col>
                </Row>
                {incident.photos.length > 0 && (
                  <Flex wrap gap={8}>
                    {incident.photos.map((photo) => (
                      <Photo key={photo.id} photo={photo} />
                    ))}
                  </Flex>
                )}
              </Flex>
            </Panel>
            {decided ? (
              <IncidentDecided incident={incident} />
            ) : (
              proposed && isManager && <IncidentDecision incident={incident} option={proposed} />
            )}
            {incident.status === IncidentStatusEnum.RESOLVED ? (
              <IncidentResolved incident={incident} />
            ) : (
              // A proposal waiting for a decision is decided or sent back before closing.
              isManager &&
              (incident.status === IncidentStatusEnum.DECIDED || !proposed) && (
                <CloseIncident incident={incident} />
              )
            )}
            <IncidentOptions incident={incident} />
          </Flex>
        </Col>
        <Col xs={24} lg={8}>
          <Flex vertical gap={24}>
            <Panel title="The job">
              <Flex vertical gap={12}>
                <Fact label="Job">
                  <Link
                    to={`/staff/jobs/${incident.jobId}?tab=trip`}
                    className="text-ink! underline"
                  >
                    {incident.jobCode}
                  </Link>
                  {incident.tripCode && (
                    <span className="type-body-s text-ink-3"> · {incident.tripCode}</span>
                  )}
                </Fact>
                <Fact label="Route">
                  {incident.origin ?? 'Origin'} → {incident.destination ?? 'Destination'}
                </Fact>
                {incident.etaAt && (
                  <Fact label="Arrival announced by the delay alert">
                    {formatTime(incident.etaAt)}
                  </Fact>
                )}
              </Flex>
            </Panel>
            <Panel title="People">
              <Flex vertical gap={12}>
                <Fact label="Owner · logistics manager">{incident.ownerName ?? 'Not set'}</Fact>
                <Fact label="Coordinator">{incident.coordinatorName ?? 'Not assigned'}</Fact>
                <Fact label="Reported by">{incident.reportedByName ?? 'Unknown'}</Fact>
              </Flex>
            </Panel>
            {incident.timeline.length > 0 && (
              <HistoryPanel title="Timeline" history={incident.timeline} />
            )}
          </Flex>
        </Col>
      </Row>
    </Flex>
  );
}
