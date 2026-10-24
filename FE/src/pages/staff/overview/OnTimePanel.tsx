import { type FC, lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Flex, Select, Skeleton } from 'antd';
import { Link, useLocation } from 'react-router-dom';

import { Panel } from '@/components/ui';
import { useOnTimeReport } from '@/hooks/report';
import { formatDayTime, ict } from '@/lib/utils';
import { duration } from '@/pages/staff/incidents/incidentFormat';

const OnTimeChart = lazy(() => import('@/components/report/OnTimeChart'));

type Period = '8w' | '6m' | '12m';

const PERIODS: { value: Period; label: string }[] = [
  { value: '8w', label: 'Last 8 weeks' },
  { value: '6m', label: 'Last 6 months' },
  { value: '12m', label: 'Last 12 months' },
];

/** The period's days, ending today in Indochina Time; weeks start on Monday. */
const range = (period: Period) => {
  const today = ict(new Date().toISOString());
  const to = today.format('YYYY-MM-DD');
  if (period === '8w') {
    const monday = today.subtract((today.day() + 6) % 7, 'day');
    return { from: monday.subtract(7, 'week').format('YYYY-MM-DD'), to, by: 'WEEK' as const };
  }
  const months = period === '6m' ? 5 : 11;
  return {
    from: today.startOf('month').subtract(months, 'month').format('YYYY-MM-DD'),
    to,
    by: 'MONTH' as const,
  };
};

/**
 * On-time delivery (US-R-03): the share of jobs delivered by when they were due, by week or month against the 95%
 * target, by corridor, and the late jobs with how late and against what. The Overview's on-time tile opens it
 * (#on-time).
 */
export const OnTimePanel: FC = () => {
  const [period, setPeriod] = useState<Period>('8w');
  const [corridorId, setCorridorId] = useState<string>();
  const params = { ...range(period), ...(corridorId ? { corridorId } : {}) };
  const { data: report, isPending } = useOnTimeReport(params);
  const location = useLocation();
  const anchor = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (location.hash === '#on-time') anchor.current?.scrollIntoView({ behavior: 'smooth' });
  }, [location.hash]);

  const summary = !report
    ? ''
    : report.totals.delivered === 0
      ? 'No job was delivered in this period.'
      : `${report.totals.rate}% on time: ${report.totals.late} of ${report.totals.delivered} ${
          report.totals.delivered === 1 ? 'job' : 'jobs'
        } late. Dashed line: ${Number(report.target)}% target.`;

  return (
    <div ref={anchor} id="on-time" className="scroll-mt-6">
      <Panel>
        <Flex vertical gap={16}>
          <Flex justify="space-between" align="start" gap={16} wrap>
            <Flex vertical gap={2}>
              <h2 className="type-h4 m-0 text-ink">
                On-time delivery by {params.by === 'WEEK' ? 'week' : 'month'}
              </h2>
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
            </Flex>
          </Flex>
          {isPending || !report ? (
            <Skeleton active paragraph={{ rows: 6 }} />
          ) : (
            <>
              <Suspense fallback={<Skeleton.Node active className="h-55! w-full!" />}>
                <OnTimeChart report={report} />
              </Suspense>
              <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-start gap-6">
                <table className="w-full border-collapse">
                  <caption className="type-label-s pb-2 text-left text-ink">By corridor</caption>
                  <thead>
                    <tr className="border-b border-line">
                      {['Corridor', 'Delivered', 'Late', 'On time'].map((h, i) => (
                        <th
                          key={h}
                          scope="col"
                          className={`type-caption py-2 font-normal text-ink-3 ${i === 0 ? 'text-left' : 'text-right'}`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {report.corridors.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="type-body-s py-3 text-ink-3">
                          No delivery in this period.
                        </td>
                      </tr>
                    ) : (
                      report.corridors.map((c) => (
                        <tr key={c.corridorId ?? 'none'} className="border-b border-line">
                          <th
                            scope="row"
                            className="type-body-s py-2 text-left font-normal text-ink"
                          >
                            {c.label}
                          </th>
                          <td className="type-data py-2 text-right text-ink-2">{c.delivered}</td>
                          <td className="type-data py-2 text-right text-ink-2">{c.late}</td>
                          <td
                            className={`type-data py-2 text-right ${
                              c.rate != null && c.rate < report.target ? 'text-warn' : 'text-ink'
                            }`}
                          >
                            {c.rate == null ? '—' : `${c.rate}%`}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                <div>
                  <p className="type-label-s m-0 pb-2 text-ink">
                    Late jobs{report.lateJobs.length ? ` · ${report.lateJobs.length}` : ''}
                  </p>
                  {report.lateJobs.length === 0 ? (
                    <p className="type-body-s m-0 border-t border-line py-3 text-ink-3">
                      Every job in this period was delivered on time.
                    </p>
                  ) : (
                    <ul className="m-0 list-none border-t border-line p-0">
                      {report.lateJobs.map((j) => (
                        <li key={j.jobId} className="border-b border-line">
                          <Link
                            to={`/staff/jobs/${j.jobId}?tab=trip`}
                            className="grid grid-cols-[130px_minmax(0,1fr)_auto] items-center gap-3 py-2 text-inherit no-underline hover:bg-raised"
                          >
                            <span className="type-data text-ink">{j.jobCode}</span>
                            <span className="type-body-s truncate text-ink-2">
                              {j.club} · {j.corridor}
                            </span>
                            <span className="flex flex-col items-end">
                              <span className="type-label-s text-warn">
                                {duration(j.lateMinutes)} late
                              </span>
                              <span className="type-caption text-ink-3">
                                {formatDayTime(j.deliveredAt)}, past {j.measuredAgainst}
                              </span>
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <p className="type-body-s m-0 text-ink-3">
                On time is delivered by the arrival window&apos;s close, less any time an incident
                stopped the clock, or without a window by the planned arrival with 30 minutes&apos;
                tolerance. Closing a job records the same.
              </p>
            </>
          )}
        </Flex>
      </Panel>
    </div>
  );
};
