import type { FC } from 'react';
import { App, DatePicker, Form, Input, Select } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { Button } from '@/components/ui';
import { apiErrorMessage } from '@/lib/utils';
import { useUpdateSubmission } from '@/hooks/clearance';
import type { AuthoritySubmission, SubmissionStatus } from '@/interfaces';
import { DECISION_OPTIONS } from './labels';

type Values = { status: SubmissionStatus; referenceNo?: string; expectedBy?: Dayjs };

export const UpdateDecisionForm: FC<{
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
        <Select options={DECISION_OPTIONS} />
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
