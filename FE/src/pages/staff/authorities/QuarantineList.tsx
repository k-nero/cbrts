import type { FC } from 'react';
import { App, Popconfirm, Spin } from 'antd';
import { ExperimentOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { Button, Chip, Panel } from '@/components/ui';
import { useCompleteQuarantine } from '@/hooks/clearance';
import type { QuarantinePeriod } from '@/interfaces';
import { QUARANTINE_MIN_DAYS } from './labels';

type Props = {
  jobId: string | null;
  quarantines: QuarantinePeriod[];
  loading: boolean;
  onSchedule: () => void;
};

/** The pre-export quarantine section: each period, its length against the minimum, and sign-off. */
const QuarantineList: FC<Props> = ({ jobId, quarantines, loading, onSchedule }) => {
  const { message } = App.useApp();
  const complete = useCompleteQuarantine(jobId);

  const confirmInspection = async (quarantineId: string) => {
    try {
      await complete.mutateAsync(quarantineId);
      message.success('Quarantine inspection confirmed. Clearance gate re-evaluated.');
    } catch {
      message.error('Failed to confirm quarantine completion.');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="type-h4 m-0 text-ink">Pre-export Quarantine & Veterinary Inspection</h2>
          <p className="type-body-s m-0 text-ink-2">
            Mandatory pre-export quarantine period recorded against the destination requirement
            (Cambodia requires at least 7 days before border crossing).
          </p>
        </div>
        <Button variant="secondary" size="sm" leadingIcon="plus" onClick={onSchedule}>
          Schedule quarantine
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center p-8">
          <Spin />
        </div>
      ) : quarantines.length === 0 ? (
        <Panel className="py-8 text-center">
          <ExperimentOutlined className="mb-2 text-3xl text-ink-3" />
          <p className="type-body-s mb-3 text-ink-2">
            No quarantine periods scheduled for this job.
          </p>
          <Button variant="secondary" size="sm" onClick={onSchedule}>
            Schedule quarantine now
          </Button>
        </Panel>
      ) : (
        <div className="flex flex-col gap-4">
          {quarantines.map((q) => {
            const start = dayjs(q.startsOn);
            const end = dayjs(q.endsOn);
            const durationDays = end.diff(start, 'day');
            const meetsMinimum = durationDays >= QUARANTINE_MIN_DAYS;

            return (
              <Panel
                key={q.id}
                title={
                  <div className="flex items-center gap-2">
                    <ExperimentOutlined className="text-primary" />
                    <span>{q.placeName || 'Animal Quarantine Facility'}</span>
                  </div>
                }
                extra={
                  <Chip tone={q.isCompleted ? 'ok' : meetsMinimum ? 'info' : 'warn'}>
                    {q.isCompleted
                      ? 'Inspection completed'
                      : meetsMinimum
                        ? 'In progress (Meets 7-day min)'
                        : 'Under minimum duration'}
                  </Chip>
                }
                footer={
                  <div className="flex items-center justify-between">
                    <span className="type-body-s text-ink-3">
                      Cambodia entry regulations require at least 7 days in an approved quarantine
                      facility.
                    </span>
                    {!q.isCompleted && (
                      <Popconfirm
                        title="Confirm quarantine completion?"
                        description="Has the station veterinarian inspected the horses and certified them fit for transit?"
                        onConfirm={() => confirmInspection(q.id)}
                        okText="Confirm inspection"
                        cancelText="Cancel"
                      >
                        <Button
                          variant="primary"
                          size="sm"
                          leadingIcon="check"
                          disabled={complete.isPending}
                        >
                          Confirm veterinary inspection
                        </Button>
                      </Popconfirm>
                    )}
                  </div>
                }
              >
                <div className="grid grid-cols-2 gap-4 py-2 sm:grid-cols-4">
                  <div>
                    <span className="type-mono-caption block text-ink-3">Scheduled period</span>
                    <span className="type-mono-data text-ink">
                      {start.format('DD MMM YYYY')} – {end.format('DD MMM YYYY')}
                    </span>
                  </div>
                  <div>
                    <span className="type-mono-caption block text-ink-3">Duration</span>
                    <span className="type-label-s text-ink">{durationDays} days</span>
                  </div>
                  <div>
                    <span className="type-mono-caption block text-ink-3">Regulatory minimum</span>
                    <span className="type-label-s text-ink">7 days (Cambodia GDAHP)</span>
                  </div>
                  <div>
                    <span className="type-mono-caption block text-ink-3">Station veterinarian</span>
                    <span className="type-body-s text-ink">
                      {q.completedAt ? (
                        <span className="font-medium text-ok">
                          Certified on {dayjs(q.completedAt).format('DD MMM YYYY HH:mm')}
                        </span>
                      ) : (
                        'Veterinary supervision in progress'
                      )}
                    </span>
                  </div>
                </div>
              </Panel>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default QuarantineList;
