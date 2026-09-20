import type { Metadata } from 'next';
import { AdminView } from '@/components/admin/AdminView';

export const metadata: Metadata = {
  title: 'Atelier — Admin',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default function AdminPage() {
  return <AdminView />;
}
