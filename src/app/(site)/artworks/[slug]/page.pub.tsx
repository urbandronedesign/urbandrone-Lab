import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getProjectBySlug, getPublishedProjects } from '@/lib/content';
import { ProjectGallery } from '@/components/site/ProjectGallery';
import { ProjectMeta } from '@/components/site/ProjectMeta';
import { PrevNext } from '@/components/site/PrevNext';
import { resolveDownloads } from '@/lib/github';

export const dynamicParams = false;

// The static export needs at least one path per dynamic route; when the
// section is empty we emit a placeholder that renders the 404 page.
export async function generateStaticParams() {
  const slugs = (await getPublishedProjects('artworks')).map((p) => ({ slug: p.slug }));
  return slugs.length ? slugs : [{ slug: '_' }];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await getProjectBySlug((await params).slug);
  if (!p) return {};
  const cover = p.cover ?? p.media[0];
  return {
    title: p.title,
    description: p.description.split(/\n/)[0].slice(0, 160) || undefined,
    openGraph: cover ? { title: p.title, images: [{ url: cover.url, alt: cover.alt }] } : undefined,
  };
}

export default async function ArtworkPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (slug === '_') notFound();
  const all = await getPublishedProjects('artworks');
  const idx = all.findIndex((p) => p.slug === slug);
  const project = idx >= 0 ? all[idx] : await getProjectBySlug(slug);
  if (!project || project.section !== 'artworks') notFound();
  const downloads = await resolveDownloads(project.links);
  return (
    <>
      <ProjectGallery project={project}>
        <ProjectMeta project={project} downloads={downloads} />
      </ProjectGallery>
      <PrevNext prev={idx > 0 ? all[idx - 1] : null} next={idx >= 0 && idx < all.length - 1 ? all[idx + 1] : null} base="/artworks/" />
    </>
  );
}
