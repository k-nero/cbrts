import { CSSProperties, useId, useMemo } from 'react';
import { Controller, FieldPath, FieldValues, useFormContext } from 'react-hook-form';
import { QuestionCircleOutlined } from '@ant-design/icons';
import { Flex, Form, Tooltip } from 'antd';

import StarRed from '../StarRed';
import { FormItemProps } from '../types';

import { COLOR_DISABLED, COLOR_TEXT_PRIMARY } from '@/constant/color';

const { Item } = Form;

const FormItem = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  name,
  label,
  isRequired = false,
  direction = 'vertical',
  labelMinWidth,
  labelPosition = 'before',
  styleLabel = {},
  className,
  showLabel,
  disabled,
  instruction,
  questionMark,
  render,
  ...rest
}: FormItemProps<TFieldValues, TName>) => {
  const { control, getFieldState } = useFormContext<TFieldValues>();
  // The label names its input: each field puts `inputId` on its focusable element.
  const inputId = useId();
  const labelId = `${inputId}-label`;

  const shouldShowLabel = useMemo(
    () => (typeof showLabel === 'boolean' ? showLabel : !!label),
    [label, showLabel],
  );

  const getFlexDirection = () => {
    if (labelPosition === 'after')
      return direction === 'vertical' ? 'column-reverse' : 'row-reverse';
    return direction === 'vertical' ? 'column' : 'row';
  };

  const flexDirection = getFlexDirection();
  const alignItems =
    flexDirection === 'row' || flexDirection === 'row-reverse' ? 'center' : undefined;
  const justifyContent =
    flexDirection === 'row'
      ? 'flex-start'
      : flexDirection === 'row-reverse'
        ? 'flex-end'
        : undefined;

  const _styleLabel: CSSProperties = {
    lineHeight: '18px',
    visibility: label ? 'visible' : 'hidden',
    color: disabled ? COLOR_DISABLED : COLOR_TEXT_PRIMARY,
    ...styleLabel,
  };
  if (labelMinWidth) _styleLabel.minWidth = labelMinWidth;

  return (
    <Flex
      className={className}
      gap={8}
      style={{
        flexDirection,
        alignItems,
        justifyContent,
        width: '100%',
      }}
    >
      {!!shouldShowLabel && (
        <Flex gap={6} style={_styleLabel}>
          <label id={labelId} htmlFor={inputId}>
            {label ?? 'empty'}
            {isRequired && <StarRed />}
          </label>
          {questionMark && (
            <Tooltip title={questionMark}>
              <QuestionCircleOutlined />
            </Tooltip>
          )}
        </Flex>
      )}
      <Controller
        name={name}
        control={control}
        render={({ field: { ref: _ref, ...field }, formState }) => {
          const fieldState = getFieldState(name, formState);
          const errorMessage = fieldState.error?.message;
          const status = errorMessage ? ('error' as const) : undefined;

          return (
            <Item
              {...rest}
              style={{
                marginBottom: '0px',
                ...rest.style,
              }}
              label=""
              validateStatus={status}
              help={errorMessage}
            >
              {render({ field, formState, inputId, labelId })}
              {instruction && (
                <p style={{ fontSize: 12, color: 'var(--neutral-500)' }}>{instruction}</p>
              )}
            </Item>
          );
        }}
      />
    </Flex>
  );
};

export default FormItem;
