import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { hasAdminUser } from '@/lib/admin-user';
import { LoginForm } from '@/components/admin/LoginForm';

export const metadata: Metadata = {
  title: 'Atelier — Sign in',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  if (!(await hasAdminUser())) redirect('/admin/setup');
  const { next } = await searchParams;
  // Only allow redirecting back inside the admin area (no open redirect).
  const target = next && next.startsWith('/admin') ? next : '/admin';
  return <LoginForm next={target} />;
}
