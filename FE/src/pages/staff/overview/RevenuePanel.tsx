import { type FC, useState } from 'react';
import { App, Flex, Select, Skeleton } from 'antd';

import { reportApi } from '@/apis/report';
import { CorridorTable } from '@/components/report/CorridorTable';
import { RevenueChart } from '@/components/report/RevenueChart';
import { compactMoney, monthLabel } from '@/components/report/reportFormat';
import { Button, Panel } from '@/components/ui';
import { useRevenueReport } from '@/hooks/report';
import { apiErrorMessage, downloadBlob, ict } from '@/lib/utils';

type Period = '6' | '12' | 'year';

const PERIODS: { value: Period; label: string }[] = [
  { value: '6', label: 'Last 6 months' },
  { value: '12', label: 'Last 12 months' },
  { value: 'year', label: 'This year' },
];

/** The period's months as YYYY-MM, ending this month in Indochina Time. */
const range = (period: Period) => {
  const now = ict(new Date().toISOString());
  const to = now.format('YYYY-MM');
  const from =
    period === 'year'
      ? now.startOf('year').format('YYYY-MM')
      : now.subtract(Number(period) - 1, 'month').format('YYYY-MM');
  return { from, to };
};

/**
 * Revenue and direct cost (US-R-02, DESIGN.md "Revenue and margin live with the revenue chart"): by month for a
 * period and, optionally, one corridor, with the margin in the subtitle, the corridors in a table, and the job rows
 * as CSV. A job counts in the month its final invoice was issued.
 */
export const RevenuePanel: FC = () => {
  const { message } = App.useApp();
  const [period, setPeriod] = useState<Period>('6');
  const [corridorId, setCorridorId] = useState<string>();
  const params = { ...range(period), ...(corridorId ? { corridorId } : {}) };
  const { data: report, isPending } = useRevenueReport(params);
  const [exporting, setExporting] = useState(false);

  const exportCsv = async () => {
    setExporting(true);
    try {
      downloadBlob(
        await reportApi.revenueCsv(params),
        `revenue-${params.from}-to-${params.to}.csv`,
      );
    } catch (e) {
      message.error(apiErrorMessage(e, 'The export failed.'));
    } finally {
      setExporting(false);
    }
  };

  const latest = report?.months[report.months.length - 1];
  const summary = !report
    ? ''
    : report.totals.jobs === 0
      ? `${report.currency}. No job was settled in this period.`
      : `${report.currency}. ${monthLabel(report.from, true)} to ${monthLabel(report.to, true)}: ${compactMoney(
          report.totals.revenue,
        )} revenue, ${report.totals.marginPct ?? 0}% gross margin, ${report.totals.jobs} ${
          report.totals.jobs === 1 ? 'job' : 'jobs'
        } settled${latest && latest.jobs > 0 ? `; ${monthLabel(latest.month)} ${compactMoney(latest.revenue)}` : ''}.`;

  return (
    <Panel>
      <Flex vertical gap={16}>
        <Flex justify="space-between" align="start" gap={16} wrap>
          <Flex vertical gap={2}>
            <h2 className="type-h4 m-0 text-ink">Revenue and direct cost by month</h2>
            <p className="type-body-s m-0 text-ink-3">{summary}</p>
          </Flex>
          <Flex gap={8} align="center" wrap>
            <Select<Period>
              aria-label="Period"
              value={period}
              onChange={setPeriod}
              options={PERIODS}
              className="w-40"
            />
            <Select<string>
              aria-label="Corridor"
              allowClear
              placeholder="Every corridor"
              value={corridorId}
              onChange={setCorridorId}
              options={(report?.corridorOptions ?? []).map((c) => ({
                value: c.id,
                label: c.label,
              }))}
              className="w-72"
            />
            <Button
              size="sm"
              variant="secondary"
              leadingIcon="file"
              disabled={exporting || !report}
              onClick={() => void exportCsv()}
            >
              Export CSV
            </Button>
          </Flex>
        </Flex>
        <Flex gap={16} align="center" className="type-caption text-ink-2">
          <Flex gap={6} align="center">
            <span className="inline-block size-2.5 rounded-[2px] bg-chart-1" />
            Revenue
          </Flex>
          <Flex gap={6} align="center">
            <span className="inline-block size-2.5 rounded-[2px] bg-chart-2" />
            Direct cost
          </Flex>
        </Flex>
        {isPending || !report ? (
          <Skeleton active paragraph={{ rows: 6 }} />
        ) : (
          <>
            <RevenueChart months={report.months} />
            <CorridorTable report={report} />
            <p className="type-caption m-0 text-ink-3">
              Revenue is what each job was invoiced, deposit included; direct cost its priced lines
              as settled plus what its incidents cost. A job counts in the month its final invoice
              was issued.
            </p>
          </>
        )}
      </Flex>
    </Panel>
  );
};
