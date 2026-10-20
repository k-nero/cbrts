import type { FC } from 'react';
import { App, DatePicker, Form, Input, Select } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import BaseModal from '@/components/modal/BaseModal';
import { Button } from '@/components/ui';
import { apiErrorMessage } from '@/lib/utils';
import { useAuthorities, useCreateSubmission } from '@/hooks/clearance';
import { type SubmissionKind, SubmissionKindEnum } from '@/interfaces';
import { AUTHORITY_KIND_LABELS, SUBMISSION_KIND_LABELS } from './labels';

type Values = {
  authorityId: string;
  kind: SubmissionKind;
  referenceNo?: string;
  expectedBy?: Dayjs;
};

type Props = { open: boolean; jobId: string | null; onClose: () => void };

/** Log a dossier filed with an authority, with the date its decision is due under the SLA. */
const RecordSubmissionModal: FC<Props> = ({ open, jobId, onClose }) => (
  <BaseModal open={open} onCancel={onClose} title="Record Authority Submission">
    {/* Mounted per open (BaseModal destroys hidden content), so the form starts from its defaults. */}
    {open && <RecordSubmissionForm jobId={jobId} onClose={onClose} />}
  </BaseModal>
);

const RecordSubmissionForm: FC<{ jobId: string | null; onClose: () => void }> = ({
  jobId,
  onClose,
}) => {
  const { message } = App.useApp();
  const [form] = Form.useForm<Values>();
  const { data: authorities = [] } = useAuthorities();
  const create = useCreateSubmission(jobId);

  const submit = async (values: Values) => {
    try {
      await create.mutateAsync({
        authorityId: values.authorityId,
        kind: values.kind,
        referenceNo: values.referenceNo?.trim() || undefined,
        expectedBy: values.expectedBy ? values.expectedBy.format('YYYY-MM-DD') : undefined,
      });
      message.success('Authority submission recorded successfully.');
      onClose();
    } catch (err: unknown) {
      message.error(apiErrorMessage(err, 'The change could not be saved.'));
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      className="mt-4"
      initialValues={{
        kind: SubmissionKindEnum.EXPORT_HEALTH_CERTS,
        expectedBy: dayjs().add(4, 'day'),
      }}
      onFinish={submit}
    >
      <Form.Item
        name="authorityId"
        label="Receiving authority"
        rules={[{ required: true, message: 'Please select an authority' }]}
      >
        <Select
          placeholder="Select authority (Customs, Veterinary, GDAHP...)"
          options={authorities.map((a) => ({
            label: `${a.name} (${a.countryCode} · ${AUTHORITY_KIND_LABELS[a.kind]}${a.slaDays ? ` · SLA ${a.slaDays} days` : ''})`,
            value: a.id,
          }))}
        />
      </Form.Item>

      <Form.Item
        name="kind"
        label="Dossier type"
        rules={[{ required: true, message: 'Please select a dossier type' }]}
      >
        <Select
          options={Object.entries(SUBMISSION_KIND_LABELS).map(([value, label]) => ({
            label,
            value,
          }))}
        />
      </Form.Item>

      <Form.Item
        name="referenceNo"
        label="Filing reference / Receipt number"
        help="e.g., RAHO6-EXP-2026-081 or HQ-MB-2026-18842"
      >
        <Input placeholder="Enter reference number issued by the authority" />
      </Form.Item>

      <Form.Item
        name="expectedBy"
        label="Expected decision date (SLA)"
        rules={[{ required: true, message: 'Please select expected date' }]}
      >
        <DatePicker className="w-full" format="DD/MM/YYYY" />
      </Form.Item>

      <div className="flex justify-end gap-2">
        <Button variant="secondary" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" size="sm" type="submit" disabled={create.isPending}>
          Record submission
        </Button>
      </div>
    </Form>
  );
};

export default RecordSubmissionModal;
