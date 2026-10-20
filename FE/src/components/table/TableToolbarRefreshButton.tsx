import { SyncOutlined } from '@ant-design/icons';
import { Button, Tooltip } from 'antd';

import { TABLE_CSS_PREFIX } from './types';

type Props = {
  onClick: () => void;
  spin?: boolean;
};

const TableToolbarRefreshButton = ({ onClick, spin }: Props) => {
  return (
    <Tooltip title="Refresh">
      <Button
        type="text"
        aria-label="Refresh"
        className={`${TABLE_CSS_PREFIX}-toolbar-refresh`}
        onClick={onClick}
        icon={<SyncOutlined spin={spin} />}
      />
    </Tooltip>
  );
};

export default TableToolbarRefreshButton;
