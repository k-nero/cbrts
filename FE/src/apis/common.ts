import apiV1Instance from '@/config/axios';

/**
 * File storage used by the form kit's FileField. The backend endpoints arrive with document
 * uploads (Flow 2); upload returns the stored path, relative to environment.STORAGE_URL.
 */
export const uploadFileApi = (file: FormData) =>
  apiV1Instance.post<string>('/files/upload', file, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const deleteFileApi = (fileName: string) =>
  apiV1Instance.post<void>('/files/delete', { file_name: fileName });
