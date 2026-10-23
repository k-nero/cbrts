import { useState } from 'react';
import { Col, Flex, Row } from 'antd';

import { isDue } from './format';
import NoteDetail from './NoteDetail';
import NoteList from './NoteList';

import PageHeader from '@/components/PageHeader';
import { Chip } from '@/components/ui';
import { useCustomerNotes } from '@/hooks/customerNote';

/** Customer notes (transport specialist, logistics manager): list and detail, oldest first. */
const CustomerNotesPage = () => {
  const notesQuery = useCustomerNotes();
  const notes = notesQuery.data ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // The first note until one is picked, and again if the picked one leaves the queue.
  const selected = notes.find((n) => n.id === selectedId) ?? notes[0] ?? null;
  const dueCount = notes.filter(isDue).length;

  return (
    <Flex vertical gap={28}>
      <PageHeader
        title="Customer notes"
        summary="Notes customers left on their requests, routed to you by topic. Reply within 1 business day."
        right={dueCount > 0 && <Chip tone="warn">{`${dueCount} due today`}</Chip>}
      />

      <Flex gap={8} align="center" style={{ minHeight: 32 }}>
        <span className="type-label-s text-ink">
          {notesQuery.data === undefined
            ? 'Notes'
            : `${notes.length} open ${notes.length === 1 ? 'note' : 'notes'}`}
        </span>
        <span className="type-body-s text-ink-3">Oldest first</span>
      </Flex>

      {/* Loading is the table's own spinner; a failed load goes to the error boundary. */}
      <Row gutter={[24, 24]} align="top">
        <Col xs={24} xl={10}>
          <NoteList
            notes={notes}
            loading={notesQuery.isPending || notesQuery.isFetching}
            refreshing={notesQuery.isFetching && !notesQuery.isPending}
            onRefresh={() => void notesQuery.refetch()}
            selectedId={selected?.id ?? null}
            onSelect={(n) => setSelectedId(n.id)}
          />
        </Col>
        <Col xs={24} xl={14}>
          {selected && <NoteDetail note={selected} />}
        </Col>
      </Row>
    </Flex>
  );
};

export default CustomerNotesPage;
