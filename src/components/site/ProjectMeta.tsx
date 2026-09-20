import { ExternalLink } from 'lucide-react';
import type { Project } from '@/lib/types';
import { Prose } from './Prose';

function fmtDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

/** Title, description and the facts column for a project page. */
export function ProjectMeta({ project }: { project: Project }) {
  const tokens = project.tokens.filter((t) => !t.hidden);
  const first = tokens[0];
  const minted = tokens.map((t) => t.mintedAt).filter(Boolean).sort();
  const editions = tokens.reduce((n, t) => n + (t.supply || 0), 0);
  const collectionUrl = project.contract && first?.collectionPath ? `https://objkt.com/collections/${first.collectionPath}` : null;

  return (
    <section className="gutter mx-auto grid w-full max-w-[1600px] gap-10 pt-12 pb-16 md:grid-cols-12 md:pt-20 md:pb-24">
      <div className="md:col-span-7 xl:col-span-6">
        <p className="t-label text-muted-foreground">{project.category}</p>
        <h1 className="t-h1 mt-3">{project.title}</h1>
        {project.description && (
          <div className="mt-8 max-w-[65ch]">
            <Prose text={project.description} className="t-lead text-foreground/90" />
          </div>
        )}
      </div>

      <aside className="md:col-span-4 md:col-start-9 xl:col-span-3 xl:col-start-10">
        <dl className="divide-y divide-border border-y border-border">
          <Row k="Year" v={String(project.year)} />
          {project.tags.length > 0 && <Row k="Tags" v={project.tags.join(', ')} />}
          {first?.collectionName && <Row k="Collection" v={first.collectionName} />}
          {tokens.length > 0 && <Row k="Works" v={String(tokens.length)} />}
          {editions > 0 && <Row k="Editions" v={String(editions)} />}
          {minted.length > 0 && <Row k="Minted" v={minted.length > 1 && fmtDate(minted[0]) !== fmtDate(minted[minted.length - 1]) ? `${fmtDate(minted[0])} – ${fmtDate(minted[minted.length - 1])}` : fmtDate(minted[0])!} />}
          {tokens.length > 0 && <Row k="Chain" v="Tezos" />}
          {project.credits && <Row k="Credits" v={project.credits} />}
        </dl>
        {(collectionUrl || project.links.length > 0) && (
          <ul className="mt-6 space-y-2">
            {collectionUrl && <LinkRow href={collectionUrl} label="Collection on objkt" />}
            {project.links.map((l) => (
              <LinkRow key={l.url} href={l.url} label={l.label} />
            ))}
          </ul>
        )}
      </aside>
    </section>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="grid grid-cols-[6rem_minmax(0,1fr)] gap-4 py-3">
      <dt className="t-label pt-0.5 text-muted-foreground">{k}</dt>
      <dd className="t-caption min-w-0 [overflow-wrap:anywhere]">{v}</dd>
    </div>
  );
}

function LinkRow({ href, label }: { href: string; label: string }) {
  return (
    <li>
      <a href={href} target="_blank" rel="noopener noreferrer" className="t-caption inline-flex cursor-pointer items-center gap-1.5 underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground">
        {label} <ExternalLink className="h-3 w-3" strokeWidth={1.5} />
      </a>
    </li>
  );
}
