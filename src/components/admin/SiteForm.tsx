'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Plus, Trash2 } from 'lucide-react';
import type { SiteInfo, SiteLink } from '@/lib/site-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Logo } from '@/components/Logo';

type Draft = Omit<SiteInfo, 'keywords'> & { keywords: string };

function toDraft(s: SiteInfo): Draft {
  return { ...s, keywords: s.keywords.join(', ') };
}

export function SiteForm({ site }: { site: SiteInfo }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(() => toDraft(site));
  const [saved, setSaved] = useState(() => JSON.stringify(toDraft(site)));
  const [pending, setPending] = useState(false);
  const dirty = JSON.stringify(draft) !== saved;

  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const setLink = (i: number, patch: Partial<SiteLink>) =>
    setDraft((d) => ({ ...d, links: d.links.map((l, j) => (j === i ? { ...l, ...patch } : l)) }));

  const onSave = async () => {
    setPending(true);
    try {
      const res = await fetch('/api/site', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...draft,
          keywords: draft.keywords.split(',').map((k) => k.trim()).filter(Boolean),
          links: draft.links.filter((l) => l.label.trim() && l.url.trim()),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? 'Save failed');
      const next = toDraft(body.site as SiteInfo);
      setDraft(next);
      setSaved(JSON.stringify(next));
      toast.success('Site info saved', { description: 'Commit and push to publish it.' });
      router.refresh();
    } catch (e: any) {
      toast.error('Save failed', { description: e?.message });
    }
    setPending(false);
  };

  const title = draft.tagline ? `${draft.name} — ${draft.tagline}` : draft.name;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-[1400px] items-center justify-between gap-4 px-6 md:px-10">
          <div className="flex items-center gap-4">
            <Link href="/admin" aria-label="Admin home">
              <Logo className="h-6 w-6" />
            </Link>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin">
                <ArrowLeft className="mr-2 h-3.5 w-3.5" /> Projects
              </Link>
            </Button>
            <div>
              <p className="font-display text-xl italic leading-tight">Site information</p>
              <p className="tracking-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                name · seo · footer · links{dirty && <span className="ml-2 text-foreground">· unsaved changes</span>}
              </p>
            </div>
          </div>
          <Button size="sm" onClick={onSave} disabled={pending || !dirty}>
            {pending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
            Save
          </Button>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-[1400px] flex-1 grid-cols-1 gap-10 px-6 py-8 md:px-10 lg:grid-cols-12">
        {/* Fields */}
        <div className="space-y-8 lg:col-span-7">
          <section className="space-y-5">
            <h2 className="font-display text-lg italic">Identity</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="s-name" className="text-xs uppercase tracking-[0.2em]">Site name</Label>
                <Input id="s-name" value={draft.name} onChange={(e) => set('name', e.target.value)} className="font-display text-lg" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="s-tagline" className="text-xs uppercase tracking-[0.2em]">Tagline</Label>
                <Input id="s-tagline" value={draft.tagline} onChange={(e) => set('tagline', e.target.value)} placeholder="Digital architect since 2006" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="s-desc" className="text-xs uppercase tracking-[0.2em]">Description</Label>
              <Textarea id="s-desc" value={draft.description} onChange={(e) => set('description', e.target.value)} rows={3} className="resize-y" placeholder="One or two sentences. Shown by search engines and when the link is shared." />
              <p className="text-[10px] text-muted-foreground tracking-mono">{draft.description.length} chars · 150–160 is ideal for search results</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="s-keywords" className="text-xs uppercase tracking-[0.2em]">Keywords</Label>
              <Input id="s-keywords" value={draft.keywords} onChange={(e) => set('keywords', e.target.value)} placeholder="architecture, generative art, tezos, nft" className="tracking-mono text-xs" />
              <p className="text-[10px] text-muted-foreground tracking-mono">Comma-separated.</p>
            </div>
          </section>

          <section className="space-y-5">
            <h2 className="font-display text-lg italic">People &amp; contact</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="s-author" className="text-xs uppercase tracking-[0.2em]">Author</Label>
                <Input id="s-author" value={draft.author} onChange={(e) => set('author', e.target.value)} placeholder="Your name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="s-copy" className="text-xs uppercase tracking-[0.2em]">Copyright holder</Label>
                <Input id="s-copy" value={draft.copyright} onChange={(e) => set('copyright', e.target.value)} placeholder={draft.name} />
                <p className="text-[10px] text-muted-foreground tracking-mono">Footer: © year · holder. Empty = site name.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="s-email" className="text-xs uppercase tracking-[0.2em]">Contact email</Label>
                <Input id="s-email" type="email" value={draft.email} onChange={(e) => set('email', e.target.value)} placeholder="hello@urbandrone.xyz" />
                <p className="text-[10px] text-muted-foreground tracking-mono">Adds a “Contact” link in the footer. Empty = no link.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="s-url" className="text-xs uppercase tracking-[0.2em]">Site URL</Label>
                <Input id="s-url" value={draft.url} onChange={(e) => set('url', e.target.value)} placeholder="https://urbandrone.xyz" className="tracking-mono text-xs" />
                <p className="text-[10px] text-muted-foreground tracking-mono">Used for share previews (Open Graph).</p>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-lg italic">Footer links</h2>
              <Button type="button" size="sm" variant="outline" onClick={() => set('links', [...draft.links, { label: '', url: '' }])}>
                <Plus className="mr-2 h-3.5 w-3.5" /> Add link
              </Button>
            </div>
            {draft.links.length === 0 ? (
              <p className="rounded-md border border-dashed border-border p-5 text-center text-xs text-muted-foreground">
                No links yet — objkt profile, X, Instagram, linktree…
              </p>
            ) : (
              <div className="space-y-2">
                {draft.links.map((l, i) => (
                  <div key={i} className="grid grid-cols-[1fr_2fr_auto] gap-2">
                    <Input value={l.label} onChange={(e) => setLink(i, { label: e.target.value })} placeholder="objkt" />
                    <Input value={l.url} onChange={(e) => setLink(i, { url: e.target.value })} placeholder="https://objkt.com/@urbandrone" className="tracking-mono text-xs" />
                    <Button type="button" size="sm" variant="ghost" className="h-9 px-2 text-muted-foreground hover:text-destructive" onClick={() => set('links', draft.links.filter((_, j) => j !== i))} aria-label="Remove link">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Live previews */}
        <aside className="space-y-6 lg:col-span-5">
          <div className="space-y-2">
            <p className="tracking-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Browser tab</p>
            <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
              <Logo className="h-4 w-4 shrink-0" />
              <span className="truncate">{title}</span>
            </div>
          </div>

          <div className="space-y-2">
            <p className="tracking-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Search result</p>
            <div className="rounded-md border border-border p-4">
              <p className="text-[11px] text-muted-foreground tracking-mono">{draft.url || 'https://…'}</p>
              <p className="mt-1 text-base text-[#1a0dab] dark:text-blue-400">{title}</p>
              <p className="mt-1 text-sm text-foreground/80">{draft.description || 'Your description will appear here.'}</p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="tracking-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Share card</p>
            <div className="overflow-hidden rounded-md border border-border">
              <div className="flex aspect-[1.91/1] items-center justify-center bg-[#050505]">
                <Logo className="h-1/3 w-1/3 text-white" />
              </div>
              <div className="p-3">
                <p className="truncate text-sm font-medium">{title}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{draft.description}</p>
                <p className="mt-1 text-[10px] uppercase tracking-mono text-muted-foreground">{draft.url.replace(/^https?:\/\//, '') || 'urbandrone.xyz'}</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="tracking-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Footer</p>
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-2 tracking-mono">
                <Logo className="h-3.5 w-3.5 text-foreground" /> © {new Date().getFullYear()} · <span className="font-display italic text-foreground/80">{draft.copyright || draft.name}</span>
              </span>
              <span className="flex flex-wrap gap-3">
                <span>Index</span>
                {draft.links.filter((l) => l.label).map((l, i) => <span key={i}>{l.label}</span>)}
                {draft.email && <span>Contact</span>}
              </span>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
