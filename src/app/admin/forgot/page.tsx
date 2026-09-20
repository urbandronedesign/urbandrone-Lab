import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { hasAdminUser } from '@/lib/admin-user';
import { ForgotForm } from '@/components/admin/ForgotForm';

export const metadata: Metadata = { title: 'Atelier — Reset password', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function ForgotPage() {
  if (!(await hasAdminUser())) redirect('/admin/setup');
  return <ForgotForm />;
}
