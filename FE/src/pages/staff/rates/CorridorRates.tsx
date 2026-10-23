import { type FC } from 'react';
import { Col, Flex, Row } from 'antd';

import { BreaksPanel } from './BreaksPanel';
import { ClassTable } from './ClassTable';
import { LineTable } from './LineTable';
import { PolicyPanel } from './PolicyPanel';
import { RateTiles } from './RateTiles';

import { Button, Callout } from '@/components/ui';
import type { RateCatalog, RateCorridorView, RateLine, ServiceClassRow } from '@/interfaces';
import { corridorShort } from '@/lib/utils';

export type Editing = {
  onAddClass: () => void;
  onEditClass: (row: ServiceClassRow) => void;
  onRemoveClass: (row: ServiceClassRow) => void;
  onAddLine: () => void;
  onEditLine: (row: RateLine) => void;
  onRemoveLine: (row: RateLine) => void;
  onEditBreaks: () => void;
  onEditPolicies: () => void;
};

/** The corridor's rates as the catalog shows them; with a draft open, every table can be edited. */
export const CorridorRates: FC<{
  catalog: RateCatalog;
  view: RateCorridorView;
  editing: Editing | null;
}> = ({ catalog, view, editing }) => (
  <Flex vertical gap={24}>
    <RateTiles catalog={catalog} view={view} />
    {view.missing.length > 0 && (
      <Callout
        tone="bad"
        title={`${corridorShort(view.corridor.code)} has ${view.missing.length} missing ${view.missing.length === 1 ? 'rate' : 'rates'}`}
      >
        <Flex component="span" vertical gap={4}>
          {view.missing.map((m) => (
            <span key={m.description}>{m.why}</span>
          ))}
          <span>Quotations on this corridor can&apos;t be issued until they are filled in.</span>
        </Flex>
      </Callout>
    )}
    {view.corridor.mode === 'AIR' && (
      <ClassTable
        view={view}
        actions={editing && { onEdit: editing.onEditClass, onRemove: editing.onRemoveClass }}
        add={
          editing &&
          view.serviceClasses.length < 3 && (
            <Button size="sm" variant="secondary" leadingIcon="plus" onClick={editing.onAddClass}>
              Add class
            </Button>
          )
        }
      />
    )}
    <Row gutter={[24, 24]} align="top">
      <Col span={12}>
        <BreaksPanel
          view={view}
          edit={
            editing && (
              <Button
                size="sm"
                variant="ghost"
                aria-label="Edit volume breaks"
                onClick={editing.onEditBreaks}
              >
                Edit
              </Button>
            )
          }
        />
      </Col>
      <Col span={12}>
        <PolicyPanel
          view={view}
          edit={
            editing && (
              <Button
                size="sm"
                variant="ghost"
                aria-label="Edit percentages and policy"
                onClick={editing.onEditPolicies}
              >
                Edit
              </Button>
            )
          }
        />
      </Col>
    </Row>
    <LineTable
      view={view}
      actions={editing && { onEdit: editing.onEditLine, onRemove: editing.onRemoveLine }}
      add={
        editing && (
          <Button size="sm" variant="secondary" leadingIcon="plus" onClick={editing.onAddLine}>
            Add line
          </Button>
        )
      }
    />
  </Flex>
);
