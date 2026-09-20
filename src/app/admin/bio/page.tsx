import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { hasAdminUser } from '@/lib/admin-user';
import { getBio } from '@/lib/bio';
import { BioForm } from '@/components/admin/BioForm';

export const metadata: Metadata = { title: 'Biography', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function BioAdminPage() {
  if (!(await hasAdminUser())) redirect('/admin/setup');
  return <BioForm bio={await getBio()} />;
}
