import { CSSProperties, FC, ReactNode } from 'react';
import { EditOutlined } from '@ant-design/icons';
import { Button, Flex, Spin, Tooltip, Typography } from 'antd';

import DeleteButton from './buttons/DeleteButton';

import { COLOR_BORDER } from '@/constant/color';

export type SectionMode = 'view' | 'edit' | 'add';

type Props = {
  children: ReactNode;
  mode?: SectionMode;
  loading?: boolean;
  sectionLabel?: string;
  border?: boolean;
  width?: string | number;
  styleLabel?: CSSProperties;
  onEdit?: () => void;
  onClose?: () => void;
  onSubmit?: () => void;
  onDelete?: () => void;
  deleteDisabled?: boolean;
};

const SectionWrapper: FC<Props> = ({
  children,
  loading = false,
  mode,
  sectionLabel,
  styleLabel,
  border,
  width = '1058px',
  onEdit,
  onClose,
  onSubmit,
  onDelete,
  deleteDisabled = false,
}) => {
  return (
    <Spin spinning={loading}>
      <Flex
        vertical
        gap={16}
        style={{
          borderRadius: 16,
          position: 'relative',
          width,
          padding: border ? '40px' : '0',
          border: border ? `1px solid ${COLOR_BORDER}` : 'none',
        }}
      >
        <Flex justify={sectionLabel ? 'space-between' : 'flex-end'}>
          {sectionLabel && (
            <Typography.Title
              style={{
                fontSize: 20,
                fontWeight: 700,
                marginBottom: 0,
                ...styleLabel,
              }}
            >
              {sectionLabel}
            </Typography.Title>
          )}
          <Flex gap={8}>
            {mode === 'view' && onDelete && (
              <Tooltip title="Delete">
                <span style={{ display: 'inline-flex' }}>
                  <DeleteButton
                    disabled={deleteDisabled}
                    onClick={deleteDisabled ? undefined : onDelete}
                  />
                </span>
              </Tooltip>
            )}
            {mode === 'view' && onEdit && (
              <Tooltip title="Edit">
                <EditOutlined style={{ cursor: 'pointer', fontSize: 30 }} onClick={onEdit} />
              </Tooltip>
            )}
          </Flex>
        </Flex>
        {children}

        {mode === 'edit' && onClose && onSubmit && (
          <Flex gap={8}>
            <Button className="cancel-button" htmlType="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="primary" htmlType="button" onClick={onSubmit}>
              Save
            </Button>
          </Flex>
        )}
      </Flex>
    </Spin>
  );
};

export default SectionWrapper;
