import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getAdmin } from '@/lib/admin-user';
import { mailConfigured } from '@/lib/mailer';
import { AccountForm } from '@/components/admin/AccountForm';

export const metadata: Metadata = { title: 'Atelier — Account', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

// Reaching this page already requires a session (proxy.ts)
export default async function AccountPage() {
  const user = await getAdmin();
  if (!user) redirect('/admin/setup');
  return <AccountForm user={user} mailConfigured={mailConfigured()} />;
}
