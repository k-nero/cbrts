import { FieldValues } from 'react-hook-form';
import { CalendarOutlined } from '@ant-design/icons';
import { DatePicker } from 'antd';
import dayjs from 'dayjs';

import { DatePickerFieldProps } from '../types';
import FormItem from './FormItem';
import ReadOnlyFieldDisplay from './ReadOnlyFieldDisplay';

import { DATE_FORMAT, SERVER_DATE_FORMAT } from '@/constant/date';

const DatePickerField = <TFieldValues extends FieldValues = FieldValues>({
  name,
  label,
  isRequired,
  direction,
  labelMinWidth,
  labelPosition,
  styleLabel,
  showLabel,
  disabled,
  instruction,
  questionMark,
  onChange: onCustomChange,
  onBlur: onCustomBlur,
  format = DATE_FORMAT,
  valueFormat = SERVER_DATE_FORMAT,
  readOnly,
  ...props
}: DatePickerFieldProps<TFieldValues>) => {
  return (
    <FormItem
      name={name}
      label={label}
      isRequired={isRequired}
      direction={direction}
      labelMinWidth={labelMinWidth}
      labelPosition={labelPosition}
      styleLabel={styleLabel}
      showLabel={showLabel}
      instruction={instruction}
      disabled={disabled}
      questionMark={questionMark}
      render={({ field: { onChange, onBlur, ...field }, inputId }) => {
        if (readOnly) {
          const getDisplayDate = () => {
            if (!field.value) return '';
            try {
              const date = dayjs(field.value);
              if (date.isValid()) {
                const formatString = typeof format === 'string' ? format : DATE_FORMAT;
                return date.format(formatString);
              }
              return field.value;
            } catch {
              return field.value;
            }
          };

          return (
            <ReadOnlyFieldDisplay
              value={getDisplayDate()}
              disabled={disabled}
              minHeight="40px"
              showTooltip={true}
            />
          );
        }
        return (
          <DatePicker
            id={inputId}
            {...props}
            {...field}
            value={field.value ? dayjs(field.value) : null}
            disabled={disabled}
            style={{ width: '100%', ...props.style }}
            onChange={(v, dateString) => {
              const formattedValue =
                v && dayjs.isDayjs(v) ? v.format(valueFormat ?? SERVER_DATE_FORMAT) : '';
              onChange(formattedValue);
              onCustomChange?.(v, dateString);
            }}
            format={format}
            suffixIcon={<CalendarOutlined />}
            onBlur={(...params) => {
              onBlur();
              onCustomBlur?.(...params);
            }}
          />
        );
      }}
    />
  );
};

export default DatePickerField;
