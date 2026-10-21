import type { FC } from 'react';

import type { NoteForm } from './schema';

import { useFormWrapperCtx } from '@/components/form/FormWrapper';

/** The note the request goes back with, addressed to the club. */
export const NoteField: FC<{ club: string }> = ({ club }) => {
  const { FormField } = useFormWrapperCtx<NoteForm>();
  return (
    <FormField
      name="note"
      label={`Note to ${club}`}
      component="textarea"
      componentProps={{
        autoSize: { minRows: 4, maxRows: 10 },
        instruction:
          'Required. The customer sees it exactly as written; the request goes back to them with your note.',
      }}
    />
  );
};
