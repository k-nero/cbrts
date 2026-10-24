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
