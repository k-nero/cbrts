import type { FC } from 'react';
import { useWatch } from 'react-hook-form';

import type { RouteDraftForm } from './routeDraft';

import { routeStopApi } from '@/apis/job';
import type { FormFieldProps } from '@/components/form/types';

/** Every catalogued place whose name or city matches what is typed, with its kind and city. */
const loadPlaces = (q: string) =>
  routeStopApi.places(q).then((places) =>
    places.map((p) => ({
      value: p.id,
      label: `${p.name}, ${p.city} · ${p.kind.toLowerCase().replace('_', ' ')}`,
    })),
  );

/**
 * A stop's Place, or its Crossing for a border stop. The row reads its own kind with `useWatch`, so the right field
 * shows as soon as the kind changes or the stop is moved.
 */
export const StopPlaceField: FC<{
  FormField: FC<FormFieldProps<RouteDraftForm>>;
  index: number;
  crossingOptions: { value: string; label: string }[];
  crossingsLoading: boolean;
}> = ({ FormField, index, crossingOptions, crossingsLoading }) => {
  const kind = useWatch<RouteDraftForm, `stops.${number}.kind`>({ name: `stops.${index}.kind` });
  return kind?.value === 'BORDER' ? (
    <FormField
      name={`stops.${index}.crossing`}
      label="Crossing"
      component="select"
      componentProps={{
        isRequired: true,
        options: crossingOptions,
        isLoading: crossingsLoading,
        placeholder: 'Choose a crossing',
      }}
    />
  ) : (
    <FormField
      name={`stops.${index}.place`}
      label="Place"
      component="async-select"
      componentProps={{
        isRequired: true,
        loadOptions: loadPlaces,
        defaultOptions: true,
        cacheOptions: true,
        placeholder: 'A place or a city',
      }}
    />
  );
};
