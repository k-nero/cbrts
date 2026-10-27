import type { HorseSex, RateBasis, ServiceClass, TrailerType } from '@/interfaces';
import { editorRefusal, SERVICE_CLASS_LABELS, TRAILER_LABELS } from '@/lib/utils';

export type Opt<T extends string> = { label: string; value: T };

export const opt = <T extends string>(value: T, label: string): Opt<T> => ({ value, label });

export const BASES: Opt<RateBasis>[] = [
  opt('PER_HORSE', 'Per horse'),
  opt('PER_SHIPMENT', 'Per shipment'),
  opt('PER_KM', 'Per km (road)'),
  opt('PER_DAY', 'Per day (quarantine days)'),
  opt('PER_CROSSING', 'Per border crossing'),
  opt('PER_HOUR', 'Per hour (estimated)'),
  opt('PER_THREE_HORSES', 'One per three horses'),
  opt('FLIGHT_VET', 'Flight vet rule'),
  opt('VET_ESCORT', 'Vet escort on request (road)'),
];

export const GROUPS: Opt<string>[] = [
  opt('A', 'A · Ground transport, origin'),
  opt('B', 'B · Pre-export'),
  opt('C', 'C · Freight'),
  opt('D', 'D · Escort'),
  opt('E', 'E · Documentation'),
  opt('F', 'F · Post-arrival'),
  opt('G', 'G · Ground transport, destination'),
  opt('H', 'H · Surcharges'),
];

export const SEXES: Opt<HorseSex>[] = [
  opt('STALLION', 'Stallion'),
  opt('MARE', 'Mare'),
  opt('GELDING', 'Gelding'),
  opt('COLT', 'Colt'),
  opt('FILLY', 'Filly'),
];

export const TRAILERS: Opt<TrailerType>[] = (Object.keys(TRAILER_LABELS) as TrailerType[]).map(
  (t) => opt(t, TRAILER_LABELS[t]),
);

export const CERTAINTIES: Opt<'FIXED' | 'ESTIMATED'>[] = [
  opt('FIXED', 'Fixed'),
  opt('ESTIMATED', 'Estimated'),
];

export const CLASSES: Opt<ServiceClass>[] = (
  Object.keys(SERVICE_CLASS_LABELS) as ServiceClass[]
).map((c) => opt(c, SERVICE_CLASS_LABELS[c]));

/** A modal's save failed: the page handles a vanished draft, the form shows everything else. */
export type OnDraftGone = (error: unknown) => boolean;

/** Puts a refusal on the fields the form shows (focusing the first) and the rest in the form message. */
export const refuse = (
  error: unknown,
  fieldsByCode: Record<string, string>,
  shownFields: string[],
  setError: (name: string, message: string, focus: boolean) => void,
) => {
  const refusal = editorRefusal(error, fieldsByCode, shownFields);
  Object.entries(refusal.fields).forEach(([field, message]) =>
    setError(field, message, field === refusal.focus),
  );
  if (refusal.form) setError('form_error', refusal.form, false);
};
