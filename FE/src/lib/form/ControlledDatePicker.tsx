import type { ReactNode } from 'react';
import { type Control, Controller, type FieldPath, type FieldValues } from 'react-hook-form';
import { DatePicker, Form, type GetProps } from 'antd';

type AntDatePickerProps = GetProps<typeof DatePicker>;

interface ControlledDatePickerProps<T extends FieldValues> extends Omit<
    AntDatePickerProps,
    'value' | 'defaultValue' | 'onChange' | 'onBlur' | 'status'
> {
    control: Control<T>;
    name: FieldPath<T>;
    label?: ReactNode;
    required?: boolean;
}

/** antd `<DatePicker>` bound to a react-hook-form field holding a Dayjs value. */
export function ControlledDatePicker<T extends FieldValues>({
    control,
    name,
    label,
    required,
    style,
    ...rest
}: ControlledDatePickerProps<T>) {
    return (
        <Controller
            control={control}
            name={name}
            render={({ field, fieldState }) => (
                <Form.Item
                    label={label}
                    required={required ?? false}
                    validateStatus={fieldState.error ? 'error' : ''}
                    help={fieldState.error?.message}
                >
                    <DatePicker
                        {...rest}
                        value={field.value ?? null}
                        onChange={(date) => field.onChange(date)}
                        onBlur={field.onBlur}
                        ref={field.ref}
                        status={fieldState.error ? 'error' : ''}
                        style={{ width: '100%', ...style }}
                    />
                </Form.Item>
            )}
        />
    );
}
