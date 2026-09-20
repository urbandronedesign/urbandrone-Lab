import { Download, ExternalLink } from 'lucide-react';
import { formatSize, type ReleaseInfo } from '@/lib/github';

/** Direct links to the newest release's installers, one per platform. */
export function Downloads({ releases }: { releases: ReleaseInfo[] }) {
  if (releases.length === 0) return null;
  return (
    <div className="space-y-8">
      {releases.map((r) => (
        <section key={`${r.owner}/${r.repo}`} aria-labelledby={`dl-${r.repo}`}>
          <div className="flex items-baseline justify-between gap-4">
            <h2 id={`dl-${r.repo}`} className="t-label text-muted-foreground">
              Download
            </h2>
            <span className="t-label text-muted-foreground">
              {r.version} · {new Date(r.publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>
          {r.assets.length > 0 ? (
            <ul className="mt-3 divide-y divide-border border-y border-border">
              {r.assets.map((a) => (
                <li key={a.url}>
                  <a
                    href={a.url}
                    download
                    className="group flex min-h-12 cursor-pointer items-center justify-between gap-4 py-3 transition-colors hover:text-foreground"
                    title={a.name}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <Download className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" strokeWidth={1.5} />
                      <span className="t-caption truncate">{a.label}</span>
                    </span>
                    <span className="t-label shrink-0 text-muted-foreground">{formatSize(a.size)}</span>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="t-caption mt-3 text-muted-foreground">No installers attached to the latest release.</p>
          )}
          <a href={r.releasesUrl} target="_blank" rel="noopener noreferrer" className="t-caption mt-3 inline-flex cursor-pointer items-center gap-1.5 text-muted-foreground underline decoration-border underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground">
            All releases &amp; notes <ExternalLink className="h-3 w-3" strokeWidth={1.5} />
          </a>
        </section>
      ))}
    </div>
  );
}
