import { type FC, useState } from 'react';
import { useController, useWatch } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { Flex, Upload } from 'antd';

import type { HorseFormShape } from './HorseForm';

import { fileApi } from '@/apis/file';
import { Button, HorseAvatar } from '@/components/ui';
import { useHorsePhotoUrl } from '@/hooks/horse';
import type { HorseCoat } from '@/interfaces';
import { apiErrorView, coatOf, horsePhotoProblem } from '@/lib/utils';

/**
 * The horse's photo (optional): picking a file uploads it at once, and the form keeps the uploaded
 * file's id, which the save attaches. A refused or failed file leaves the photo as it was.
 */
export const PhotoField: FC = () => {
  const { field } = useController<HorseFormShape, 'photoFileId'>({ name: 'photoFileId' });
  const coat = useWatch<HorseFormShape, 'coat'>({ name: 'coat' });
  const photoUrl = useHorsePhotoUrl(field.value);
  const [problem, setProblem] = useState<string | null>(null);
  const upload = useMutation({ mutationFn: fileApi.upload });

  const choose = async (file: File) => {
    const refusal = horsePhotoProblem(file);
    if (refusal) {
      setProblem(refusal);
      return;
    }
    setProblem(null);
    try {
      field.onChange((await upload.mutateAsync(file)).id);
    } catch (error) {
      setProblem(apiErrorView(error, {}, 'The photo didn’t upload. Try again.').form);
    }
  };

  const picker = (label: string) => (
    <Upload
      accept="image/jpeg,image/png"
      showUploadList={false}
      beforeUpload={(file) => {
        void choose(file);
        return false;
      }}
    >
      <Button
        type="button"
        size="sm"
        variant="secondary"
        leadingIcon="upload"
        disabled={upload.isPending}
      >
        {upload.isPending ? 'Uploading…' : label}
      </Button>
    </Upload>
  );

  return (
    <Flex vertical gap={8}>
      <Flex align="center" gap={16}>
        <HorseAvatar
          coat={coatOf((coat?.value ?? null) as HorseCoat | null)}
          photoUrl={photoUrl}
          size={96}
        />
        <Flex gap={8} wrap>
          {picker(field.value ? 'Replace' : 'Add a photo')}
          {field.value && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={upload.isPending}
              onClick={() => {
                setProblem(null);
                field.onChange(null);
              }}
            >
              Remove
            </Button>
          )}
        </Flex>
      </Flex>
      <span className="type-body-s text-ink-3">JPEG or PNG, up to 10 MB.</span>
      {problem && (
        <span role="alert" className="type-body-s text-bad">
          {problem}
        </span>
      )}
    </Flex>
  );
};
