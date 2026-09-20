'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ImageManager, type ManagedImage } from './ImageManager';
import { useCreateProject, useUpdateProject } from '@/lib/queries';
import type { Project } from '@/lib/types';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

type FormState = {
  title: string;
  year: string;
  category: string;
  description: string;
  credits: string;
  published: boolean;
};

function initialForm(project?: Project | null): FormState {
  return project
    ? {
        title: project.title,
        year: String(project.year),
        category: project.category,
        description: project.description,
        credits: project.credits,
        published: project.published,
      }
    : {
        title: '',
        year: String(new Date().getFullYear()),
        category: '',
        description: '',
        credits: '',
        published: true,
      };
}

function initialImages(project?: Project | null): ManagedImage[] {
  return (project?.images ?? []).map((im) => ({
    id: im.id,
    url: im.url,
    width: im.width,
    height: im.height,
    alt: im.alt,
  }));
}

export function ProjectForm({
  open,
  onOpenChange,
  project,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project | null;
  onSaved?: (id: string) => void;
}) {
  const isEdit = !!project;
  const create = useCreateProject();
  const update = useUpdateProject();

  const [form, setForm] = useState<FormState>(() => initialForm(project));
  const [images, setImages] = useState<ManagedImage[]>(() => initialImages(project));
  const [coverId, setCoverId] = useState<string | null>(project?.coverId ?? null);

  // Reset the draft whenever the dialog opens (or opens on a different project).
  // Done during render rather than in an effect so the first paint is already correct.
  const [prevOpen, setPrevOpen] = useState(open);
  const [prevProjectId, setPrevProjectId] = useState(project?.id ?? null);
  const projectId = project?.id ?? null;
  if (open && (!prevOpen || projectId !== prevProjectId)) {
    setPrevOpen(open);
    setPrevProjectId(projectId);
    setForm(initialForm(project));
    setImages(initialImages(project));
    setCoverId(project?.coverId ?? null);
  } else if (open !== prevOpen) {
    setPrevOpen(open);
  }

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const onSave = async () => {
    if (!form.title.trim()) {
      toast.error('Title is required');
      return;
    }
    const year = parseInt(form.year, 10);
    if (isNaN(year) || year < 1900 || year > 2100) {
      toast.error('Enter a valid year');
      return;
    }
    if (!form.category.trim()) {
      toast.error('Category is required');
      return;
    }
    if (images.length === 0) {
      toast.error('Add at least one image');
      return;
    }

    const payload = {
      title: form.title.trim(),
      year,
      category: form.category.trim(),
      description: form.description,
      credits: form.credits,
      published: form.published,
      coverId: coverId ?? images[0]?.id ?? null,
      imageIds: images.map((i) => i.id),
    };

    try {
      if (isEdit && project) {
        const r = await update.mutateAsync({ id: project.id, ...payload });
        toast.success('Project updated');
        onSaved?.(r.project.id);
      } else {
        const r = await create.mutateAsync(payload);
        toast.success('Project created');
        onSaved?.(r.project.id);
      }
      onOpenChange(false);
    } catch (e: any) {
      toast.error('Save failed', { description: e?.message });
    }
  };

  const busy = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[95vw] max-w-5xl overflow-y-auto gap-0 p-0 thin-scrollbar">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle className="font-display text-2xl italic">
            {isEdit ? 'Edit Project' : 'New Project'}
          </DialogTitle>
          <DialogDescription className="text-xs tracking-mono uppercase tracking-[0.2em]">
            {isEdit ? `Editing · ${project?.title}` : 'Create a new graphical project'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-8 px-6 py-6 md:grid-cols-5">
          {/* Left column: form fields */}
          <div className="space-y-5 md:col-span-2">
            <div className="space-y-2">
              <Label htmlFor="pf-title" className="text-xs uppercase tracking-[0.2em]">
                Title
              </Label>
              <Input
                id="pf-title"
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                placeholder="e.g. Concrete & Light"
                className="font-display text-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="pf-year" className="text-xs uppercase tracking-[0.2em]">
                  Year
                </Label>
                <Input
                  id="pf-year"
                  inputMode="numeric"
                  value={form.year}
                  onChange={(e) => set('year', e.target.value.replace(/[^0-9]/g, ''))}
                  className="tracking-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pf-cat" className="text-xs uppercase tracking-[0.2em]">
                  Category
                </Label>
                <Input
                  id="pf-cat"
                  value={form.category}
                  onChange={(e) => set('category', e.target.value)}
                  placeholder="Architecture"
                  className="tracking-mono"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pf-desc" className="text-xs uppercase tracking-[0.2em]">
                Description
              </Label>
              <Textarea
                id="pf-desc"
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="Two paragraphs, separated by a blank line."
                rows={6}
                className="resize-none"
              />
              <p className="text-[10px] text-muted-foreground tracking-mono">
                Markdown supported. Use blank lines between paragraphs.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pf-credits" className="text-xs uppercase tracking-[0.2em]">
                Credits
              </Label>
              <Textarea
                id="pf-credits"
                value={form.credits}
                onChange={(e) => set('credits', e.target.value)}
                placeholder="Photography · Atelier Studio. 2024."
                rows={2}
                className="resize-none tracking-mono text-xs"
              />
            </div>

            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <div>
                <p className="text-sm">Published</p>
                <p className="text-[10px] text-muted-foreground tracking-mono">
                  Visible on the gallery index
                </p>
              </div>
              <Switch
                checked={form.published}
                onCheckedChange={(v) => set('published', v)}
              />
            </div>
          </div>

          {/* Right column: image manager */}
          <div className="md:col-span-3">
            <ImageManager
              images={images}
              onChange={setImages}
              coverId={coverId}
              onCoverChange={setCoverId}
            />
          </div>
        </div>

        <DialogFooter className="flex !flex-row items-center justify-between gap-3 border-t border-border bg-muted/30 px-6 py-4">
          <p className="text-xs text-muted-foreground tracking-mono">
            {images.length} image{images.length === 1 ? '' : 's'} ·{' '}
            {coverId ? 'cover set' : 'first image becomes cover'}
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={onSave} disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? 'Save changes' : 'Create project'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
