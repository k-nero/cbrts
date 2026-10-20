import type { FC } from 'react';
import { App, DatePicker, Form, Input, Select } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import BaseModal from '@/components/modal/BaseModal';
import { Button } from '@/components/ui';
import { useUpdateSubmission } from '@/hooks/clearance';
import {
  type AuthoritySubmission,
  type SubmissionStatus,
  SubmissionStatusEnum,
} from '@/interfaces';

type Values = { status: SubmissionStatus; referenceNo?: string; expectedBy?: Dayjs };

type Props = {
  /** The filing being updated; the modal is open while it is set. */
  submission: AuthoritySubmission | null;
  jobId: string | null;
  onClose: () => void;
};

/** Record the authority's decision on a filing, or a rescheduled response date. */
const UpdateDecisionModal: FC<Props> = ({ submission, jobId, onClose }) => (
  <BaseModal
    open={submission !== null}
    onCancel={onClose}
    title={`Update Decision: ${submission?.authority?.name ?? 'Authority'}`}
  >
    {/* Mounted per open (BaseModal destroys hidden content), so the form starts from this filing. */}
    {submission && <UpdateDecisionForm submission={submission} jobId={jobId} onClose={onClose} />}
  </BaseModal>
);

const UpdateDecisionForm: FC<{
  submission: AuthoritySubmission;
  jobId: string | null;
  onClose: () => void;
}> = ({ submission, jobId, onClose }) => {
  const { message } = App.useApp();
  const [form] = Form.useForm<Values>();
  const update = useUpdateSubmission(jobId);

  const submit = async (values: Values) => {
    try {
      await update.mutateAsync({
        submissionId: submission.id,
        data: {
          status: values.status,
          referenceNo: values.referenceNo?.trim() || undefined,
          expectedBy: values.expectedBy ? values.expectedBy.format('YYYY-MM-DD') : undefined,
        },
      });
      message.success('Submission status updated successfully.');
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
      initialValues={{
        status: submission.status,
        referenceNo: submission.referenceNo,
        expectedBy: submission.expectedBy ? dayjs(submission.expectedBy) : undefined,
      }}
      onFinish={submit}
    >
      <Form.Item
        name="status"
        label="Authority decision / Status"
        rules={[{ required: true, message: 'Please select status' }]}
      >
        <Select
          options={[
            { label: 'Approved & Issued (ISSUED)', value: SubmissionStatusEnum.ISSUED },
            { label: 'With the authority (FILED)', value: SubmissionStatusEnum.FILED },
            {
              label: 'Additional information requested (ADDITIONAL_INFO)',
              value: SubmissionStatusEnum.ADDITIONAL_INFO,
            },
            { label: 'Refused / Rejected (REFUSED)', value: SubmissionStatusEnum.REFUSED },
          ]}
        />
      </Form.Item>

      <Form.Item name="referenceNo" label="Official permit / Decision reference number">
        <Input placeholder="Permit number or official dispatch reference" />
      </Form.Item>

      <Form.Item name="expectedBy" label="Revised response date (if rescheduled)">
        <DatePicker className="w-full" format="DD/MM/YYYY" />
      </Form.Item>

      <div className="flex justify-end gap-2">
        <Button variant="secondary" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" size="sm" type="submit" disabled={update.isPending}>
          Save decision
        </Button>
      </div>
    </Form>
  );
};

export default UpdateDecisionModal;
