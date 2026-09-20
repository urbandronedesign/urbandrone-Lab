'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { useSite } from '@/components/SiteProvider';

const KEY = 'consent:analytics'; // 'granted' | 'denied'

type Consent = 'granted' | 'denied' | 'unset';

const listeners = new Set<() => void>();
function readConsent(): Consent {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'granted' || v === 'denied' ? v : 'unset';
  } catch {
    return 'unset';
  }
}
function writeConsent(v: Consent) {
  try {
    if (v === 'unset') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, v);
  } catch {
    /* private mode */
  }
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Lets the footer reopen the choice. */
export function resetAnalyticsConsent() {
  writeConsent('unset');
}

let loaded = false;
function loadGtag(id: string) {
  if (loaded) return;
  loaded = true;
  const w = window as unknown as { dataLayer: unknown[]; gtag: (...a: unknown[]) => void };
  w.dataLayer = w.dataLayer || [];
  w.gtag = function () {
    // eslint-disable-next-line prefer-rest-params
    w.dataLayer.push(arguments);
  };
  w.gtag('js', new Date());
  w.gtag('config', id, { anonymize_ip: true });
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(s);
}

/**
 * Google Analytics 4, loaded only after the visitor accepts (GDPR / CNIL).
 * Shows a minimal consent bar until a choice is made; nothing is loaded or
 * stored before that. Renders nothing when no Measurement ID is configured.
 */
export function Analytics() {
  const site = useSite();
  const id = site.gaMeasurementId;
  const consent = useSyncExternalStore(subscribe, readConsent, () => 'unset' as Consent);
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (id && consent === 'granted') loadGtag(id);
  }, [id, consent]);

  if (!id || !mounted || consent !== 'unset' || dismissed) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      aria-live="polite"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85"
    >
      <div className="gutter mx-auto flex w-full max-w-[1600px] flex-col gap-4 py-4 md:flex-row md:items-center md:justify-between">
        <p className="t-caption max-w-[60ch] text-muted-foreground">
          This site can use Google Analytics to count visits (anonymised IP, no advertising). Nothing is stored until you accept; you can change your mind in the footer.
        </p>
        <div className="flex shrink-0 gap-3">
          <button
            type="button"
            onClick={() => {
              writeConsent('denied');
              setDismissed(true);
            }}
            className="t-label h-11 cursor-pointer px-4 text-muted-foreground transition-colors hover:text-foreground"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={() => {
              writeConsent('granted');
              setDismissed(true);
            }}
            className="t-label h-11 cursor-pointer bg-foreground px-5 text-background transition-opacity hover:opacity-90"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
