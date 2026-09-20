import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { hasAdminUser } from '@/lib/admin-user';
import { SetupForm } from '@/components/admin/SetupForm';

export const metadata: Metadata = { title: 'Atelier — Create admin account', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function SetupPage() {
  if (await hasAdminUser()) redirect('/admin/login');
  return <SetupForm />;
}
