'use client';

import { useEffect } from 'react';

/** Registers public/sw.js on the deployed (static) site only. */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* caching is a nicety; the site works without it */
    });
  }, []);
  return null;
}
