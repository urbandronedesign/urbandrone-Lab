'use client';

import { useEffect } from 'react';
import { useSite } from '@/components/SiteProvider';

/**
 * GoatCounter — privacy-friendly, cookie-less page counting. It stores no
 * personal data and sets no cookies, so no consent banner is required under
 * GDPR. Renders nothing when no site code is configured.
 */
export function Analytics() {
  const site = useSite();
  const code = site.goatcounterCode;

  useEffect(() => {
    if (!code || document.querySelector('script[data-goatcounter]')) return;
    const s = document.createElement('script');
    s.async = true;
    s.src = '//gc.zgo.at/count.js';
    s.dataset.goatcounter = `https://${code}.goatcounter.com/count`;
    document.head.appendChild(s);
  }, [code]);

  return null;
}
