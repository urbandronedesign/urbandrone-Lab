'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowDown, ArrowLeft, ArrowUp, Loader2, Plus, Trash2, Upload, X } from 'lucide-react';
import type { BioInfo, CvEntry } from '@/lib/bio';
import { CV_GROUPS } from '@/lib/bio';
import type { Image as ImageInfo } from '@/lib/types';
import { useUploadImage } from '@/lib/queries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Logo } from '@/components/Logo';

type Draft = { headline: string; text: string; headlineFr: string; textFr: string; portrait: ImageInfo | null; cv: CvEntry[] };

const snap = (d: Draft) => JSON.stringify({ ...d, portrait: d.portrait?.id ?? null });

export function BioForm({ bio }: { bio: BioInfo }) {
  const router = useRouter();
  const upload = useUploadImage();
  const fileRef = useRef<HTMLInputElement>(null);
  const initial: Draft = { headline: bio.headline, text: bio.text, headlineFr: bio.headlineFr, textFr: bio.textFr, portrait: bio.portrait, cv: bio.cv };
  const [draft, setDraft] = useState<Draft>(initial);
  const [saved, setSaved] = useState(() => snap(initial));
  const [pending, setPending] = useState(false);
  const dirty = snap(draft) !== saved;

  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const setEntry = (i: number, patch: Partial<CvEntry>) => set('cv', draft.cv.map((e, j) => (j === i ? { ...e, ...patch } : e)));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= draft.cv.length) return;
    const next = [...draft.cv];
    [next[i], next[j]] = [next[j], next[i]];
    set('cv', next);
  };

  const onPortrait = async (file: File | undefined) => {
    if (!file) return;
    try {
      const r = await upload.mutateAsync(file);
      set('portrait', { id: r.image.id, url: r.image.url, width: r.image.width, height: r.image.height, alt: r.image.alt });
    } catch (e: any) {
      toast.error('Upload failed', { description: e?.message });
    }
  };

  const onSave = async () => {
    setPending(true);
    try {
      const res = await fetch('/api/bio', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ headline: draft.headline, text: draft.text, headlineFr: draft.headlineFr, textFr: draft.textFr, portraitId: draft.portrait?.id ?? null, cv: draft.cv.filter((e) => e.text.trim()) }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? 'Save failed');
      const b = body.bio as BioInfo;
      const next: Draft = { headline: b.headline, text: b.text, headlineFr: b.headlineFr, textFr: b.textFr, portrait: b.portrait, cv: b.cv };
      setDraft(next);
      setSaved(snap(next));
      toast.success('Bio saved', { description: 'Commit and push to publish it.' });
      router.refresh();
    } catch (e: any) {
      toast.error('Save failed', { description: e?.message });
    }
    setPending(false);
  };

  const groups = Array.from(new Set([...CV_GROUPS, ...draft.cv.map((e) => e.group).filter(Boolean)]));

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-[1400px] items-center justify-between gap-4 px-6 md:px-10">
          <div className="flex items-center gap-4">
            <Link href="/admin" aria-label="Admin home">
              <Logo className="h-6 w-6" />
            </Link>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/projects">
                <ArrowLeft className="mr-2 h-3.5 w-3.5" /> Projects
              </Link>
            </Button>
            <div>
              <p className="font-display text-xl italic leading-tight">Biography</p>
              <p className="tracking-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                portrait · text · cv{dirty && <span className="ml-2 text-foreground">· unsaved changes</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/bio/" target="_blank">
                View page
              </Link>
            </Button>
            <Button size="sm" onClick={onSave} disabled={pending || !dirty}>
              {pending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              Save
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-[1400px] flex-1 grid-cols-1 gap-10 px-6 py-8 md:px-10 lg:grid-cols-12">
        {/* Portrait */}
        <section className="space-y-3 lg:col-span-4">
          <p className="text-xs uppercase tracking-[0.2em]">Portrait</p>
          <div
            className="relative aspect-[4/5] overflow-hidden border border-border bg-muted"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              onPortrait(e.dataTransfer.files[0]);
            }}
          >
            {draft.portrait ? (
              <>
                <img src={draft.portrait.url} alt="" className="absolute inset-0 h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => set('portrait', null)}
                  title="Remove portrait"
                  className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </>
            ) : (
              <button type="button" onClick={() => fileRef.current?.click()} className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                {upload.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
                Drop a portrait here or click to upload
                <span className="text-[10px] tracking-mono uppercase tracking-[0.2em]">4:5 works best · JPG · PNG · WEBP</span>
              </button>
            )}
          </div>
          {draft.portrait && (
            <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={upload.isPending}>
              {upload.isPending ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Upload className="mr-2 h-3.5 w-3.5" />}
              Replace portrait
            </Button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              onPortrait(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </section>

        {/* Text */}
        <section className="space-y-6 lg:col-span-8">
          <div className="space-y-2">
            <Label htmlFor="b-headline" className="text-xs uppercase tracking-[0.2em]">
              Headline
            </Label>
            <Input id="b-headline" value={draft.headline} onChange={(e) => set('headline', e.target.value)} placeholder="Digital architect, Nantes — b. 1979" className="font-display text-xl h-11" />
            <p className="text-[10px] text-muted-foreground tracking-mono">One line under “Biography”. Empty = the site tagline.</p>
          </div>
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="b-text" className="text-xs uppercase tracking-[0.2em]">
                Biography
              </Label>
              <span className="tracking-mono text-[10px] text-muted-foreground">{draft.text.length} chars</span>
            </div>
            <Textarea id="b-text" value={draft.text} onChange={(e) => set('text', e.target.value)} className="min-h-[40vh] resize-y text-base leading-relaxed" placeholder="Who you are, what you make, where you come from. Blank lines start new paragraphs; URLs become links." />
          </div>

          <div className="space-y-5 border-t border-border pt-6">
            <div>
              <p className="text-xs uppercase tracking-[0.2em]">Version française</p>
              <p className="text-[10px] text-muted-foreground tracking-mono">Optional. When filled in, the page shows an EN / FR switch.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="b-headline-fr" className="text-xs uppercase tracking-[0.2em]">
                Titre
              </Label>
              <Input id="b-headline-fr" value={draft.headlineFr} onChange={(e) => set('headlineFr', e.target.value)} placeholder="Architecte, fondateur d’Urbandrone" className="font-display text-xl h-11" lang="fr" />
            </div>
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <Label htmlFor="b-text-fr" className="text-xs uppercase tracking-[0.2em]">
                  Biographie
                </Label>
                <span className="tracking-mono text-[10px] text-muted-foreground">{draft.textFr.length} chars</span>
              </div>
              <Textarea id="b-text-fr" value={draft.textFr} onChange={(e) => set('textFr', e.target.value)} className="min-h-[30vh] resize-y text-base leading-relaxed" lang="fr" />
            </div>
          </div>
        </section>

        {/* CV */}
        <section className="space-y-4 lg:col-span-12">
          <div className="flex items-baseline justify-between border-t border-border pt-8">
            <div>
              <p className="text-xs uppercase tracking-[0.2em]">CV</p>
              <p className="text-[10px] text-muted-foreground tracking-mono">Grouped by category on the page, newest year first. Leave empty to hide the section.</p>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={() => set('cv', [...draft.cv, { group: draft.cv[draft.cv.length - 1]?.group ?? 'Exhibitions', year: String(new Date().getFullYear()), text: '', url: '' }])}>
              <Plus className="mr-2 h-3.5 w-3.5" /> Add entry
            </Button>
          </div>
          {draft.cv.length === 0 ? (
            <p className="rounded-md border border-dashed border-border p-6 text-center text-xs text-muted-foreground">No entries yet — exhibitions, awards, talks, teaching, press, education…</p>
          ) : (
            <div className="space-y-2">
              <div className="hidden grid-cols-[11rem_5rem_1fr_16rem_5.5rem] gap-2 px-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground tracking-mono md:grid">
                <span>Category</span>
                <span>Year</span>
                <span>Entry</span>
                <span>Link (optional)</span>
                <span />
              </div>
              {draft.cv.map((e, i) => (
                <div key={i} className="grid grid-cols-2 gap-2 rounded-md border border-border p-2 md:grid-cols-[11rem_5rem_1fr_16rem_5.5rem] md:border-0 md:p-0">
                  <Input list="cv-groups" value={e.group} onChange={(ev) => setEntry(i, { group: ev.target.value })} placeholder="Exhibitions" className="h-8 text-xs" />
                  <Input value={e.year} inputMode="numeric" onChange={(ev) => setEntry(i, { year: ev.target.value.replace(/[^0-9–-]/g, '') })} placeholder="2024" className="h-8 tracking-mono text-xs" />
                  <Input value={e.text} onChange={(ev) => setEntry(i, { text: ev.target.value })} placeholder="Solo show, Gallery name, City" className="col-span-2 h-8 text-xs md:col-span-1" />
                  <Input value={e.url} onChange={(ev) => setEntry(i, { url: ev.target.value })} placeholder="https://…" className="h-8 tracking-mono text-xs" />
                  <div className="flex items-center justify-end gap-0.5">
                    <Button type="button" size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button type="button" size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => move(i, 1)} disabled={i === draft.cv.length - 1} aria-label="Move down">
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button type="button" size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive" onClick={() => set('cv', draft.cv.filter((_, j) => j !== i))} aria-label="Remove entry">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
              <datalist id="cv-groups">
                {groups.map((g) => (
                  <option key={g} value={g} />
                ))}
              </datalist>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
