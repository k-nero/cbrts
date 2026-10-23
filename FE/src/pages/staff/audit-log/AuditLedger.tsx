import { useState } from 'react';
import { DatePicker, Flex, Input, Select } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';

import AuditEntryPanel from './AuditEntryPanel';
import AuditList from './AuditList';
import { actionLabel } from './format';

import type { AuditFilters } from '@/apis/audit';
import PageHeader from '@/components/PageHeader';
import { Button, Callout } from '@/components/ui';
import { useAuditActions, useAuditActors, useAuditLog, useExportAuditCsv } from '@/hooks/audit';
import { AUDIT_SYSTEM_ACTOR, type AuditEntry } from '@/interfaces';
import { apiErrorMessage } from '@/lib';

const SUMMARY = 'Every decision and change, newest first. Entries are never edited or deleted.';

const TIME_ZONE_NOTE = 'Times are Indochina Time (UTC+7).';

const DAY = 'YYYY-MM-DD';

/** "20 – 26 Sep 2026" for the No results sentence. */
const rangeLabel = (from?: string, to?: string) => {
  if (from && to)
    return `between ${dayjs(from).format('D MMM')} and ${dayjs(to).format('D MMM YYYY')}`;
  if (from) return `since ${dayjs(from).format('D MMM YYYY')}`;
  if (to) return `up to ${dayjs(to).format('D MMM YYYY')}`;
  return '';
};

export const AuditLedger = () => {
  const [filters, setFilters] = useState<AuditFilters>({});
  const [searchText, setSearchText] = useState('');
  const [selected, setSelected] = useState<AuditEntry | null>(null);
  const crud = useAuditLog(filters);
  const actors = useAuditActors();
  const actions = useAuditActions();
  const exportCsv = useExportAuditCsv();
  const { listQuery, search, setSearch, setPageState } = crud;
  const total = listQuery.data?.totalElements;
  const filtered = Boolean(search || filters.actor || filters.action || filters.from || filters.to);

  const setFilter = (next: Partial<AuditFilters>) => {
    setFilters((f) => ({ ...f, ...next }));
    setPageState((p) => ({ ...p, number: 0 }));
    setSelected(null);
  };

  const clearFilters = () => {
    setFilters({});
    setSearchText('');
    setSearch('');
    setSelected(null);
  };

  const actorName =
    filters.actor === AUDIT_SYSTEM_ACTOR
      ? 'the system'
      : actors.data?.find((a) => a.id === filters.actor)?.label;

  const countLabel =
    total === undefined
      ? 'Entries'
      : search && !filters.actor && !filters.action
        ? `${total} ${total === 1 ? 'entry' : 'entries'} for ${search}`
        : `${total} ${total === 1 ? 'entry' : 'entries'}`;

  const noResults = filtered ? (
    <div className="px-6 pt-12 pb-13">
      <Flex vertical align="center" gap={8}>
        <h3 className="type-h4 m-0 text-center text-ink">No entries match these filters</h3>
        <p className="type-body-s m-0 max-w-140 text-center text-ink-2">
          {`Nothing was recorded${search ? ` for ${search}` : ''}${actorName ? ` by ${actorName}` : ''}${
            filters.action ? ` as ${actionLabel(filters.action).toLowerCase()}` : ''
          } ${rangeLabel(filters.from, filters.to)}`.trim()}
          . A code or name may be mistyped, or the dates may be too narrow.
        </p>
        <div className="pt-2">
          <Button variant="secondary" onClick={clearFilters}>
            Clear filters
          </Button>
        </div>
      </Flex>
    </div>
  ) : (
    <div className="px-6 py-12">
      <Flex vertical align="center" gap={8}>
        <h3 className="type-h4 m-0 text-ink">Nothing has been recorded yet</h3>
        <p className="type-body-s m-0 text-ink-2">
          Each decision and change appears here as it happens.
        </p>
      </Flex>
    </div>
  );

  return (
    <Flex vertical gap={28}>
      <PageHeader
        title="Audit log"
        summary={SUMMARY}
        right={
          <Button
            variant="secondary"
            leadingIcon="file"
            disabled={exportCsv.isPending || total === 0}
            onClick={() => exportCsv.mutate({ ...filters, q: search })}
          >
            {exportCsv.isPending ? 'Exporting…' : 'Export CSV'}
          </Button>
        }
      />

      {exportCsv.isError && (
        <Callout tone="bad" title="Couldn’t export the entries.">
          {apiErrorMessage(exportCsv.error, 'The server didn’t answer. Try again.')}
        </Callout>
      )}

      <Flex vertical gap={16}>
        <Flex wrap align="end" gap={16}>
          <Flex component="label" vertical gap={8}>
            <span className="type-body-s text-ink-2">Search</span>
            <Input.Search
              allowClear
              placeholder="Code, person or document"
              style={{ width: 320 }}
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                if (e.target.value === '') setSearch('');
              }}
              onSearch={(value) => {
                setSearch(value.trim());
                setSelected(null);
              }}
            />
          </Flex>
          <Flex component="label" vertical gap={8}>
            <span className="type-body-s text-ink-2">Person</span>
            <Select
              allowClear
              showSearch={{ optionFilterProp: 'label' }}
              placeholder="Anyone"
              style={{ width: 240 }}
              value={filters.actor}
              loading={actors.isLoading}
              options={[
                { label: 'System', value: AUDIT_SYSTEM_ACTOR },
                ...(actors.data ?? []).map((a) => ({ label: a.label, value: a.id })),
              ]}
              onChange={(actor?: string) => setFilter({ actor })}
            />
          </Flex>
          <Flex component="label" vertical gap={8}>
            <span className="type-body-s text-ink-2">Action</span>
            <Select
              allowClear
              showSearch={{ optionFilterProp: 'label' }}
              placeholder="All actions"
              style={{ width: 240 }}
              value={filters.action}
              loading={actions.isLoading}
              options={(actions.data ?? []).map((a) => ({ label: actionLabel(a), value: a }))}
              onChange={(action?: string) => setFilter({ action })}
            />
          </Flex>
          <Flex component="label" vertical gap={8}>
            <span className="type-body-s text-ink-2">When</span>
            <DatePicker.RangePicker
              allowEmpty={[true, true]}
              format="D MMM YYYY"
              placeholder={['Any day', 'Any day']}
              value={[
                filters.from ? dayjs(filters.from) : null,
                filters.to ? dayjs(filters.to) : null,
              ]}
              onChange={(range: [Dayjs | null, Dayjs | null] | null) =>
                setFilter({
                  from: range?.[0]?.format(DAY) ?? undefined,
                  to: range?.[1]?.format(DAY) ?? undefined,
                })
              }
            />
          </Flex>
        </Flex>

        <Flex align="center" gap={12} className="min-h-8">
          <span className="type-label-s text-ink">{countLabel}</span>
          {filtered && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
          <span className="type-body-s ml-auto text-ink-3">{TIME_ZONE_NOTE}</span>
        </Flex>

        {/* Loading is the table's own spinner; a failed load goes to the error boundary. */}
        <Flex align="start" gap={24}>
          <div className="min-w-0 flex-1">
            <AuditList
              crud={crud}
              selectedId={selected?.id ?? null}
              onSelect={setSelected}
              empty={noResults}
            />
          </div>
          {selected && <AuditEntryPanel entry={selected} onClose={() => setSelected(null)} />}
        </Flex>
      </Flex>
    </Flex>
  );
};
