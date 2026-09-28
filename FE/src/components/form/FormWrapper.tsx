import { createContext, use, useEffect, useId, useMemo, useRef } from 'react';
import { FieldValues, FormProvider, useForm, UseFormProps, useFormState } from 'react-hook-form';
import { Alert, Flex, Form } from 'antd';

import FormField from './FormField';
import { FormContextType, FormFieldProps, FormWrapperProps } from './types';

import { useLayoutStore } from '@/stores/layout';

export const FormContext = createContext<FormContextType>({} as FormContextType);

export const useFormWrapperCtx = <T extends FieldValues = any>() =>
  use<FormContextType<T>>(FormContext);

export const useFormCustom = <T extends FieldValues, TContext = any, TTransformedValues = T>(
  params: UseFormProps<T, TContext, TTransformedValues>,
) => {
  return useForm<T & { form_error?: unknown }, TContext, TTransformedValues>(params);
};

const FormFieldWithType = <T extends FieldValues>(props: FormFieldProps<T>) => {
  return <FormField<T> {...props} />;
};

// Create static context value to prevent re-renders
const staticContextValue = {
  FormField: FormFieldWithType,
};

const FormWrapper = <T extends FieldValues, V>({
  children,
  methods,
  isSubmitting = false,
  mode,
  onCancel,
  force = false,
  ...props
}: FormWrapperProps<T, V>) => {
  const id = useId();
  const { setNavigateItem, removeNavigateItem } = useLayoutStore();
  const { isDirty, isSubmitted, isSubmitSuccessful } = useFormState<T>({
    control: methods.control,
  });

  const value = useMemo(
    () => ({
      ...staticContextValue,
      isSubmitting,
      mode,
      onCancel,
    }),
    [isSubmitting, mode, onCancel],
  );

  const error = methods.formState.errors['form_error']?.message as string;
  const formValues = methods.watch();
  const previousValuesRef = useRef(formValues);

  // Clear form_error when any field changes
  useEffect(() => {
    if (error) {
      const hasChanged = JSON.stringify(previousValuesRef.current) !== JSON.stringify(formValues);
      if (hasChanged) {
        methods.clearErrors('form_error' as never);
        previousValuesRef.current = formValues;
      }
    } else {
      previousValuesRef.current = formValues;
    }
  }, [formValues, error, methods]);

  // Handle navigation blocking
  useEffect(() => {
    if (force) return;

    const shouldNavigate = isSubmitted ? !isDirty || isSubmitSuccessful : !isDirty;
    setNavigateItem({ id, shouldNavigate });
  }, [force, id, isDirty, isSubmitSuccessful, isSubmitted, setNavigateItem]);

  // Cleanup navigation item on unmount
  useEffect(() => {
    return () => removeNavigateItem(id);
  }, [removeNavigateItem, id]);

  // Handle browser refresh/close warning
  useEffect(() => {
    if (force) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const hasUnsavedChanges = isDirty && (!isSubmitted || !isSubmitSuccessful);
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = true;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [force, isDirty, isSubmitted, isSubmitSuccessful]);

  return (
    <FormProvider {...methods}>
      <FormContext.Provider value={value}>
        <Form key={id} {...props}>
          <Flex vertical gap={16}>
            {error && <Alert title={error} type="error" />}
            {typeof children === 'function' ? children(value) : children}
          </Flex>
        </Form>
      </FormContext.Provider>
    </FormProvider>
  );
};

export default FormWrapper;
