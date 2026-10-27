import type { FC } from 'react';
import { DatePicker, Flex } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';

type Props = { value: Dayjs; onChange: (value: Dayjs) => void; label?: string };

/** When the record happened, if not now: an AntD date-time picker that can't pick the future. */
export const RecordedAt: FC<Props> = ({ value, onChange, label = 'Recorded at' }) => (
  <Flex vertical gap={8}>
    <span className="type-label-m text-ink-2">{label}</span>
    <DatePicker
      showTime={{ format: 'HH:mm' }}
      format="D MMM YYYY, HH:mm"
      size="large"
      allowClear={false}
      value={value}
      disabledDate={(day) => day.isAfter(dayjs(), 'day')}
      onChange={(next) => next && onChange(next)}
      className="w-72"
    />
  </Flex>
);
