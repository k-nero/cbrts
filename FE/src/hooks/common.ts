import { useMutation } from '@tanstack/react-query';

import { deleteFileApi, uploadFileApi } from '@/apis/common';

export const useUploadFile = () => useMutation({ mutationFn: uploadFileApi });

export const useDeleteFile = () => useMutation({ mutationFn: deleteFileApi });
