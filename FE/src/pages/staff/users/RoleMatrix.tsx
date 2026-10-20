import type { FC } from 'react';
import type { TableColumnsType } from 'antd';

import Table from '@/components/table';
import { Icon, Panel } from '@/components/ui';
import { ROLE_LABEL, type RoleName, RoleNameEnum } from '@/interfaces';

/** The matrix's columns, in the order the Figma frame draws them, with the short codes it heads them with. */
const COLUMNS: { role: RoleName; code: string }[] = [
  { role: RoleNameEnum.CUSTOMER, code: 'CUST' },
  { role: RoleNameEnum.LOGISTICS_MANAGER, code: 'LM' },
  { role: RoleNameEnum.TRANSPORT_SPECIALIST, code: 'TS' },
  { role: RoleNameEnum.FLEET_COORDINATOR, code: 'FRC' },
  { role: RoleNameEnum.ESCORT, code: 'DRV' },
];

/**
 * What each role can do (Logistics manager · Users & roles, the Permissions panel). It restates the spec's
 * ownership rules, which the backend enforces; it isn't a setting, so it can't be edited here.
 */
type Capability = { label: string; roles: RoleName[] };

const CAPABILITIES: Capability[] = [
  { label: 'Create requests, upload documents', roles: [RoleNameEnum.CUSTOMER] },
  { label: 'Review and approve requests', roles: [RoleNameEnum.LOGISTICS_MANAGER] },
  { label: 'Build and issue quotations', roles: [RoleNameEnum.LOGISTICS_MANAGER] },
  { label: 'Approve or reject documents', roles: [RoleNameEnum.TRANSPORT_SPECIALIST] },
  { label: 'Edit regulation and rate catalogs', roles: [RoleNameEnum.TRANSPORT_SPECIALIST] },
  { label: 'Record authority submissions', roles: [RoleNameEnum.TRANSPORT_SPECIALIST] },
  { label: 'Confirm load plans', roles: [RoleNameEnum.FLEET_COORDINATOR] },
  {
    label: 'Record departure and trip status',
    roles: [RoleNameEnum.FLEET_COORDINATOR, RoleNameEnum.ESCORT],
  },
  { label: 'Log horse condition', roles: [RoleNameEnum.ESCORT] },
  { label: 'Reschedule or cancel a blocked job', roles: [RoleNameEnum.LOGISTICS_MANAGER] },
];

/** One column for the capability, then a tick or a dash per role, headed by its short code. */
const MATRIX_COLUMNS: TableColumnsType<Capability> = [
  {
    title: <span className="sr-only">Capability</span>,
    key: 'label',
    dataIndex: 'label',
    // The table truncates by default; the capabilities are short sentences that should wrap.
    ellipsis: false,
    render: (label: string) => <span className="type-body-s text-ink">{label}</span>,
  },
  ...COLUMNS.map(({ role, code }) => ({
    title: (
      <abbr title={ROLE_LABEL[role]} className="no-underline">
        {code}
      </abbr>
    ),
    key: role,
    width: 44,
    ellipsis: false,
    // No side padding, so the five ticks fit beside the capability in the 400 px panel.
    onHeaderCell: () => ({ style: { paddingInline: 0 } }),
    onCell: () => ({ style: { paddingInline: 0 } }),
    align: 'center' as const,
    render: (_: unknown, { roles }: Capability) =>
      roles.includes(role) ? (
        <Icon name="check" size={16} className="inline-block text-ok" title="Yes" />
      ) : (
        <span className="type-caption text-ink-3" aria-label="No">
          –
        </span>
      ),
  })),
];

/** The read-only role matrix beside the staff list. */
const RoleMatrix: FC<{ className?: string }> = ({ className }) => (
  <Panel className={className}>
    <div className="flex flex-col gap-0.5 pb-3">
      <h4 className="type-h4 m-0 text-ink">What each role can do</h4>
      <p className="type-body-s m-0 text-ink-3">
        Read-only. Roles follow the spec; change them in the spec first.
      </p>
    </div>

    <Table<Capability>
      id="role-matrix"
      rowKey="label"
      size="small"
      columns={MATRIX_COLUMNS}
      dataSource={CAPABILITIES}
      pagination={false}
      // A fixed reference grid: nothing to hide, resize or refresh.
      columnVisibility={false}
      resizableColumns={false}
    />

    <p className="type-body-s m-0 pt-3 text-ink-3">
      {COLUMNS.map(({ role, code }) => `${code} ${ROLE_LABEL[role].toLowerCase()}`).join(' · ')}.
      Only the logistics manager approves requests (BR-F1-04); only the transport specialist
      approves documents (BR-F2-04).
    </p>
  </Panel>
);

export default RoleMatrix;
