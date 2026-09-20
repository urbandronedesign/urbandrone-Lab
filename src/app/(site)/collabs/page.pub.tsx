import type { Metadata } from 'next';
import { getPublishedProjects } from '@/lib/content';
import { ArtworkGrid } from '@/components/site/ArtworkGrid';
import { PageIntro } from '@/components/site/PageIntro';

export const metadata: Metadata = { title: 'Collabs' };

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
