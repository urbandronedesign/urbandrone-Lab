'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { useSite } from '@/components/SiteProvider';

/** Centered card layout shared by the sign-in, setup and reset pages. */
export function AuthShell({
  kicker = 'Admin',
  children,
  backHref = '/',
  backLabel = 'Back to gallery',
}: {
  kicker?: string;
  children: React.ReactNode;
  backHref?: string;
  backLabel?: string;
}) {
  const site = useSite();
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-xs space-y-6">
          <div className="flex items-center gap-3">
            <Logo className="h-7 w-7" />
            <h1 className="font-display text-3xl italic">{site.name}</h1>
            <span className="tracking-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">· {kicker}</span>
          </div>
          {children}
          <Link href={backHref} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition hover:text-foreground">
            <ArrowLeft className="h-3 w-3" />
            {backLabel}
          </Link>
        </div>
      </main>
    </div>
  );
}
