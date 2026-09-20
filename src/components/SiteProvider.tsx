'use client';

import { createContext, useContext } from 'react';
import { DEFAULT_SITE, type SiteInfo } from '@/lib/site-types';

const SiteContext = createContext<SiteInfo>(DEFAULT_SITE);

/** Makes the site info (read server-side) available to client components. */
export function SiteProvider({ site, children }: { site: SiteInfo; children: React.ReactNode }) {
  return <SiteContext.Provider value={site}>{children}</SiteContext.Provider>;
}

export function useSite(): SiteInfo {
  return useContext(SiteContext);
}
