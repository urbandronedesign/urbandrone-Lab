import type { Metadata } from 'next';
import { getPublishedProjects } from '@/lib/content';
import { ArtworkGrid } from '@/components/site/ArtworkGrid';
import { PageIntro } from '@/components/site/PageIntro';

export const metadata: Metadata = { title: 'Artworks' };

export default async function ArtworksPage() {
  const projects = await getPublishedProjects('artworks');
  return (
    <>
      <PageIntro label={`${projects.length} collections`} title="Artworks" />
      <section className="gutter mx-auto w-full max-w-[1600px] pb-16 md:pb-24">
        {projects.length === 0 ? <p className="t-lead text-muted-foreground">Nothing published yet.</p> : <ArtworkGrid projects={projects} />}
      </section>
    </>
  );
}
