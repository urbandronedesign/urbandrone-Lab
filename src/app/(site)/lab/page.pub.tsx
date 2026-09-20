import type { Metadata } from 'next';
import { getSite } from '@/lib/site';
import { pageMeta } from '@/lib/seo';
import { getPublishedProjects } from '@/lib/content';
import { LabGroups } from '@/components/site/LabList';
import { PageIntro } from '@/components/site/PageIntro';

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSite();
  return pageMeta(site, '/lab/', { title: 'Lab', description: `Tools, course manuals and experiments from the studio: software, teaching material and research.` });
}

export default async function LabPage() {
  const projects = await getPublishedProjects('lab');
  return (
    <>
      <PageIntro label={`${projects.length} entries`} title="Lab" lead="Experiments, research and tools — work in progress and notes from the studio." />
      <section className="gutter mx-auto w-full max-w-[1600px] pb-16 md:pb-24">
        {projects.length === 0 ? <p className="t-lead text-muted-foreground">Nothing published yet.</p> : <LabGroups projects={projects} />}
      </section>
    </>
  );
}
