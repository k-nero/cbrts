import type { ReactNode } from 'react';
import { type Control, Controller, type FieldPath, type FieldValues } from 'react-hook-form';
import { Form, type GetProps, Select } from 'antd';

type AntSelectProps = GetProps<typeof Select>;

interface ControlledSelectProps<T extends FieldValues> extends Omit<
    AntSelectProps,
    'value' | 'defaultValue' | 'onChange' | 'onBlur' | 'status'
> {
    control: Control<T>;
    name: FieldPath<T>;
    label?: ReactNode;
    required?: boolean;
}

/** antd `<Select>` bound to a react-hook-form field. */
export function ControlledSelect<T extends FieldValues>({
    control,
    name,
    label,
    required,
    ...rest
}: ControlledSelectProps<T>) {
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
                    <Select
                        {...rest}
                        value={field.value as AntSelectProps['value']}
                        onChange={(value) => field.onChange(value)}
                        onBlur={field.onBlur}
                        ref={field.ref}
                        status={fieldState.error ? 'error' : ''}
                    />
                </Form.Item>
            )}
        />
    );
}
