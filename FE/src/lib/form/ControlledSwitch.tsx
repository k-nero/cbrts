import type { ReactNode } from 'react';
import { type Control, Controller, type FieldPath, type FieldValues } from 'react-hook-form';
import { Form, type GetProps, Switch } from 'antd';

type AntSwitchProps = GetProps<typeof Switch>;

interface ControlledSwitchProps<T extends FieldValues> extends Omit<
    AntSwitchProps,
    'checked' | 'defaultChecked' | 'value' | 'onChange' | 'onBlur'
> {
    control: Control<T>;
    name: FieldPath<T>;
    label?: ReactNode;
    required?: boolean;
}

/** antd `<Switch>` bound to a react-hook-form boolean field. */
export function ControlledSwitch<T extends FieldValues>({
    control,
    name,
    label,
    required,
    ...rest
}: ControlledSwitchProps<T>) {
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
                    <Switch
                        {...rest}
                        checked={field.value ?? false}
                        onChange={(checked) => field.onChange(checked)}
                        ref={field.ref}
                    />
                </Form.Item>
            )}
        />
    );
}
