import client from '@/config/axios';

export interface FileUploadResponse {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
}

/**
 * File storage API (AGENTS.md / PR #79).
 * Files are chosen with a file picker and uploaded here; the returned id is attached to documents.
 */
export const fileApi = {
  upload: async (file: File): Promise<FileUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await client.post<FileUploadResponse>('/files', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },

  getContentUrl: (fileId: string, inline = true): string =>
    `/api/v1/files/${fileId}/content?inline=${inline}`,
};
