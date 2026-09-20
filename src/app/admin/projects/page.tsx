import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { hasAdminUser } from '@/lib/admin-user';
import { AdminView } from '@/components/admin/AdminView';

export const metadata: Metadata = { title: 'Projects', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function ProjectsAdminPage() {
  if (!(await hasAdminUser())) redirect('/admin/setup');
  return <AdminView />;
}
