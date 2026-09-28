import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Drawer, Form, message, type TableColumnsType, Tag } from 'antd';
import dayjs from 'dayjs';
import { z } from 'zod';

import { rolesApi } from '../../api/roles';
import { type UserInput, usersApi } from '../../api/users';
import CrudTable from '../../components/CrudTable';
import PageTopBar from '../../layouts/PageTopBar';
import { ControlledInput, ControlledPassword, ControlledSelect, useZodForm } from '../../lib/form';
import { queryKeys, useCrudResource } from '../../queries';
import { ROLE_LABEL, type RoleName, type User } from '../../types';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// `isCreate` is a non-rendered flag that lets the resolver apply create-only rules
// (email, password and roles are required on create, absent on edit).
const userSchema = z
    .object({
        isCreate: z.boolean(),
        email: z.string().optional(),
        password: z.string().optional(),
        firstName: z.string().min(1, 'Required'),
        lastName: z.string().min(1, 'Required'),
        phone: z.string().nullish(),
        roles: z.array(z.string()).optional(),
    })
    .superRefine((val, ctx) => {
        if (!val.isCreate) {
            return;
        }
        if (val.email === undefined || !EMAIL_RE.test(val.email)) {
            ctx.addIssue({ code: 'custom', path: ['email'], message: 'Enter a valid email.' });
        }
        if (val.password === undefined || val.password.length < 12) {
            ctx.addIssue({
                code: 'custom',
                path: ['password'],
                message: 'At least 12 characters.',
            });
        }
        if (val.roles === undefined || val.roles.length === 0) {
            ctx.addIssue({ code: 'custom', path: ['roles'], message: 'Pick a role.' });
        }
    });

const EMPTY = {
    isCreate: true,
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: null,
    roles: [],
};
const roleLabel = (r: string) => ROLE_LABEL[r as RoleName] ?? r;

/** Users & roles (logistics manager). Sortable columns follow DESIGN.md, Tables. */
export default function UsersPage() {
    const crud = useCrudResource<User, UserInput>('admin-users', usersApi);
    const rolesQuery = useQuery({
        queryKey: queryKeys.roles(),
        queryFn: rolesApi.list,
        staleTime: 5 * 60_000,
    });
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [editing, setEditing] = useState<User | null>(null);
    const { control, handleSubmit, reset } = useZodForm(userSchema, { defaultValues: EMPTY });

    const openCreate = () => {
        setEditing(null);
        reset(EMPTY);
        setDrawerOpen(true);
    };
    const openEdit = (record: User) => {
        setEditing(record);
        reset({
            ...EMPTY,
            isCreate: false,
            firstName: record.firstName,
            lastName: record.lastName,
            phone: record.phone ?? null,
            roles: record.roles,
        });
        setDrawerOpen(true);
    };
    const onSubmit = handleSubmit(async (values) => {
        const input: UserInput = {
            firstName: values.firstName,
            lastName: values.lastName,
            ...(values.email ? { email: values.email } : {}),
            ...(values.password ? { password: values.password } : {}),
            ...(values.phone != null ? { phone: values.phone } : {}),
            ...(values.roles && values.roles.length > 0 ? { roles: values.roles } : {}),
        };
        try {
            if (editing !== null) {
                await crud.updateMutation.mutateAsync({ id: editing.id, input });
            } else {
                await crud.createMutation.mutateAsync(input);
            }
            void message.success(editing !== null ? 'Saved' : 'Account created');
            setDrawerOpen(false);
        } catch {
            void message.error('Couldn’t save. Check the fields and try again.');
        }
    });

    const columns: TableColumnsType<User> = [
        {
            title: 'Name',
            key: 'firstName',
            dataIndex: 'firstName',
            render: (_: unknown, r: User) => (
                <div className="flex flex-col">
                    <span className="font-medium text-ink">{`${r.lastName} ${r.firstName}`}</span>
                    <span className="font-mono text-[12px] text-ink-3">{r.email}</span>
                </div>
            ),
        },
        {
            title: 'Role',
            dataIndex: 'roles',
            render: (rs: string[] | undefined) => (
                <>
                    {(rs ?? []).map((r) => (
                        <Tag key={r}>{roleLabel(r)}</Tag>
                    ))}
                </>
            ),
        },
        {
            title: 'Created',
            dataIndex: 'createdAt',
            render: (v: string) =>
                v ? <span className="font-mono">{dayjs(v).format('D MMM YYYY')}</span> : '',
        },
    ];

    const roleOptions = (rolesQuery.data ?? []).map((r) => ({
        label: roleLabel(r.name),
        value: r.name,
    }));

    return (
        <>
            <PageTopBar breadcrumbs={[{ label: 'Users & roles' }]} />
            <div className="p-10">
                <CrudTable
                    title="Staff"
                    columns={columns}
                    sortableFields={['firstName', 'createdAt']}
                    crud={crud}
                    searchPlaceholder="Name or email"
                    onCreate={openCreate}
                    onEdit={openEdit}
                />
            </div>
            <Drawer
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                title={editing !== null ? 'Edit account' : 'Invite staff'}
                footer={
                    <div className="flex justify-end gap-2">
                        <Button onClick={() => setDrawerOpen(false)}>Cancel</Button>
                        <Button
                            type="primary"
                            loading={crud.createMutation.isPending || crud.updateMutation.isPending}
                            onClick={onSubmit}
                        >
                            Save
                        </Button>
                    </div>
                }
            >
                <Form layout="vertical" requiredMark={false} onSubmitCapture={onSubmit}>
                    {editing === null ? (
                        <>
                            <ControlledInput
                                control={control}
                                name="email"
                                label="Email"
                                required
                            />
                            <ControlledPassword
                                control={control}
                                name="password"
                                label="Password"
                                required
                            />
                        </>
                    ) : null}
                    <ControlledInput
                        control={control}
                        name="firstName"
                        label="Given name"
                        required
                    />
                    <ControlledInput
                        control={control}
                        name="lastName"
                        label="Family name"
                        required
                    />
                    <ControlledInput
                        control={control}
                        name="phone"
                        label="Phone"
                        className="font-mono"
                    />
                    <ControlledSelect
                        control={control}
                        name="roles"
                        label="Role"
                        required={editing === null}
                        mode="multiple"
                        options={roleOptions}
                    />
                </Form>
            </Drawer>
        </>
    );
}
