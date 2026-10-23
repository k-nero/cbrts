import { useState } from 'react';
import { TimePicker } from 'antd';
import dayjs from 'dayjs';

import { formatClock } from '../tripFormat';

import BaseModal from '@/components/modal/BaseModal';
import { Button, Chip } from '@/components/ui';

type Props = {
  open: boolean;
  currentTime: dayjs.Dayjs;
  onApply: (newTime: dayjs.Dayjs) => void;
  onClose: () => void;
};

export function ChangeTimeModal({ open, currentTime, onApply, onClose }: Props) {
  const [selectedTime, setSelectedTime] = useState<dayjs.Dayjs>(currentTime);

  const handleOpen = () => {
    setSelectedTime(currentTime);
  };

  const handleApply = () => {
    onApply(selectedTime);
    onClose();
  };

  const handleQuickShift = (minutes: number) => {
    if (minutes === 0) {
      setSelectedTime(dayjs());
    } else {
      setSelectedTime((prev) => prev.add(minutes, 'minute'));
    }
  };

  const now = dayjs();
  const diffMinutes = Math.round(selectedTime.diff(now, 'minute'));
  const diffLabel =
    Math.abs(diffMinutes) < 1
      ? 'Current time'
      : diffMinutes < 0
        ? `${Math.abs(diffMinutes)} min earlier`
        : `in ${diffMinutes} min`;

  return (
    <BaseModal
      open={open}
      onCancel={onClose}
      afterOpenChange={(isOpen) => isOpen && handleOpen()}
      title={null}
      width={460}
      className="p-0"
    >
      <div className="flex flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex flex-col gap-1.5 border-b border-line pb-4">
          <h3 className="type-h3 m-0 text-ink">Change checkpoint time</h3>
          <p className="type-body-s m-0 text-ink-2">
            Default is now. If this checkpoint cleared earlier before you returned to the cab, set
            the actual time.
          </p>
        </div>

        {/* Large DM Mono time display with difference chip */}
        <div className="flex items-center justify-between rounded-xl border border-line bg-sunken p-4">
          <div className="flex flex-col gap-1">
            <span className="type-caption text-ink-3">Selected time</span>
            <span className="type-mono-data text-4xl font-bold tracking-tight text-ink">
              {formatClock(selectedTime.toDate())}
            </span>
          </div>
          <Chip tone={Math.abs(diffMinutes) < 1 ? 'ok' : 'info'}>{diffLabel}</Chip>
        </div>

        {/* Quick adjustment buttons (large 48px touch targets for gloves in cab) */}
        <div className="flex flex-col gap-2">
          <span className="type-label-s text-ink-2">Quick adjustments</span>
          <div className="grid grid-cols-4 gap-2">
            <Button
              variant="secondary"
              onClick={() => handleQuickShift(-30)}
              className="h-12 text-sm font-medium"
            >
              −30m
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleQuickShift(-15)}
              className="h-12 text-sm font-medium"
            >
              −15m
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleQuickShift(-5)}
              className="h-12 text-sm font-medium"
            >
              −5m
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleQuickShift(0)}
              className="h-12 text-sm font-medium"
            >
              Now
            </Button>
          </div>
        </div>

        {/* Exact Time Picker */}
        <div className="flex flex-col gap-2">
          <label htmlFor="exact-checkpoint-time" className="type-label-s text-ink-2">
            Or pick exact hour and minute
          </label>
          <TimePicker
            id="exact-checkpoint-time"
            format="HH:mm"
            value={selectedTime}
            onChange={(val) => val && setSelectedTime(val)}
            needConfirm={false}
            className="h-12 w-full text-base"
          />
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-line pt-4">
          <Button variant="secondary" onClick={onClose} className="h-12 px-6">
            Cancel
          </Button>
          <Button
            variant="primary"
            leadingIcon="check"
            onClick={handleApply}
            className="h-12 min-w-[140px] px-6 font-bold"
          >
            Apply time
          </Button>
        </div>
      </div>
    </BaseModal>
  );
}
