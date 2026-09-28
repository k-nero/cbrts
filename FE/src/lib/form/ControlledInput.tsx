import type { ReactNode } from 'react';
import { type Control, Controller, type FieldPath, type FieldValues } from 'react-hook-form';
import { Form, type GetProps, Input } from 'antd';

type AntInputProps = GetProps<typeof Input>;

interface ControlledInputProps<T extends FieldValues> extends Omit<
    AntInputProps,
    'name' | 'value' | 'defaultValue' | 'onChange' | 'onBlur' | 'status'
> {
    control: Control<T>;
    name: FieldPath<T>;
    label?: ReactNode;
    required?: boolean;
    /** Helper text rendered under the field by antd's `Form.Item`. */
    extra?: ReactNode;
    /** Tooltip icon shown next to the label by antd's `Form.Item`. */
    tooltip?: ReactNode;
}

/**
 * antd `<Input>` bound to a react-hook-form field. The surrounding `Form.Item`
 * is layout-only (no antd `name`) — label, error status and help text are
 * driven entirely off RHF's `fieldState`.
 */
export function ControlledInput<T extends FieldValues>({
    control,
    name,
    label,
    required,
    extra,
    tooltip,
    ...rest
}: ControlledInputProps<T>) {
    return (
        <Controller
            control={control}
            name={name}
            render={({ field, fieldState }) => (
                <Form.Item
                    label={label}
                    required={required ?? false}
                    extra={extra}
                    tooltip={tooltip}
                    validateStatus={fieldState.error ? 'error' : ''}
                    help={fieldState.error?.message}
                >
                    <Input
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
