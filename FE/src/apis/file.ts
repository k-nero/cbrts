import client from '@/config/axios';

export interface FileUploadResponse {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  uploadedAt: string;
}

/**
 * File storage API (AGENTS.md / PR #79).
 * Files are chosen with a file picker and uploaded here; the returned id is attached to documents.
 * Viewing files uses authenticated blob retrieval to prevent 401 Unauthorized errors on plain links.
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

  viewFile: async (fileId: string): Promise<void> => {
    const res = await client.get<Blob>(`/files/${fileId}/content`, {
      params: { inline: true },
      responseType: 'blob',
    });
    const blobUrl = URL.createObjectURL(res.data);
    const win = window.open(blobUrl, '_blank');
    if (win) {
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    }
  },

  getContentUrl: (fileId: string, inline = true): string =>
    `/api/v1/files/${fileId}/content?inline=${inline}`,
};
