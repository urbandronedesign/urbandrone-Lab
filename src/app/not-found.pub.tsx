import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';

export const metadata: Metadata = { title: 'Not found', robots: { index: false } };

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="content" className="gutter mx-auto flex w-full max-w-[1600px] flex-1 flex-col justify-center py-24">
        <p className="t-label text-muted-foreground">404</p>
        <h1 className="t-display mt-4">Not found</h1>
        <p className="t-lead mt-6 text-muted-foreground">This page does not exist or has moved.</p>
        <Link href="/" className="t-label mt-10 inline-block cursor-pointer underline decoration-border underline-offset-[6px] hover:decoration-foreground">
          Back to the start
        </Link>
      </main>
      <SiteFooter />
    </>
  );
}
