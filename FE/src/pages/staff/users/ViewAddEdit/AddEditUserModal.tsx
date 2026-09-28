import { FC, useEffect, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { App, Flex } from 'antd';
import { z } from 'zod';

import type { UserInput } from '@/apis/user';
import { CancelButton } from '@/components/form/CancelButton';
import FormWrapper, { useFormCustom } from '@/components/form/FormWrapper';
import { SubmitButton } from '@/components/form/SubmitButton';
import BaseModal from '@/components/modal/BaseModal';
import type { UseCrudResourceResult } from '@/hooks/crud';
import { useRoles } from '@/hooks/role';
import { ROLE_LABEL, type RoleName, type User } from '@/interfaces';

const roleOption = z.object({ label: z.string(), value: z.string() }, 'Pick a role.');

// Email and password are asked only when creating; an existing account keeps both.
const schema = z
  .object({
    isCreate: z.boolean(),
    email: z.string(),
    password: z.string(),
    firstName: z.string().min(1, 'Enter the given name.'),
    lastName: z.string().min(1, 'Enter the family name.'),
    phone: z.string(),
    role: roleOption.nullable(),
  })
  .superRefine((val, ctx) => {
    if (val.role === null)
      ctx.addIssue({ code: 'custom', path: ['role'], message: 'Pick a role.' });
    if (!val.isCreate) return;
    if (!z.email().safeParse(val.email).success) {
      ctx.addIssue({ code: 'custom', path: ['email'], message: 'Enter a valid email.' });
    }
    if (val.password.length < 12) {
      ctx.addIssue({
        code: 'custom',
        path: ['password'],
        message: `Yours has ${val.password.length}.`,
      });
    }
  });
type UserForm = z.infer<typeof schema>;

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
