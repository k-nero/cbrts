import { scan } from 'react-scan';

/* The dev-only first entry module (rsbuild.config.ts): it must run before react-dom loads. */
scan({ enabled: true });
