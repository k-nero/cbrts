import { type FC, useEffect } from 'react';
import { Alert, App, DatePicker, Form, Select } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import BaseModal from '@/components/modal/BaseModal';
import { Button } from '@/components/ui';
import { useCreateQuarantine, useQuarantineFacilities } from '@/hooks/clearance';
import { QUARANTINE_MIN_DAYS } from './labels';

type Values = { placeId: string; dates: [Dayjs, Dayjs] };

type Props = { open: boolean; jobId: string | null; onClose: () => void };

/** Schedule a pre-export quarantine period at an approved facility. */
const ScheduleQuarantineModal: FC<Props> = ({ open, jobId, onClose }) => (
  <BaseModal open={open} onCancel={onClose} title="Schedule Pre-Export Quarantine Period">
    {/* Mounted per open (BaseModal destroys hidden content), so the window starts from today. */}
    {open && <ScheduleQuarantineForm jobId={jobId} onClose={onClose} />}
  </BaseModal>
);

const ScheduleQuarantineForm: FC<{ jobId: string | null; onClose: () => void }> = ({
  jobId,
  onClose,
}) => {
  const { message } = App.useApp();
  const [form] = Form.useForm<Values>();
  const { data: stations = [], isLoading: loadingStations } = useQuarantineFacilities();
  const create = useCreateQuarantine(jobId);

  // Default to the first station, also when the list arrives after the dialog opened.
  const firstStationId = stations[0]?.id;
  useEffect(() => {
    if (firstStationId && !form.getFieldValue('placeId'))
      form.setFieldsValue({ placeId: firstStationId });
  }, [firstStationId, form]);

  const submit = async ({ placeId, dates: [start, end] }: Values) => {
    if (end.diff(start, 'day') < QUARANTINE_MIN_DAYS) {
      message.error(
        'Quarantine period must be at least 7 days according to veterinary regulations.',
      );
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
    } catch {
      // The API refusal shows through the mutation's error state.
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      className="mt-4"
      initialValues={{ dates: [dayjs(), dayjs().add(7, 'day')] }}
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
        label="Quarantine window (Minimum 7 days required)"
        rules={[{ required: true, message: 'Please select start and end dates' }]}
      >
        <DatePicker.RangePicker className="w-full" format="DD/MM/YYYY" />
      </Form.Item>

      <Alert
        type="info"
        showIcon
        message="Cambodia GDAHP Veterinary Regulation"
        description="All horses must complete at least 7 days of certified pre-export quarantine before crossing the Bavet border."
      />

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

export default ScheduleQuarantineModal;
