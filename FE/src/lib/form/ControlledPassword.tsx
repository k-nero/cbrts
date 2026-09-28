import type { ReactNode } from 'react';
import { type Control, Controller, type FieldPath, type FieldValues } from 'react-hook-form';
import { Form, type GetProps, Input } from 'antd';

type AntPasswordProps = GetProps<typeof Input.Password>;

interface ControlledPasswordProps<T extends FieldValues> extends Omit<
    AntPasswordProps,
    'name' | 'value' | 'defaultValue' | 'onChange' | 'onBlur' | 'status'
> {
    control: Control<T>;
    name: FieldPath<T>;
    label?: ReactNode;
    required?: boolean;
}

/** antd `<Input.Password>` bound to a react-hook-form field. */
export function ControlledPassword<T extends FieldValues>({
    control,
    name,
    label,
    required,
    ...rest
}: ControlledPasswordProps<T>) {
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
                    <Input.Password
                        {...rest}
                        {...field}
                        value={field.value ?? ''}
                        status={fieldState.error ? 'error' : ''}
                    />
                </Form.Item>
            )}
        />
    );
}
