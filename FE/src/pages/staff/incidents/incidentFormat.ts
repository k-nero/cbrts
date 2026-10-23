import type { Tone } from '@/components/ui';
import type { IncidentStatus } from '@/interfaces';
import { IncidentStatusEnum } from '@/interfaces';

/** An incident's state as a tone plus a word (DESIGN.md, Status): open is Bad until decided. */
export const INCIDENT_STATUS: Record<IncidentStatus, { tone: Tone; label: string }> = {
  [IncidentStatusEnum.OPEN]: { tone: 'bad', label: 'Open' },
  [IncidentStatusEnum.DECIDED]: { tone: 'warn', label: 'Decided' },
  [IncidentStatusEnum.RESOLVED]: { tone: 'ok', label: 'Resolved' },
};

/** "1 h 20 min", "35 min": how long an incident has been open. */
export const openFor = (since: string, now = Date.now()) => {
  const minutes = Math.max(0, Math.floor((now - new Date(since).getTime()) / 60_000));
  const hours = Math.floor(minutes / 60);
  if (hours >= 48) return `${Math.floor(hours / 24)} days`;
  return hours > 0 ? `${hours} h ${minutes % 60} min` : `${minutes} min`;
};
