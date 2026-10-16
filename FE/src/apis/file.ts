import client from '@/config/axios';

export interface FileUploadResponse {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  uploadedAt: string;
}

/**
 * File storage API (POST /api/v1/files, GET /api/v1/files/{id}/content).
 * Files are chosen with a file picker and uploaded here; the returned id is attached to a record.
 * Content needs the access token, so it is always fetched as a blob, never linked directly.
 */
export const fileApi = {
  upload: async (file: File): Promise<FileUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await client.post<FileUploadResponse>('/files', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  getBlob: async (fileId: string): Promise<Blob> =>
    (
      await client.get<Blob>(`/files/${fileId}/content`, {
        params: { inline: true },
        responseType: 'blob',
      })
    ).data,

  /**
   * Opens the file in a new tab. The tab is opened synchronously, inside the click, because popup
   * blockers drop a window.open that comes after an await; it is pointed at the file once the
   * authenticated download finishes, and closed again if the download fails.
   */
  viewFile: async (fileId: string): Promise<void> => {
    const win = window.open('', '_blank');
    try {
      const blobUrl = URL.createObjectURL(await fileApi.getBlob(fileId));
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
};
