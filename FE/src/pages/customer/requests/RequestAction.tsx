import { type FC } from 'react';
import { Flex } from 'antd';

import { Button } from '@/components/ui';
import type { RequestSummary } from '@/interfaces';
import { useCustomRouter } from '@/router/route.hook';

/** The one step a request's row offers, by its state: only what the club owes is Primary. */
export const RequestAction: FC<{ row: RequestSummary; onDiscard: (id: string) => void }> = ({
  row: r,
  onDiscard,
}) => {
  const router = useCustomRouter();
  if (r.status === 'DRAFT')
    return (
      <Flex component="span" justify="end" gap={8}>
        <Button
          size="sm"
          onClick={() => router.push(router.paths.get('request-edit', { pathParams: [r.id] }))}
        >
          Continue draft
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onDiscard(r.id)}>
          Discard
        </Button>
      </Flex>
    );
  if (r.status === 'INFO_REQUIRED')
    return (
      <Flex component="span" justify="end">
        <Button
          size="sm"
          onClick={() => router.push(router.paths.get('request', { pathParams: [r.id] }))}
        >
          Answer
        </Button>
      </Flex>
    );
  if (r.move)
    return (
      <Flex component="span" justify="end">
        <Button
          size="sm"
          variant={r.move.tone === 'warn' ? 'primary' : 'secondary'}
          onClick={() =>
            router.push(
              router.paths.get(r.move?.tracking ? 'request' : 'request-documents', {
                pathParams: [r.id],
              }),
            )
          }
        >
          {!r.move.tracking
            ? 'Open documents'
            : r.move.label === 'Completed'
              ? 'Open the record'
              : r.move.tone === 'warn'
                ? 'Open the move'
                : 'Track the move'}
        </Button>
      </Flex>
    );
  if (r.quotation)
    return (
      <Flex component="span" justify="end">
        <Button
          size="sm"
          variant={r.status === 'QUOTED' ? 'primary' : 'secondary'}
          onClick={() => router.push(router.paths.get('request-quotation', { pathParams: [r.id] }))}
        >
          {r.status === 'QUOTED' ? 'Review quotation' : 'Open quotation'}
        </Button>
      </Flex>
    );
  return null;
};
