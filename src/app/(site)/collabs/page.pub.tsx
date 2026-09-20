import type { Metadata } from 'next';
import { getSite } from '@/lib/site';
import { pageMeta } from '@/lib/seo';
import { getPublishedProjects } from '@/lib/content';
import { ArtworkGrid } from '@/components/site/ArtworkGrid';
import { PageIntro } from '@/components/site/PageIntro';

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSite();
  return pageMeta(site, '/collabs/', { title: 'Collabs — Collaborative works', description: `Collaborations with other artists, studios and institutions — shared works, installations and commissions signed with ${site.author || site.name} / ${site.name}.` });
}

export default async function CollabsPage() {
  const projects = await getPublishedProjects('collabs');
  return (
    <>
      <PageIntro label={`${projects.length} collaborations`} title="Collabs" lead="Works made with other artists, studios and institutions." />
      <section className="gutter mx-auto w-full max-w-[1600px] pb-16 md:pb-24">
        {projects.length === 0 ? <p className="t-lead text-muted-foreground">Nothing published yet.</p> : <ArtworkGrid projects={projects} base="/collabs/" />}
      </section>
    </>
  );
}
