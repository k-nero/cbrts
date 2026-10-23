import { useMemo } from 'react';
import { App, Flex, TableColumnsType } from 'antd';
import dayjs from 'dayjs';

import { UserInput } from '@/apis/user.ts';
import TableActionDropdown from '@/components/TableActionDropdown.tsx';
import { Chip, type Tone } from '@/components/ui';
import { UseCrudResourceResult } from '@/hooks/crud.ts';
import {
  ROLE_LABEL,
  RoleName,
  RoleNameEnum,
  User,
  type UserStatus,
  UserStatusEnum,
} from '@/interfaces';

interface UseGeneratedUserColumnProps {
  crud: UseCrudResourceResult<User, UserInput>;
  onEdit: (user: User) => void;
}

const STATUS_CHIP: Record<UserStatus, { tone: Tone; label: string }> = {
  [UserStatusEnum.ACTIVE]: { tone: 'ok', label: 'Active' },
  [UserStatusEnum.INVITED]: { tone: 'warn', label: 'Invited' },
  [UserStatusEnum.LOCKED]: { tone: 'bad', label: 'Locked' },
  [UserStatusEnum.DISABLED]: { tone: 'neutral', label: 'Removed' },
};

/** "Vũ Hải Yến" → "VY": the family name's initial, then the given name's last word. */
const initials = (u: User) =>
  `${u.lastName?.[0] ?? ''}${u.firstName?.trim().split(/\s+/).at(-1)?.[0] ?? ''}`.toUpperCase();

/** "Today 09:12" for today, else "24 Sep"; a dash until the account has signed in. */
const lastActive = (iso?: string | null) => {
  if (!iso) return '—';
  const at = dayjs(iso);
  return at.isSame(dayjs(), 'day') ? `Today ${at.format('HH:mm')}` : at.format('D MMM');
};

/** Users & roles columns (DESIGN.md, Tables): Name, Role, Last active, Status, then the row actions. */
export const useGeneratedUserColumn = ({ crud, onEdit }: UseGeneratedUserColumnProps) => {
  const { modal } = App.useApp();
  return useMemo<TableColumnsType<User>>(
    () => [
      {
        title: 'Name',
        key: 'firstName',
        dataIndex: 'firstName',
        width: 300,
        sorter: true,
        render: (_, r) => (
          <Flex gap={10} align="center">
            <Flex
              component="span"
              align="center"
              justify="center"
              className="type-chip size-8 shrink-0 rounded-full bg-muted text-ink-2"
            >
              {initials(r)}
            </Flex>
            <Flex vertical className="min-w-0">
              <span className="font-medium text-ink">{`${r.lastName} ${r.firstName}`}</span>
              {/* Staff go by their code (EF-001); a customer has none, so their email stands in. */}
              <span className="type-caption text-ink-3">{r.staffCode ?? r.email}</span>
            </Flex>
          </Flex>
        ),
      },
      {
        title: 'Role',
        key: 'roles',
        width: 200,
        dataIndex: 'roles',
        render: (roles: string[]) => (
          <span className="type-body-s text-ink-2">
            {roles.map((r) => ROLE_LABEL[r as RoleName] ?? r).join(', ')}
          </span>
        ),
      },
      {
        title: 'Last active',
        key: 'lastActiveAt',
        dataIndex: 'lastActiveAt',
        width: 128,
        sorter: true,
        render: (v?: string | null) => (
          <span className="type-caption text-ink-2">{lastActive(v)}</span>
        ),
      },
      {
        title: 'Status',
        key: 'status',
        dataIndex: 'status',
        width: 112,
        render: (status?: UserStatus) => {
          const chip = status ? STATUS_CHIP[status] : undefined;
          return chip ? <Chip tone={chip.tone}>{chip.label}</Chip> : null;
        },
      },
      {
        key: 'actions',
        width: 56,
        render: (_, r) => (
          <TableActionDropdown
            edit={{ onClick: () => onEdit(r), permission: RoleNameEnum.LOGISTICS_MANAGER }}
            delete={{
              permission: RoleNameEnum.LOGISTICS_MANAGER,
              onClick: () =>
                modal.confirm({
                  title: `Remove ${r.lastName} ${r.firstName}?`,
                  content: 'They can no longer sign in. Their past records stay.',
                  okText: 'Remove',
                  okButtonProps: { danger: true },
                  onOk: () => crud.deleteMutation.mutateAsync(r.id),
                }),
            }}
          />
        ),
      },
    ],
    [crud.deleteMutation, modal, onEdit],
  );
};
