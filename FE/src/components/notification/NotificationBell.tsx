import { FC, useState } from 'react';
import { Popover } from 'antd';

import NotificationPanel from './NotificationPanel';
import { bellLabel } from './notificationFormat';

import { IconButton } from '@/components/ui';
import { useNotificationStream, useUnreadCount } from '@/hooks/notification';
import { type RouteName, useCustomRouter } from '@/router/route.hook';

type Props = {
  /** The shell's notifications page: the owner portal's or the staff one. */
  page: Extract<RouteName, 'notifications' | 'staff-notifications'>;
};

/**
 * The notification bell (US-00-07) in the owner header and the staff top bar: the unread count,
 * kept live by the notification stream, and a panel of the newest notifications.
 */
const NotificationBell: FC<Props> = ({ page }) => {
  useNotificationStream();
  const router = useCustomRouter();
  const count = useUnreadCount().data ?? 0;
  const [open, setOpen] = useState(false);

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger="click"
      placement="bottomRight"
      arrow={false}
      destroyOnHidden
      styles={{ container: { padding: 0 } }}
      content={
        <NotificationPanel
          unreadCount={count}
          onClose={() => setOpen(false)}
          onSeeAll={() => {
            setOpen(false);
            router.push(router.paths.get(page));
          }}
        />
      }
    >
      <IconButton
        icon="bell"
        label={bellLabel(count)}
        count={count}
        aria-haspopup="dialog"
        aria-expanded={open}
      />
    </Popover>
  );
};

export default NotificationBell;
