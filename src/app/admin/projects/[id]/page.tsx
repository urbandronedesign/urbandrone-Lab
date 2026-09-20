import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { hasAdminUser } from '@/lib/admin-user';
import { ProjectEditor } from '@/components/admin/ProjectEditor';

export const metadata: Metadata = { title: 'Atelier — Edit project', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

/** `/admin/projects/new` creates; `/admin/projects/<id>` edits. */
export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await hasAdminUser())) redirect('/admin/setup');
  const { id } = await params;
  return <ProjectEditor id={id} />;
}
