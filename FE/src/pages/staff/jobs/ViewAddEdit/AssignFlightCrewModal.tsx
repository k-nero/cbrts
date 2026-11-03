import { type FC, useEffect, useMemo, useState } from 'react';
import { App, Flex, Select } from 'antd';

import { groomsRequired, horsesOnFlight } from './crew';

import BaseModal from '@/components/modal/BaseModal';
import { Button, Callout } from '@/components/ui';
import { useAssignCrew, useCrewCandidates } from '@/hooks/useJob';
import type { JobDetail } from '@/interfaces';
import { apiErrorMessage } from '@/lib/utils';

interface Props {
  job: JobDetail;
  open: boolean;
  onClose: () => void;
}

/**
 * Assign the trip's flight crew (US-F3-15): flying grooms, one per three horses on board, and the flight vet when the
 * flight needs one. The flight has no trailer, so this crew rides with the horses on the plane.
 */
export const AssignFlightCrewModal: FC<Props> = ({ job, open, onClose }) => {
  const { message } = App.useApp();
  const assignMutation = useAssignCrew(job.id);
  const { data: candidates = [], isLoading } = useCrewCandidates();

  const horseCount = horsesOnFlight(
    job.tripJobs.map((t) => t.horses),
    job.horses.length,
  );
  const requiredGrooms = groomsRequired(horseCount);

  const flightCrew = useMemo(() => job.crew.filter((c) => c.onFlight), [job.crew]);
  const [groomIds, setGroomIds] = useState<string[]>([]);
  const [vetId, setVetId] = useState<string | undefined>();

  useEffect(() => {
    if (!open) return;
    setGroomIds(flightCrew.filter((c) => c.crewRole === 'FLYING_GROOM').map((c) => c.userId));
    setVetId(flightCrew.find((c) => c.crewRole === 'VET')?.userId);
  }, [open, flightCrew]);

  const label = (c: (typeof candidates)[number]) =>
    `${c.name}${c.staffCode ? ` (${c.staffCode})` : ''}${c.escortKind ? ` · ${c.escortKind}` : ''}`;
  // A driver doesn't groom (the API refuses it); nobody holds two places on the flight.
  const groomOptions = candidates
    .filter((c) => c.escortKind !== 'DRIVER' && c.userId !== vetId)
    .map((c) => ({ value: c.userId, label: label(c) }));
  const vetOptions = candidates
    .filter((c) => !groomIds.includes(c.userId))
    .map((c) => ({ value: c.userId, label: label(c) }));

  const handleSubmit = async () => {
    if (groomIds.length < requiredGrooms) {
      message.error(
        `At least ${requiredGrooms} flying groom(s) required for ${horseCount} horse${horseCount === 1 ? '' : 's'}.`,
      );
      return;
    }
    const crew = [
      ...groomIds.map((userId) => ({ userId, crewRole: 'FLYING_GROOM' })),
      ...(vetId ? [{ userId: vetId, crewRole: 'VET' }] : []),
    ];
    try {
      await assignMutation.mutateAsync({ crew, flight: true });
      message.success('Flight crew assigned.');
      onClose();
    } catch (err) {
      message.error(apiErrorMessage(err, 'Could not assign the flight crew.'));
    }
  };

  return (
    <BaseModal open={open} onCancel={onClose} title="Assign flight crew">
      <Flex vertical gap={20} className="py-2">
        <Callout tone="info" title="Flight crew requirements (US-F3-15)">
          One flying groom per 3 horses on board, rounded up ({horseCount} horse
          {horseCount === 1 ? '' : 's'} → minimum {requiredGrooms}). The flight vet is needed when
          the flight's rules call for one; sign-off says so if it's missing.
        </Callout>

        <Flex vertical gap={6}>
          <span className="type-body-s font-medium text-ink">
            Flying grooms <span className="text-bad">*</span> (Minimum: {requiredGrooms})
          </span>
          <Select
            mode="multiple"
            className="w-full"
            placeholder={isLoading ? 'Loading candidates…' : 'Select flying grooms'}
            loading={isLoading}
            value={groomIds}
            onChange={setGroomIds}
            options={groomOptions}
          />
        </Flex>

        <Flex vertical gap={6}>
          <span className="type-body-s font-medium text-ink">Flight vet</span>
          <Select
            className="w-full"
            placeholder={isLoading ? 'Loading candidates…' : 'Select a flight vet'}
            loading={isLoading}
            value={vetId}
            onChange={setVetId}
            options={vetOptions}
            allowClear
          />
        </Flex>

        <Flex gap={8} justify="end" className="mt-4">
          <Button variant="secondary" onClick={onClose} disabled={assignMutation.isPending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={assignMutation.isPending || groomIds.length === 0}
          >
            {assignMutation.isPending ? 'Saving…' : 'Save flight crew'}
          </Button>
        </Flex>
      </Flex>
    </BaseModal>
  );
};
