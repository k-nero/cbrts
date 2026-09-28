import type { ReactNode } from 'react';
import { type Control, Controller, type FieldPath, type FieldValues } from 'react-hook-form';
import { Form, type GetProps, Input } from 'antd';

type AntTextAreaProps = GetProps<typeof Input.TextArea>;

interface ControlledTextAreaProps<T extends FieldValues> extends Omit<
    AntTextAreaProps,
    'name' | 'value' | 'defaultValue' | 'onChange' | 'onBlur' | 'status'
> {
    control: Control<T>;
    name: FieldPath<T>;
    label?: ReactNode;
    required?: boolean;
}

/** antd `<Input.TextArea>` bound to a react-hook-form field. */
export function ControlledTextArea<T extends FieldValues>({
    control,
    name,
    label,
    required,
    ...rest
}: ControlledTextAreaProps<T>) {
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
                    <Input.TextArea
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
