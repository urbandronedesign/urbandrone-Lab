'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, ExternalLink, Hexagon, Loader2, Plus, Star, Trash2 } from 'lucide-react';
import { useCreateProject, useProject, useUpdateProject } from '@/lib/queries';
import type { Media, Project, ProjectLink, ProjectSection, Token } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { MediaPlayer, MediaLinks } from '@/components/media/MediaPlayer';
import { ImageManager, type ManagedImage } from './ImageManager';
import { TokenManager } from './TokenManager';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/Logo';

type FormState = {
  title: string;
  year: string;
  category: string;
  description: string;
  credits: string;
  published: boolean;
  section: ProjectSection;
  slug: string;
  featured: boolean;
  tags: string;
  links: ProjectLink[];
};

function slugify(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}

function initialForm(project?: Project | null): FormState {
  return project
    ? {
        title: project.title,
        year: String(project.year),
        category: project.category,
        description: project.description,
        credits: project.credits,
        published: project.published,
        section: project.section,
        slug: project.slug,
        featured: project.featured,
        tags: project.tags.join(', '),
        links: project.links,
      }
    : {
        title: '',
        year: String(new Date().getFullYear()),
        category: '',
        description: '',
        credits: '',
        published: true,
        section: 'artworks',
        slug: '',
        featured: false,
        tags: '',
        links: [],
      };
}

function initialImages(project?: Project | null): ManagedImage[] {
  return (project?.images ?? []).map((im) => ({ id: im.id, url: im.url, width: im.width, height: im.height, alt: im.alt }));
}

function imageToMedia(im: ManagedImage): Media {
  return {
    id: `img:${im.id}`,
    kind: 'image',
    mime: '',
    title: im.alt ?? '',
    alt: im.alt ?? '',
    width: im.width ?? null,
    height: im.height ?? null,
    url: im.url,
    srcSet: null,
    placeholder: null,
    original: [],
    objktUrl: null,
    tokenId: null,
  };
}

/** Full-page project editor. `id === 'new'` creates a project on first save. */
export function ProjectEditor({ id }: { id: string }) {
  const isNew = id === 'new';
  const { data, isLoading, error } = useProject(isNew ? null : id);
  if (isNew) return <Editor key="new" project={null} />;
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (error || !data?.project) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3">
        <p className="font-display text-2xl italic">Project not found.</p>
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin">
            <ArrowLeft className="mr-2 h-3.5 w-3.5" /> Back to projects
          </Link>
        </Button>
      </div>
    );
  }
  return <Editor key={data.project.id} project={data.project} />;
}

function Editor({ project }: { project: Project | null }) {
  const router = useRouter();
  const create = useCreateProject();
  const update = useUpdateProject();
  const isEdit = !!project;
  const locked = project?.source === 'contract';

  const [form, setForm] = useState<FormState>(() => initialForm(project));
  const [images, setImages] = useState<ManagedImage[]>(() => initialImages(project));
  const [coverId, setCoverId] = useState<string | null>(project?.coverId ?? null);
  const [tokens, setTokens] = useState<Token[]>(project?.tokens ?? []);
  const [coverTokenId, setCoverTokenId] = useState<string | null>(project?.coverTokenId ?? null);
  const [preview, setPreview] = useState<Media | null>(project?.cover ?? project?.tokens[0]?.media ?? null);
  const [savedSnapshot, setSavedSnapshot] = useState(() => snapshot());

  function snapshot() {
    return JSON.stringify({ form, images: images.map((i) => i.id), coverId, tokens: tokens.map((t) => t.id), coverTokenId });
  }
  const dirty = snapshot() !== savedSnapshot;

  // Warn before leaving with unsaved changes
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  const previewIsCover =
    !!preview && ((preview.tokenId && preview.tokenId === coverTokenId) || (!preview.tokenId && `img:${coverId}` === preview.id));

  const setPreviewAsCover = () => {
    if (!preview) return;
    if (preview.tokenId) {
      setCoverTokenId(preview.tokenId);
      setCoverId(null);
    } else {
      setCoverId(preview.id.replace(/^img:/, ''));
      setCoverTokenId(null);
    }
  };

  const onSave = async () => {
    if (!form.title.trim()) return toast.error('Title is required');
    const year = parseInt(form.year, 10);
    if (isNaN(year) || year < 1900 || year > 2100) return toast.error('Enter a valid year');
    if (!form.category.trim()) return toast.error('Category is required');
    if (form.section === 'artworks' && images.length === 0 && tokens.length === 0) return toast.error('Add at least one image or token');

    const payload = {
      title: form.title.trim(),
      year,
      category: form.category.trim(),
      description: form.description,
      credits: form.credits,
      published: form.published,
      section: form.section,
      slug: form.slug.trim() || slugify(form.title),
      featured: form.featured,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      links: form.links.filter((l) => l.label.trim() && l.url.trim()),
      coverTokenId: coverTokenId ?? (coverId ? null : tokens[0]?.id ?? null),
      coverId: coverTokenId ? null : coverId ?? (tokens.length ? null : images[0]?.id ?? null),
      imageIds: images.map((i) => i.id),
      tokenIds: tokens.map((t) => t.id),
    };

    try {
      if (isEdit && project) {
        await update.mutateAsync({ id: project.id, ...payload });
        setSavedSnapshot(snapshot());
        toast.success('Saved');
      } else {
        const r = await create.mutateAsync(payload);
        setSavedSnapshot(snapshot());
        toast.success('Project created');
        router.replace(`/admin/projects/${r.project.id}`);
      }
    } catch (e: any) {
      toast.error('Save failed', { description: e?.message });
    }
  };

  const busy = create.isPending || update.isPending;
  const previewTitle = useMemo(() => preview?.title || form.title, [preview, form.title]);

  return (
    <div className="flex min-h-screen flex-col">
      {/* Sticky header */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-[1800px] items-center justify-between gap-4 px-6 md:px-10">
          <div className="flex min-w-0 items-center gap-4">
            <Link href="/admin" className="shrink-0" aria-label="Admin home">
              <Logo className="h-6 w-6" />
            </Link>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin">
                <ArrowLeft className="mr-2 h-3.5 w-3.5" /> Projects
              </Link>
            </Button>
            <div className="min-w-0">
              <p className="truncate font-display text-xl italic leading-tight">{form.title || (isEdit ? 'Untitled' : 'New project')}</p>
              <p className="tracking-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                {form.section === 'lab' ? 'lab' : 'artworks'} · {locked ? 'contract collection' : isEdit ? 'project' : 'draft'}
                {dirty && <span className="ml-2 text-foreground">· unsaved changes</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-xs">
              <Switch checked={form.published} onCheckedChange={(v) => set('published', v)} aria-label="Published" />
              <span className="hidden sm:inline">{form.published ? 'Published' : 'Draft'}</span>
            </label>
            <Button size="sm" onClick={onSave} disabled={busy || (!dirty && isEdit)}>
              {busy && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              {isEdit ? 'Save' : 'Create project'}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-[1800px] flex-1 grid-cols-1 gap-10 px-6 py-8 md:px-10 lg:grid-cols-12">
        {/* Left: text */}
        <section className="space-y-6 lg:col-span-5 xl:col-span-4">
          <div className="space-y-2">
            <Label htmlFor="pe-title" className="text-xs uppercase tracking-[0.2em]">
              Title
            </Label>
            <Input id="pe-title" value={form.title} onChange={(e) => set('title', e.target.value)} className="font-display text-2xl h-12" autoFocus={!isEdit} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="pe-section" className="text-xs uppercase tracking-[0.2em]">
                Section
              </Label>
              <select
                id="pe-section"
                value={form.section}
                onChange={(e) => set('section', e.target.value as ProjectSection)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="artworks">Artworks</option>
                <option value="lab">Lab</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex h-9 w-full items-center justify-between rounded-md border border-border px-3 text-sm">
                <span>Featured on home</span>
                <Switch checked={form.featured} onCheckedChange={(v) => set('featured', v)} aria-label="Featured" />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="pe-year" className="text-xs uppercase tracking-[0.2em]">
                Year
              </Label>
              <Input id="pe-year" inputMode="numeric" value={form.year} onChange={(e) => set('year', e.target.value.replace(/[^0-9]/g, ''))} className="tracking-mono" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pe-cat" className="text-xs uppercase tracking-[0.2em]">
                Category
              </Label>
              <Input id="pe-cat" value={form.category} onChange={(e) => set('category', e.target.value)} placeholder="Architecture" className="tracking-mono" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pe-slug" className="text-xs uppercase tracking-[0.2em]">
              URL
            </Label>
            <div className="flex items-center gap-1 text-xs text-muted-foreground tracking-mono">
              <span className="shrink-0">/{form.section}/</span>
              <Input id="pe-slug" value={form.slug} onChange={(e) => set('slug', slugify(e.target.value))} placeholder={slugify(form.title) || 'auto from title'} className="h-8 tracking-mono text-xs" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="pe-desc" className="text-xs uppercase tracking-[0.2em]">
                Description
              </Label>
              <span className="tracking-mono text-[10px] text-muted-foreground">{form.description.length} chars</span>
            </div>
            <Textarea
              id="pe-desc"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Paragraphs separated by a blank line."
              className="min-h-[45vh] resize-y text-base leading-relaxed"
            />
            <p className="text-[10px] text-muted-foreground tracking-mono">Blank lines start new paragraphs on the site.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pe-credits" className="text-xs uppercase tracking-[0.2em]">
              Credits
            </Label>
            <Textarea id="pe-credits" value={form.credits} onChange={(e) => set('credits', e.target.value)} rows={3} className="resize-y tracking-mono text-xs" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pe-tags" className="text-xs uppercase tracking-[0.2em]">
              Tags
            </Label>
            <Input id="pe-tags" value={form.tags} onChange={(e) => set('tags', e.target.value)} placeholder="generative, architecture, video" className="tracking-mono text-xs" />
            <p className="text-[10px] text-muted-foreground tracking-mono">Comma-separated · shown in the facts column and lab list.</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <Label className="text-xs uppercase tracking-[0.2em]">Links</Label>
              <Button type="button" size="sm" variant="ghost" className="h-7 px-2" onClick={() => set('links', [...form.links, { label: '', url: '' }])}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Add
              </Button>
            </div>
            {form.links.length === 0 ? (
              <p className="text-[10px] text-muted-foreground tracking-mono">GitHub, paper, demo, press… A link to a GitHub releases page becomes a Download block with the latest installers; add ?q=&lt;tag prefix&gt; (e.g. ?q=launcher-v) when a repo ships several products.</p>
            ) : (
              <div className="space-y-2">
                {form.links.map((l, i) => (
                  <div key={i} className="grid grid-cols-[1fr_2fr_auto] gap-2">
                    <Input value={l.label} onChange={(e) => set('links', form.links.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} placeholder="GitHub" className="h-8 text-xs" />
                    <Input value={l.url} onChange={(e) => set('links', form.links.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} placeholder="https://…" className="h-8 tracking-mono text-xs" />
                    <Button type="button" size="sm" variant="ghost" className="h-8 px-2 text-muted-foreground hover:text-destructive" onClick={() => set('links', form.links.filter((_, j) => j !== i))} aria-label="Remove link">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {locked && project?.contract && (
            <div className="flex items-start gap-3 rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
              <Hexagon className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="min-w-0">
                <p className="text-foreground">Contract collection</p>
                <p className="mt-1 break-all tracking-mono text-[10px]">{project.contract}</p>
                <p className="mt-1">Tokens follow the contract on every sync. Hide tokens in the Tezos tokens tab to exclude them; texts, order and cover are yours.</p>
                {project.tokens[0]?.collectionPath && (
                  <a href={`https://objkt.com/collections/${project.tokens[0].collectionPath}`} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-foreground underline underline-offset-4">
                    View on objkt <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Right: preview + media */}
        <section className="space-y-8 lg:col-span-7 xl:col-span-8">
          {/* Preview */}
          <div>
            <div className="relative aspect-[16/10] w-full overflow-hidden bg-black">
              {preview ? (
                <MediaPlayer key={preview.id} media={preview} />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center font-display text-xl italic text-white/50">Select an item below to preview it</div>
              )}
            </div>
            <div className="mt-2 flex items-center justify-between gap-4 text-xs text-muted-foreground">
              <div className="flex min-w-0 items-center gap-3">
                <span className="truncate font-display text-base italic text-foreground">{previewTitle}</span>
                {preview && preview.kind !== 'image' && <span className="tracking-mono text-[10px] uppercase tracking-[0.2em]">{preview.kind}</span>}
                {preview?.width && preview?.height && (
                  <span className="tracking-mono text-[10px]">
                    {preview.width}×{preview.height}
                  </span>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-4">
                {preview && <MediaLinks media={preview} className="flex gap-4 tracking-mono text-[10px] uppercase tracking-[0.25em]" />}
                {preview && (
                  <Button type="button" size="sm" variant={previewIsCover ? 'default' : 'outline'} onClick={setPreviewAsCover} disabled={previewIsCover} className="h-7">
                    <Star className={cn('mr-1.5 h-3 w-3', previewIsCover && 'fill-current')} />
                    {previewIsCover ? 'Cover' : 'Set as cover'}
                  </Button>
                )}
              </div>
            </div>
          </div>

          <TokenManager
            tokens={tokens}
            onChange={setTokens}
            coverTokenId={coverTokenId}
            onCoverChange={(tid) => {
              setCoverTokenId(tid);
              if (tid) setCoverId(null);
            }}
            locked={locked}
            selectedId={preview?.tokenId ?? null}
            onSelect={(t) => setPreview(t.media)}
          />

          <ImageManager
            images={images}
            onChange={setImages}
            coverId={coverId}
            onCoverChange={(iid) => {
              setCoverId(iid);
              if (iid) setCoverTokenId(null);
            }}
            selectedId={preview && !preview.tokenId ? preview.id.replace(/^img:/, '') : null}
            onSelect={(im) => setPreview(imageToMedia(im))}
          />

          <p className="tracking-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {tokens.length} token{tokens.length === 1 ? '' : 's'} · {images.length} image{images.length === 1 ? '' : 's'} · {coverId || coverTokenId ? 'cover set' : 'first item becomes cover'}
          </p>
        </section>
      </main>
    </div>
  );
}
