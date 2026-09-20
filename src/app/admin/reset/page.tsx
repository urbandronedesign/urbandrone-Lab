import type { Metadata } from 'next';
import { peekResetToken } from '@/lib/admin-user';
import { ResetForm } from '@/components/admin/ResetForm';

export const metadata: Metadata = { title: 'Atelier — Reset password', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = '' } = await searchParams;
  const info = token ? await peekResetToken(token) : null;
  return <ResetForm token={token} valid={!!info} username={info?.username ?? null} />;
}
