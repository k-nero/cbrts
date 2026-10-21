import { type FC, useEffect } from 'react';
import { App, DatePicker, Form, Select } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { Button, Callout } from '@/components/ui';
import { useCreateQuarantine, useQuarantineFacilities } from '@/hooks/clearance';
import { apiErrorMessage } from '@/lib/utils';
import { quarantineRule } from './labels';
import type { Props } from './ScheduleQuarantineModal';

type Values = { placeId: string; dates: [Dayjs, Dayjs] };

export const ScheduleQuarantineForm: FC<Omit<Props, 'open'>> = ({
  jobId,
  minDays,
  destination,
  onClose,
}) => {
  const { message } = App.useApp();
  const [form] = Form.useForm<Values>();
  const { data: stations = [], isLoading: loadingStations } = useQuarantineFacilities();
  const create = useCreateQuarantine(jobId);
  const rule = quarantineRule(minDays, destination);

  // Default to the first station, also when the list arrives after the dialog opened.
  const firstStationId = stations[0]?.id;
  useEffect(() => {
    if (firstStationId && !form.getFieldValue('placeId'))
      form.setFieldsValue({ placeId: firstStationId });
  }, [firstStationId, form]);

  const submit = async ({ placeId, dates: [start, end] }: Values) => {
    if (minDays !== undefined && end.diff(start, 'day') < minDays) {
      message.error(`The quarantine must last at least ${rule}.`);
      return;
    }
    try {
      await create.mutateAsync({
        placeId,
        startsOn: start.format('YYYY-MM-DD'),
        endsOn: end.format('YYYY-MM-DD'),
      });
      message.success('Quarantine period scheduled successfully.');
      onClose();
    } catch (err: unknown) {
      message.error(apiErrorMessage(err, 'The quarantine could not be scheduled.'));
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      className="mt-4"
      initialValues={{ dates: [dayjs(), dayjs().add(minDays ?? 7, 'day')] }}
      onFinish={submit}
    >
      <Form.Item
        name="placeId"
        label="Quarantine facility"
        rules={[{ required: true, message: 'Please select a facility' }]}
      >
        <Select
          loading={loadingStations}
          options={stations.map((s: { id: string; name: string; city?: string }) => ({
            label: `${s.name}${s.city ? ` (${s.city})` : ''}`,
            value: s.id,
          }))}
        />
      </Form.Item>

      <Form.Item
        name="dates"
        label={rule ? `Quarantine window (at least ${minDays} days)` : 'Quarantine window'}
        rules={[{ required: true, message: 'Please select start and end dates' }]}
      >
        <DatePicker.RangePicker className="w-full" format="DD/MM/YYYY" />
      </Form.Item>

      {rule ? (
        <Callout tone="info" title="Destination minimum">
          The job is pinned to {destination ?? 'its destination catalog'}, which requires at least{' '}
          {minDays} days of certified pre-export quarantine.
        </Callout>
      ) : (
        <Callout tone="warn" title="No destination catalog pinned yet">
          The minimum stay is checked once the job is approved and pinned to its destination&apos;s
          regulation catalog.
        </Callout>
      )}

      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" size="sm" type="submit" disabled={create.isPending}>
          Schedule quarantine
        </Button>
      </div>
    </Form>
  );
};
