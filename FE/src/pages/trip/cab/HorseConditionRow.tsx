import type { FC } from 'react';
import { Input, Upload } from 'antd';

import { ConditionSegment } from './ConditionSegment';
import type { Observation } from './observation';
import { Toggle48 } from './Toggle48';

import { Button, cx } from '@/components/ui';
import type { TripHorse } from '@/interfaces';
import { HorseConditionEnum } from '@/interfaces';

type Props = {
  horse: TripHorse;
  observation: Observation;
  onChange: (change: Partial<Observation>) => void;
  /** Drinking and eating are asked at a welfare stop, not on arrival. */
  feeding?: boolean;
};

/** One horse at a stop: name and stall, the condition word, 48 px toggles, a note and photos. */
export const HorseConditionRow: FC<Props> = ({ horse, observation, onChange, feeding = true }) => (
  <section
    className={cx(
      'flex flex-col gap-3 border-t border-line px-6 py-4',
      observation.condition && observation.condition !== HorseConditionEnum.SOUND && 'bg-raised',
    )}
  >
    <div className="flex flex-wrap items-center gap-5">
      <div className="flex min-w-40 flex-1 flex-col gap-0.5">
        <h3 className="type-h4 m-0 text-ink">{horse.name}</h3>
        <span className="type-body-s text-ink-2">{horse.stall ?? 'Stall not assigned'}</span>
      </div>
      <ConditionSegment
        horse={horse.name}
        value={observation.condition}
        onChange={(condition) => onChange({ condition })}
      />
    </div>
    <div className="flex flex-wrap items-center gap-3">
      {feeding && (
        <>
          <Toggle48
            label="Drinking"
            checked={observation.drinking === true}
            onChange={(drinking) => onChange({ drinking })}
          />
          <Toggle48
            label="Eating"
            checked={observation.eating === true}
            onChange={(eating) => onChange({ eating })}
          />
        </>
      )}
      <Input
        size="large"
        aria-label={`${horse.name} note`}
        value={observation.note}
        maxLength={500}
        placeholder="Add a note (optional)"
        onChange={(event) => onChange({ note: event.target.value })}
        className="h-12 min-w-60 flex-1"
      />
      <Upload
        accept="image/jpeg,image/png,image/heic,image/heif"
        multiple
        maxCount={8}
        fileList={observation.photos}
        beforeUpload={() => false}
        onChange={({ fileList }) => onChange({ photos: fileList })}
      >
        <Button className="h-12" leadingIcon="upload">
          Photos
        </Button>
      </Upload>
    </div>
  </section>
);
