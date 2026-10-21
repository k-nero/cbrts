import { components, type InputProps } from 'react-select';

import type { PlaceChoice } from './RouteStep';

/** The search box stops at the server's 160 characters for a typed city. */
export const CappedInput = (props: InputProps<PlaceChoice, false>) => (
  <components.Input {...props} maxLength={160} />
);
