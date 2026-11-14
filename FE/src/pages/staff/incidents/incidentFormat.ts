import type { Tone } from '@/components/ui';
import type { IncidentStatus, InsuranceClaimStatus } from '@/interfaces';
import { IncidentStatusEnum } from '@/interfaces';

/** An incident's state as a tone plus a word (DESIGN.md, Status): open is Bad until decided. */
export const INCIDENT_STATUS: Record<IncidentStatus, { tone: Tone; label: string }> = {
  [IncidentStatusEnum.OPEN]: { tone: 'bad', label: 'Open' },
  [IncidentStatusEnum.DECIDED]: { tone: 'warn', label: 'Decided' },
  [IncidentStatusEnum.RESOLVED]: { tone: 'ok', label: 'Resolved' },
};

/** An insurance claim's state (US-F5-08): waiting on the insurer, paid, or refused. */
export const CLAIM_STATUS: Record<InsuranceClaimStatus, { tone: Tone; label: string }> = {
  FILED: { tone: 'warn', label: 'Filed' },
  SETTLED: { tone: 'ok', label: 'Settled' },
  DECLINED: { tone: 'bad', label: 'Declined' },
};

/** "1 h 20 min", "35 min": how long an incident has been open. */
export const openFor = (since: string, now = Date.now()) => {
  const minutes = Math.max(0, Math.floor((now - new Date(since).getTime()) / 60_000));
  const hours = Math.floor(minutes / 60);
  if (hours >= 48) return `${Math.floor(hours / 24)} days`;
  return hours > 0 ? `${hours} h ${minutes % 60} min` : `${minutes} min`;
};

/** "3 h 30 min", "45 min": what an option adds to the arrival. */
export const duration = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h === 0 ? `${m} min` : m === 0 ? `${h} h` : `${h} h ${m} min`;
};

/** "USD 1,200.00" in the job's quotation currency. */
export const money = (currency: string, amount: number) =>
  `${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
