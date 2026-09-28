/** Build-time settings. Rsbuild exposes PUBLIC_* variables from .env files to the client. */
const environment = {
  NODE_ENV: import.meta.env.MODE,
  API_URL: '/api/v1',
  // Where uploaded files are served from; paths returned by /files/upload are relative to it.
  STORAGE_URL: import.meta.env.PUBLIC_STORAGE_URL ?? '/api/v1/files',
};

export default environment;
