import { type FC, useEffect, useMemo, useState } from 'react';
import { App, Col, Flex, Row, Select } from 'antd';

import BaseModal from '@/components/modal/BaseModal';
import { Button, Callout } from '@/components/ui';
import { useAssignCrew, useCrewCandidates } from '@/hooks/useJob';
import type { JobDetail } from '@/interfaces';
import { apiErrorMessage } from '@/lib/utils';

interface Props {
  job: JobDetail;
  tripVehicleId?: string | null;
  open: boolean;
  onClose: () => void;
}

/**
 * Assign a driver and grooms to a trailer on the trip (US-F3-06).
 * Enforces: at least 1 driver, and grooms = ceil(horses / 3).
 */
export const AssignCrewModal: FC<Props> = ({ job, tripVehicleId, open, onClose }) => {
  const { message } = App.useApp();
  const assignMutation = useAssignCrew(job.id);
  const { data: candidates = [], isLoading } = useCrewCandidates();

  const trailers = job.loadPlan?.vehicles ?? [];

  const trailer = useMemo(() => {
    if (tripVehicleId) {
      return trailers.find((t) => t.tripVehicleId === tripVehicleId) ?? trailers[0];
    }
    return trailers[0];
  }, [trailers, tripVehicleId]);

  const targetVehicleId = trailer?.tripVehicleId;

  // Horses assigned to this trailer (via its stalls)
  const horseCount = useMemo(() => {
    if (!trailer) return job.horses.length;
    const occupied = trailer.stalls.filter((s) => Boolean(s.horse));
    return occupied.length > 0 ? occupied.length : job.horses.length;
  }, [trailer, job.horses.length]);

  const requiredGrooms = Math.max(1, Math.ceil(horseCount / 3));

  // Current assigned crew on this trailer
  const existingCrew = useMemo(() => {
    return job.crew.filter((c) => !targetVehicleId || c.tripVehicleId === targetVehicleId);
  }, [job.crew, targetVehicleId]);

  const [driverId, setDriverId] = useState<string | undefined>();
  const [groomIds, setGroomIds] = useState<string[]>([]);

  // Initialize or reset form when modal opens or trailer changes
  useEffect(() => {
    if (!open) return;
    const currentDriver = existingCrew.find((c) => c.crewRole === 'DRIVER');
    const currentGrooms = existingCrew
      .filter((c) => c.crewRole === 'GROOM' || c.crewRole === 'FLYING_GROOM')
      .map((c) => c.userId);

    setDriverId(currentDriver?.userId);
    setGroomIds(currentGrooms);
  }, [open, existingCrew]);

  // Filter candidates for driver: cannot be registered strictly as GROOM
  const driverOptions = useMemo(() => {
    return candidates
      .filter((c) => c.escortKind !== 'GROOM')
      .map((c) => ({
        value: c.userId,
        label: `${c.name}${c.staffCode ? ` (${c.staffCode})` : ''}${c.escortKind ? ` · ${c.escortKind}` : ''}`,
      }));
  }, [candidates]);

  // Filter candidates for grooms: cannot be registered strictly as DRIVER and not the selected driver
  const groomOptions = useMemo(() => {
    return candidates
      .filter((c) => c.escortKind !== 'DRIVER' && c.userId !== driverId)
      .map((c) => ({
        value: c.userId,
        label: `${c.name}${c.staffCode ? ` (${c.staffCode})` : ''}${c.escortKind ? ` · ${c.escortKind}` : ''}`,
      }));
  }, [candidates, driverId]);

  const handleSubmit = async () => {
    if (!driverId) {
      message.error('Please select a driver for this trailer.');
      return;
    }
    if (groomIds.length < requiredGrooms) {
      message.error(
        `At least ${requiredGrooms} groom(s) required for ${horseCount} horse${horseCount === 1 ? '' : 's'}.`,
      );
      return;
    }

    const crewPayload = [
      { userId: driverId, crewRole: 'DRIVER' },
      ...groomIds.map((id) => ({ userId: id, crewRole: 'GROOM' })),
    ];

    try {
      await assignMutation.mutateAsync({
        crew: crewPayload,
        tripVehicleId: targetVehicleId,
      });
      message.success('Crew assigned successfully.');
      onClose();
    } catch (err) {
      message.error(apiErrorMessage(err, 'Could not assign crew.'));
    }
  };

  const title = trailer?.vehicleCode
    ? `Assign crew · ${trailer.vehicleCode}`
    : 'Assign trailer crew';

  return (
    <BaseModal open={open} onCancel={onClose} title={title}>
      <Flex vertical gap={20} className="py-2">
        <p className="type-body-s m-0 text-ink-2">
          Assign a qualified driver and grooms for road transport.
        </p>

        <Callout tone="info" title="Crew requirements (US-F3-06)">
          1 driver is required per trailer. Grooms are required at 1 per 3 horses rounded up (
          {horseCount} horse{horseCount === 1 ? '' : 's'} on this trailer → minimum {requiredGrooms}{' '}
          groom{requiredGrooms === 1 ? '' : 's'}).
        </Callout>

        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Flex vertical gap={6}>
              <span className="type-body-s font-medium text-ink">
                Driver <span className="text-bad">*</span>
              </span>
              <Select
                className="w-full"
                placeholder={isLoading ? 'Loading candidates…' : 'Select a driver'}
                loading={isLoading}
                value={driverId}
                onChange={(val) => {
                  setDriverId(val);
                  setGroomIds((prev) => prev.filter((id) => id !== val));
                }}
                options={driverOptions}
                allowClear
              />
            </Flex>
          </Col>

          <Col span={24}>
            <Flex vertical gap={6}>
              <span className="type-body-s font-medium text-ink">
                Grooms <span className="text-bad">*</span> (Minimum: {requiredGrooms})
              </span>
              <Select
                mode="multiple"
                className="w-full"
                placeholder={isLoading ? 'Loading candidates…' : 'Select grooms'}
                loading={isLoading}
                value={groomIds}
                onChange={setGroomIds}
                options={groomOptions}
              />
            </Flex>
          </Col>
        </Row>

        <Flex gap={8} justify="end" className="mt-4">
          <Button variant="secondary" onClick={onClose} disabled={assignMutation.isPending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={assignMutation.isPending || !driverId}
          >
            {assignMutation.isPending ? 'Saving…' : 'Save crew'}
          </Button>
        </Flex>
      </Flex>
    </BaseModal>
  );
};
