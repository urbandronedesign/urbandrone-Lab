import type { Metadata } from 'next';
import { getSite } from '@/lib/site';
import { pageMeta } from '@/lib/seo';
import { getPublishedProjects } from '@/lib/content';
import { ArtworkGrid } from '@/components/site/ArtworkGrid';
import { PageIntro } from '@/components/site/PageIntro';

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSite();
  return pageMeta(site, '/artworks/', { title: 'Artworks — Architecture fiction on Tezos', description: `Collections, series and single works by ${site.author || site.name} — architecture fiction and generative art minted on Tezos.` });
}

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
