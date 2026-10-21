import { FC, useEffect, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { App, Flex } from 'antd';

import type { UserInput } from '@/apis/user';
import { CancelButton } from '@/components/form/CancelButton';
import FormWrapper, { useFormCustom } from '@/components/form/FormWrapper';
import { SubmitButton } from '@/components/form/SubmitButton';
import BaseModal from '@/components/modal/BaseModal';
import type { UseCrudResourceResult } from '@/hooks/crud';
import { useRoles } from '@/hooks/role';
import { ROLE_LABEL, type RoleName, type User } from '@/interfaces';
import { schema, UserForm } from '@/pages/staff/users/ViewAddEdit/schema.ts';

const roleLabel = (name: string) => ROLE_LABEL[name as RoleName] ?? name;

type Props = {
  open: boolean;
  editing: User | null;
  crud: UseCrudResourceResult<User, UserInput>;
  onClose: () => void;
};

const AddEditUserModal: FC<Props> = ({ open, editing, crud, onClose }) => {
  const { message } = App.useApp();
  const roles = useRoles();
  const roleOptions = useMemo(
    () => (roles.data ?? []).map((r) => ({ label: roleLabel(r.name), value: r.name })),
    [roles.data],
  );

  const methods = useFormCustom<UserForm>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!open) return;
    const current = editing?.roles[0];
    methods.reset({
      isCreate: editing === null,
      email: '',
      password: '',
      firstName: editing?.firstName ?? '',
      lastName: editing?.lastName ?? '',
      phone: editing?.phone ?? '',
      role: current ? { label: roleLabel(current), value: current } : null,
    });
  }, [editing, methods, open]);

  const onSubmit = methods.handleSubmit(async (values) => {
    const input: UserInput = {
      firstName: values.firstName,
      lastName: values.lastName,
      phone: values.phone || null,
      roles: values.role ? [values.role.value] : [],
      ...(editing === null ? { email: values.email, password: values.password } : {}),
    };
    try {
      if (editing) await crud.updateMutation.mutateAsync({ id: editing.id, input });
      else await crud.createMutation.mutateAsync(input);
      message.success(editing ? 'Saved' : 'Account created');
      onClose();
    } catch {
      methods.setError('form_error', { message: 'Couldn’t save. Check the fields and try again.' });
    }
  });

  const isSubmitting = crud.createMutation.isPending || crud.updateMutation.isPending;

  return (
    <BaseModal open={open} onCancel={onClose} title={editing ? 'Edit account' : 'Invite staff'}>
      <FormWrapper
        methods={methods}
        isSubmitting={isSubmitting}
        mode={editing ? 'edit' : 'add'}
        onCancel={onClose}
        onFinish={onSubmit}
        layout="vertical"
      >
        {({ FormField }) => (
          <>
            {editing === null && (
              <>
                <FormField
                  name="email"
                  label="Email"
                  component="text"
                  componentProps={{ isRequired: true }}
                />
                <FormField
                  name="password"
                  label="Password"
                  component="password"
                  componentProps={{ isRequired: true, instruction: 'At least 12 characters.' }}
                />
              </>
            )}
            <Flex gap={16}>
              <FormField
                name="firstName"
                label="Given name"
                component="text"
                componentProps={{ isRequired: true }}
              />
              <FormField
                name="lastName"
                label="Family name"
                component="text"
                componentProps={{ isRequired: true }}
              />
            </Flex>
            <FormField name="phone" label="Phone" component="text" />
            <FormField
              name="role"
              label="Role"
              component="select"
              componentProps={{
                isRequired: true,
                options: roleOptions,
                isLoading: roles.isLoading,
              }}
            />
            <Flex justify="end" gap={8}>
              <CancelButton label="Cancel" />
              <SubmitButton type="primary" label="Save" />
            </Flex>
          </>
        )}
      </FormWrapper>
    </BaseModal>
  );
};

export default AddEditUserModal;
