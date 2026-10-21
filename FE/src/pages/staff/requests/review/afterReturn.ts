/**
 * Where Request review goes once a request is returned (spec §5.2): the next request in the queue as the
 * page held it before sending, because the return's answer has no queue position any more.
 */
export const afterReturn = (
  heldNextId: string | null | undefined,
): { to: 'request-review'; id: string } | { to: 'requests' } =>
  heldNextId ? { to: 'request-review', id: heldNextId } : { to: 'requests' };
