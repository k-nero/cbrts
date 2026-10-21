/** Runs a quotation write the page way (toast, conflict callout); true when it went through. */
export type RunWrite = (write: () => Promise<unknown>, done: string) => Promise<boolean>;

type Opt = { label: string; value: string };

/** The ledger groups a manager can add a line to. */
export const GROUPS: Opt[] = [
  { value: 'A', label: 'A · Ground transport, origin' },
  { value: 'B', label: 'B · Pre-export' },
  { value: 'C', label: 'C · Freight' },
  { value: 'D', label: 'D · Escort' },
  { value: 'E', label: 'E · Documentation' },
  { value: 'F', label: 'F · Post-arrival' },
  { value: 'G', label: 'G · Ground transport, destination' },
  { value: 'H', label: 'H · Surcharges' },
];

export const CERTAINTIES: Opt[] = [
  { value: 'FIXED', label: 'Fixed' },
  { value: 'ESTIMATED', label: 'Estimated' },
];
