/** The extension without the dot, or '' when there is none ("dossier.pdf" → "pdf"). */
export const getFileType = (name: string) => {
  const lastDotIndex = name.lastIndexOf('.');
  return lastDotIndex === -1 || lastDotIndex === name.length - 1
    ? ''
    : name.slice(lastDotIndex + 1);
};

/** "412 KB", "3.4 MB". */
export const fileSize = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
