import { FieldPath, FieldValues } from 'react-hook-form';
import { GroupBase, Props as SelectProps } from 'react-select';
import { AsyncProps as AsyncSelectProps } from 'react-select/async';
import { AsyncCreatableProps as AsyncCreatableSelectProps } from 'react-select/async-creatable';
import { CreatableProps as CreatableSelectProps } from 'react-select/creatable';

import { CommonFormItemProps } from './FormItem.type';

export type SelectValueType = string | number | boolean | null;

export type SelectOption<
  T extends SelectValueType = SelectValueType,
  Extra extends Record<string, any> = {},
> = {
  readonly label: string;
  readonly value: T;
  isDisabled?: boolean;
} & Extra;

type BaseSelectFieldProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
  ComponentProps extends object,
  Extra extends object = {},
> = CommonFormItemProps &
  Omit<ComponentProps, 'name' | 'value'> &
  Extra & {
    name: TName;
    readOnly?: boolean;
  };

export type SelectFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  Option extends Record<string, SelectValueType> = any,
  IsMulti extends boolean = false | true,
  Group extends GroupBase<SelectOption<SelectValueType, Option>> = GroupBase<
    SelectOption<SelectValueType, Option>
  >,
> = BaseSelectFieldProps<
  TFieldValues,
  TName,
  Omit<SelectProps<SelectOption<SelectValueType, Option>, IsMulti, Group>, 'theme'>
>;

export type AsyncSelectFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  Option extends Record<string, SelectValueType> = any,
  IsMulti extends boolean = false | true,
  Group extends GroupBase<SelectOption<SelectValueType, Option>> = GroupBase<
    SelectOption<SelectValueType, Option>
  >,
> = BaseSelectFieldProps<
  TFieldValues,
  TName,
  Omit<AsyncSelectProps<SelectOption<SelectValueType, Option>, IsMulti, Group>, 'theme'>
>;

export type CreatableSelectFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  Option extends Record<string, SelectValueType> = any,
  IsMulti extends boolean = false | true,
  Group extends GroupBase<SelectOption<SelectValueType, Option>> = GroupBase<
    SelectOption<SelectValueType, Option>
  >,
> = BaseSelectFieldProps<
  TFieldValues,
  TName,
  Omit<
    CreatableSelectProps<SelectOption<SelectValueType, Option>, IsMulti, Group>,
    'theme' | 'onCreateOption'
  >
> & {
  asyncCreateOption?: (inputValue: string) => Promise<SelectOption<SelectValueType, Option>>;
};

export type AsyncCreatableSelectFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  Option extends Record<string, SelectValueType> = any,
  IsMulti extends boolean = false | true,
  Group extends GroupBase<SelectOption<SelectValueType, Option>> = GroupBase<
    SelectOption<SelectValueType, Option>
  >,
> = BaseSelectFieldProps<
  TFieldValues,
  TName,
  Omit<AsyncCreatableSelectProps<SelectOption<SelectValueType, Option>, IsMulti, Group>, 'theme'>
> & {
  asyncCreateOption?: (inputValue: string) => Promise<SelectOption<SelectValueType, Option>>;
};
