/**
 * Features the staff UI shows. Turning one off hides its entry points only: the backend, its data and every other
 * flow are unchanged, and turning it back on brings the screens back as they were.
 */
export const features = {
  /** Sharing a trailer with other jobs, joining a confirmed trip and taking a job off one (US-F3-11, US-F3-13, US-F3-18). */
  tripSharing: false,
  /** Scheduling, changing and completing quarantines on the Authorities tab (US-F3-22). */
  quarantine: false,
} as const;
