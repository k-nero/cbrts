import { PlaceKindEnum, TransportModeEnum, type PlaceKind, type TransportMode } from '@/interfaces';

export type Option = { label: string; value: string };

export const MODE_LABEL: Record<TransportMode, string> = {
  [TransportModeEnum.ROAD]: 'Road',
  [TransportModeEnum.AIR]: 'Air',
};

export const MODE_OPTIONS: Option[] = [
  { label: 'Road', value: TransportModeEnum.ROAD },
  { label: 'Air', value: TransportModeEnum.AIR },
];

const PLACE_KIND_LABEL: Record<PlaceKind, string> = {
  [PlaceKindEnum.STABLE]: 'Stable',
  [PlaceKindEnum.TRAINING_CENTRE]: 'Training centre',
  [PlaceKindEnum.RACECOURSE]: 'Racecourse',
  [PlaceKindEnum.STUD]: 'Stud',
  [PlaceKindEnum.AIRPORT]: 'Airport',
  [PlaceKindEnum.CARGO_TERMINAL]: 'Cargo terminal',
  [PlaceKindEnum.QUARANTINE]: 'Quarantine station',
  [PlaceKindEnum.WELFARE_STOP]: 'Welfare stop',
};

export const PLACE_KIND_OPTIONS: Option[] = Object.entries(PLACE_KIND_LABEL).map(
  ([value, label]) => ({ value, label }),
);

/** "±3 days", "±1 day", "Fixed dates". */
export const flexWords = (days: number) =>
  days === 0 ? 'Fixed dates' : `±${days} ${days === 1 ? 'day' : 'days'}`;
