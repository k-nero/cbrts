import { components, type InputProps } from 'react-select';

import type { PlaceChoice } from './RouteStep';

/**
 * The search box stops at the server's 160 characters for a typed city. Typed for any `isMulti`, as
 * react-select's `components` slot is; a single-select-only type fails a structural check.
 */
export const CappedInput = (props: InputProps<PlaceChoice, boolean>) => (
  <components.Input {...props} maxLength={160} />
);
