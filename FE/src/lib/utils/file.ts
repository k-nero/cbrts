/** The extension without the dot, or '' when there is none ("dossier.pdf" → "pdf"). */
export const getFileType = (name: string) => {
  const lastDotIndex = name.lastIndexOf('.');
  return lastDotIndex === -1 || lastDotIndex === name.length - 1
    ? ''
    : name.slice(lastDotIndex + 1);
};
