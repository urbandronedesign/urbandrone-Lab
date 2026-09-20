import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { hasAdminUser } from '@/lib/admin-user';
import { getSite } from '@/lib/site';
import { SiteForm } from '@/components/admin/SiteForm';

export const metadata: Metadata = { title: 'Site information', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function SitePage() {
  if (!(await hasAdminUser())) redirect('/admin/setup');
  return <SiteForm site={await getSite()} />;
}
