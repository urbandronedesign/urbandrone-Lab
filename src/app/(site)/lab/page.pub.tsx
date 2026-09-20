import type { Metadata } from 'next';
import { getPublishedProjects } from '@/lib/content';
import { LabList } from '@/components/site/LabList';
import { PageIntro } from '@/components/site/PageIntro';

export const metadata: Metadata = { title: 'Lab' };

export default async function LabPage() {
  const projects = await getPublishedProjects('lab');
  return (
    <>
      <PageIntro label={`${projects.length} entries`} title="Lab" lead="Experiments, research and tools — work in progress and notes from the studio." />
      <section className="gutter mx-auto w-full max-w-[1600px] pb-16 md:pb-24">
        {projects.length === 0 ? <p className="t-lead text-muted-foreground">Nothing published yet.</p> : <LabList projects={projects} />}
      </section>
    </>
  );
}
