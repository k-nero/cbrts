/** Revenue and direct cost by month and corridor (US-R-02, GET /staff/reports/revenue). */
export interface RevenueReport {
  /** YYYY-MM, both inclusive. */
  from: string;
  to: string;
  corridorId: string | null;
  currency: string;
  totals: { jobs: number; revenue: number; cost: number; margin: number; marginPct: number | null };
  /** Every month of the period, oldest first. */
  months: { month: string; jobs: number; revenue: number; cost: number }[];
  /** Corridors with work in the period, most revenue first. */
  corridors: {
    corridorId: string | null;
    label: string;
    jobs: number;
    revenue: number;
    cost: number;
    marginPct: number | null;
  }[];
  jobs: {
    month: string;
    jobCode: string;
    club: string;
    corridor: string;
    finalInvoice: string;
    revenue: number;
    lineCost: number;
    incidentCost: number;
    cost: number;
    margin: number;
  }[];
  corridorOptions: { id: string; label: string }[];
}

export interface RevenueReportParams {
  from: string;
  to: string;
  corridorId?: string;
}

/** The on-time delivery rate (US-R-03, GET /staff/reports/on-time). */
export interface OnTimeReport {
  /** YYYY-MM-DD, both inclusive. */
  from: string;
  to: string;
  by: 'WEEK' | 'MONTH';
  /** The service target the chart draws, in %. */
  target: number;
  totals: { delivered: number; late: number; rate: number | null };
  /** Every week or month, oldest first; `rate` is null when nothing was delivered. */
  buckets: { label: string; start: string; delivered: number; late: number; rate: number | null }[];
  /** Corridors with deliveries, the lowest rate first. */
  corridors: {
    corridorId: string | null;
    label: string;
    delivered: number;
    late: number;
    rate: number | null;
  }[];
  /** The late jobs, latest delivered first. */
  lateJobs: {
    jobId: string;
    jobCode: string;
    club: string;
    corridor: string;
    deliveredAt: string;
    due: string;
    lateMinutes: number;
    measuredAgainst: string;
  }[];
  corridorOptions: { id: string; label: string }[];
}

export interface OnTimeReportParams {
  from: string;
  to: string;
  by: 'WEEK' | 'MONTH';
  corridorId?: string;
}
