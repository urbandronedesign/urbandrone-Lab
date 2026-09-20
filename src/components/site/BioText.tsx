'use client';

import { useState } from 'react';
import { Prose } from './Prose';
import { cn } from '@/lib/utils';

type Version = { headline: string; text: string };

/** Headline + biography with an EN / FR switch when a French version exists. */
export function BioText({ en, fr, fallback }: { en: Version; fr: Version | null; fallback: string }) {
  const [lang, setLang] = useState<'en' | 'fr'>('en');
  const v = lang === 'fr' && fr ? fr : en;

  return (
    <div lang={lang}>
      <div className="flex items-baseline justify-between gap-6">
        <p className="t-label text-muted-foreground">{lang === 'fr' ? 'Biographie' : 'Biography'}</p>
        {fr && (
          <div role="group" aria-label="Language" className="flex gap-4">
            {(['en', 'fr'] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                aria-pressed={lang === l}
                className={cn(
                  't-label cursor-pointer py-2 transition-colors hover:text-foreground',
                  lang === l ? 'text-foreground underline decoration-1 underline-offset-[8px]' : 'text-muted-foreground'
                )}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        )}
      </div>
      <h1 className="t-h1 mt-3">{v.headline}</h1>
      {v.text ? <Prose text={v.text} className="t-lead mt-8 max-w-[62ch] text-foreground/90" /> : <p className="t-lead mt-8 text-muted-foreground">{fallback}</p>}
    </div>
  );
}
