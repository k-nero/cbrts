import { FC, MouseEventHandler, useMemo } from 'react';
import {
  DeleteOutlined,
  EditOutlined,
  MoreOutlined,
  PlusCircleOutlined,
  ZoomInOutlined,
} from '@ant-design/icons';
import { Button, ButtonProps, Dropdown, MenuProps } from 'antd';
import { useShallow } from 'zustand/react/shallow';

import { Permission } from '@/interfaces';
import { hasPermission } from '@/lib';
import { useAuthStore } from '@/stores/authStore';

type ActionItem = {
  onClick?: MouseEventHandler<HTMLElement>;
  icon?: React.ReactNode;
  text?: string;
  permission?: Permission;
};

type ActionType = 'view' | 'edit' | 'delete' | 'add';

export type TableActionDropdownProps = Partial<Record<ActionType, ActionItem>>;

const ActionButton: FC<ButtonProps> = (props) => {
  return (
    <Button type="link" {...props}>
      {props?.children}
    </Button>
  );
};

const TableActionDropdown: FC<TableActionDropdownProps> = ({
  add: {
    onClick: onClickAdd,
    icon: addIcon = <PlusCircleOutlined style={{ fontSize: 16 }} />,
    text: viewAdd,
    permission: pAdd,
  } = {},
  view: {
    onClick: onClickView,
    icon: viewIcon = <ZoomInOutlined style={{ fontSize: 16 }} />,
    text: viewText = 'details',
    permission: pView,
  } = {},
  edit: {
    onClick: onClickEdit,
    icon: editIcon = <EditOutlined style={{ fontSize: 20 }} />,
    text: viewEdit,
    permission: pEdit,
  } = {},
  delete: {
    onClick: onClickDelete,
    icon: deleteIcon = <DeleteOutlined style={{ fontSize: 16 }} />,
    text: viewDelete,
    permission: pDelete,
  } = {},
}) => {
  // CBRTS permissions are roles (interfaces/enums.ts, Permission).
  const permissions = useAuthStore(useShallow((state) => state.roles));

  const menuItems = useMemo<MenuProps['items']>(() => {
    const _result = [];

    if (onClickView && (!pView || (pView && hasPermission(permissions, pView)))) {
      _result.push({
        key: '1',
        label: (
          <ActionButton onClick={onClickView} icon={viewIcon}>
            {viewText}
          </ActionButton>
        ),
      });
    }

    if (onClickAdd && (!pAdd || (pAdd && hasPermission(permissions, pAdd)))) {
      _result.push({
        key: '2',
        label: (
          <ActionButton onClick={onClickAdd} icon={addIcon}>
            {viewAdd || 'Add'}
          </ActionButton>
        ),
      });
    }

    if (onClickEdit && (!pEdit || (pEdit && hasPermission(permissions, pEdit)))) {
      _result.push({
        key: '3',
        label: (
          <ActionButton onClick={onClickEdit} icon={editIcon}>
            {viewEdit || 'Edit'}
          </ActionButton>
        ),
      });
    }

    if (onClickDelete && (!pDelete || (pDelete && hasPermission(permissions, pDelete)))) {
      _result.push({
        key: '4',
        label: (
          <ActionButton onClick={onClickDelete} icon={deleteIcon}>
            {viewDelete || 'Delete'}
          </ActionButton>
        ),
      });
    }
    return _result;
  }, [
    addIcon,
    deleteIcon,
    editIcon,
    onClickAdd,
    onClickDelete,
    onClickEdit,
    onClickView,
    pAdd,
    pDelete,
    pEdit,
    pView,
    permissions,
    viewAdd,
    viewDelete,
    viewEdit,
    viewIcon,
    viewText,
  ]);

  return (menuItems ?? []).length > 0 ? (
    <Dropdown
      menu={{
        items: menuItems,
      }}
      onOpenChange={() => {}}
    >
      <MoreOutlined
        style={{
          fontSize: 24,
        }}
      />
    </Dropdown>
  ) : null;
};

export default TableActionDropdown;
