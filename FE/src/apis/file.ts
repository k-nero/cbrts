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

  /**
   * Opens the file in a new tab. The tab is opened synchronously, inside the click, because popup
   * blockers drop a window.open that comes after an await; it is pointed at the file once the
   * authenticated download finishes, and closed again if the download fails.
   */
  viewFile: async (fileId: string): Promise<void> => {
    const win = window.open('', '_blank');
    try {
      const res = await client.get<Blob>(`/files/${fileId}/content`, {
        params: { inline: true },
        responseType: 'blob',
      });
      const blobUrl = URL.createObjectURL(res.data);
      if (win) {
        win.location.href = blobUrl;
      } else {
        window.location.assign(blobUrl);
      }
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    } catch (error) {
      win?.close();
      throw error;
    }
  },

  getContentUrl: (fileId: string, inline = true): string =>
    `/api/v1/files/${fileId}/content?inline=${inline}`,
};
