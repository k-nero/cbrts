import type { Tone } from '@/components/ui';
import {
  type Corridor,
  type CountryOption,
  type CreateVehicleInput,
  type Place,
  type StallSide,
  type StallType,
  StallTypeEnum,
  TransportModeEnum,
  type Vehicle,
  type VehicleBooking,
  type VehicleKind,
  VehicleKindEnum,
  type VehicleStatus,
  VehicleStatusEnum,
} from '@/interfaces';

export const KIND_LABEL: Record<VehicleKind, string> = {
  [VehicleKindEnum.TRAILER]: 'Trailer',
  [VehicleKindEnum.TRUCK]: 'Truck',
};

export const STATUS_CHIP: Record<VehicleStatus, { tone: Tone; label: string }> = {
  [VehicleStatusEnum.ACTIVE]: { tone: 'ok', label: 'Active' },
  [VehicleStatusEnum.MAINTENANCE]: { tone: 'warn', label: 'In maintenance' },
  [VehicleStatusEnum.RETIRED]: { tone: 'neutral', label: 'Retired' },
};

/** Stall types with their width and the swatch token used on the load plan. */
export const STALL_TYPES: { type: StallType; label: string; swatch: string }[] = [
  { type: StallTypeEnum.STANDARD, label: 'Standard (32″)', swatch: 'bg-stall-standard' },
  { type: StallTypeEnum.BOX, label: 'Box (96″)', swatch: 'bg-stall-box' },
  { type: StallTypeEnum.CLIMATE, label: 'Climate (48″)', swatch: 'bg-stall-climate' },
];

export const KIND_OPTIONS = Object.values(VehicleKindEnum).map((k) => ({
  label: KIND_LABEL[k],
  value: k,
}));

/** Stalls come in pairs, two abreast. */
export const STALL_COUNT_OPTIONS = [2, 4, 6, 8].map((n) => ({
  label: `${n} stalls`,
  value: String(n),
}));

/**
 * What a slot booked from this page is for. A job's booking needs the job, so it is made from the
 * job's load plan (choosing the vehicle), never here; the server refuses a JOB booking without one.
 */
export const BOOKING_KIND_OPTIONS: { label: string; value: VehicleBooking['kind'] }[] = [
  { label: 'Maintenance', value: 'MAINTENANCE' },
  { label: 'Hold (sanitisation or inspection)', value: 'HOLD' },
];

/**
 * The stall layout a new vehicle starts with: two abreast, front to back, stall 2 a box and stall
 * 4 climate-controlled, the back row nearest the ramp. Unchanged from the page this replaces.
 */
export const defaultStalls = (count: number): CreateVehicleInput['stalls'] =>
  Array.from({ length: count }, (_, idx) => {
    const positionNo = idx + 1;
    const rowNo = Math.ceil(positionNo / 2);
    const side: StallSide = positionNo % 2 !== 0 ? 'LEFT' : 'RIGHT';
    const stallType: StallType =
      positionNo === 2
        ? StallTypeEnum.BOX
        : positionNo === 4
          ? StallTypeEnum.CLIMATE
          : StallTypeEnum.STANDARD;
    return { positionNo, stallType, rowNo, side, nearRamp: rowNo === Math.ceil(count / 2) };
  });

/**
 * The cities a vehicle can be based in (US-F7-03): each city with a place a request can start or end
 * at, labelled with its country.
 */
export const cityOptions = (places: Place[] | undefined) => {
  const seen = new Map<string, { label: string; value: string }>();
  for (const p of places ?? []) {
    if (!p.city || p.kind === 'WELFARE_STOP') continue;
    const key = p.city.toLowerCase();
    if (!seen.has(key)) seen.set(key, { label: `${p.city}, ${p.countryName}`, value: p.city });
  }
  return [...seen.values()].sort((a, b) => a.label.localeCompare(b.label));
};

/** Countries for the permit select, by name. */
export const countryOptions = (countries: CountryOption[] | undefined) =>
  [...(countries ?? [])]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((c) => ({ label: `${c.name} (${c.code})`, value: c.id }));

/**
 * Road corridors for the operating corridors select (US-F7-01), each with the countries it passes
 * through, since the vehicle needs a permit for every one. Air corridors carry no vehicle.
 */
export const corridorOptions = (corridors: Corridor[] | undefined) =>
  (corridors ?? [])
    .filter((c) => c.mode === TransportModeEnum.ROAD)
    .map((c) => ({
      label: c.countries?.length ? `${c.code} · ${c.countries.join(', ')}` : c.code,
      value: c.id,
    }));

/** "VN · KH, TH": where the vehicle is based, then the countries it holds permits for. */
export const countriesText = (v: Vehicle) => {
  const home = v.homeCountry?.code ?? '—';
  const permits = (v.permittedCountries ?? []).map((c) => c.code).join(', ');
  return permits ? `${home} · ${permits}` : home;
};
