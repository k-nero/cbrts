/*
 * react-scan has to hook into React before react-dom loads, so in development it is imported
 * first and the app is rendered after it. Production builds drop the branch and never bundle it.
 */
if (import.meta.env.DEV) {
  const { scan } = await import('react-scan');
  scan({ enabled: true });
}

await import('./render');

export {};
