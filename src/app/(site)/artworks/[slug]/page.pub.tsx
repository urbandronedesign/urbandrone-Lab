import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getProjectBySlug, getPublishedProjects } from '@/lib/content';
import { ProjectGallery } from '@/components/site/ProjectGallery';
import { ProjectMeta } from '@/components/site/ProjectMeta';
import { PrevNext } from '@/components/site/PrevNext';
import { resolveDownloads } from '@/lib/github';
import { getSite } from '@/lib/site';
import { JsonLd } from '@/components/site/JsonLd';
import { breadcrumbJsonLd, graph, pageMeta, projectDescription, projectJsonLd } from '@/lib/seo';

export const dynamicParams = false;

// The static export needs at least one path per dynamic route; when the
// section is empty we emit a placeholder that renders the 404 page.
export async function generateStaticParams() {
  const slugs = (await getPublishedProjects('artworks')).map((p) => ({ slug: p.slug }));
  return slugs.length ? slugs : [{ slug: '_' }];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const [p, site] = await Promise.all([getProjectBySlug((await params).slug), getSite()]);
  if (!p) return {};
  const cover = p.cover ?? p.media[0];
  return pageMeta(site, `/artworks/${p.slug}/`, { title: p.title, description: projectDescription(p, site), image: cover?.url, type: 'article' });
}

export default async function ArtworkPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (slug === '_') notFound();
  const all = await getPublishedProjects('artworks');
  const idx = all.findIndex((p) => p.slug === slug);
  const project = idx >= 0 ? all[idx] : await getProjectBySlug(slug);
  if (!project || project.section !== 'artworks') notFound();
  const [downloads, site] = await Promise.all([resolveDownloads(project.links), getSite()]);
  const jsonLd = graph(projectJsonLd(project, site, downloads), breadcrumbJsonLd(site, [{ name: site.name, path: '/' }, { name: 'Artworks', path: '/artworks/' }, { name: project.title, path: `/artworks/${project.slug}/` }]));
  return (
    <>
      <JsonLd data={jsonLd} />
      <ProjectGallery project={project}>
        <ProjectMeta project={project} downloads={downloads} />
      </ProjectGallery>
      <PrevNext prev={idx > 0 ? all[idx - 1] : null} next={idx >= 0 && idx < all.length - 1 ? all[idx + 1] : null} base="/artworks/" />
    </>
  );
}
