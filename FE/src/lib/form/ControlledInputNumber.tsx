import type { ReactNode } from 'react';
import { type Control, Controller, type FieldPath, type FieldValues } from 'react-hook-form';
import { Form, type GetProps, InputNumber } from 'antd';

type AntInputNumberProps = GetProps<typeof InputNumber>;

interface ControlledInputNumberProps<T extends FieldValues> extends Omit<
    AntInputNumberProps,
    'value' | 'defaultValue' | 'onChange' | 'onBlur' | 'status'
> {
    control: Control<T>;
    name: FieldPath<T>;
    label?: ReactNode;
    required?: boolean;
}

/** antd `<InputNumber>` bound to a react-hook-form field (full width by default). */
export function ControlledInputNumber<T extends FieldValues>({
    control,
    name,
    label,
    required,
    style,
    ...rest
}: ControlledInputNumberProps<T>) {
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
                    <InputNumber
                        {...rest}
                        value={field.value ?? null}
                        onChange={(value) => field.onChange(value)}
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
